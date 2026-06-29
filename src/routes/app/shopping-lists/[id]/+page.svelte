<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import basketImage from '$lib/assets/meal-ui/basket.jpg';
	import { INGREDIENT_CATEGORY_OPTIONS, INGREDIENT_UNIT_OPTIONS } from '$lib/domain/food-options';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ArrowRight, Check, CheckCircle2, MoreHorizontal, Plus, RefreshCw, Save, ShoppingBag, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const addValues = $derived((form?.action === 'addItem' ? (form.values ?? {}) : {}) as Record<string, unknown>);
	const completionLabel = $derived(`${data.summary.checked}/${data.summary.total}`);
	const completionPercent = $derived(data.summary.total === 0 ? 0 : Math.round((data.summary.checked / data.summary.total) * 100));
	const filterOptions = $derived([
		{ id: 'pending' as const, label: '待买', count: data.summary.pending },
		{ id: 'checked' as const, label: '已买', count: data.summary.checked },
		{ id: 'all' as const, label: '全部', count: data.summary.total }
	]);
	const textAreaClass = 'fd-textarea';
	const selectClass = 'fd-select';
	const filterHref = (filter: PageData['filter']) => {
		const params = new URLSearchParams({ filter });
		if (data.firstUse) params.set('first', '1');
		return `?${params.toString()}`;
	};
	const formatShoppingTime = (value: string | null) => {
		if (!value) return '';
		const normalized = value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
		return normalized.length >= 16 ? normalized.slice(5, 16) : normalized;
	};
	const shoppingActorLabel = (item: PageData['shoppingList']['items'][number]) => {
		if (item.checked && item.checkedBy) {
			const timeLabel = formatShoppingTime(item.checkedAt);
			return timeLabel ? `${item.checkedBy.name} 标记已买 · ${timeLabel}` : `${item.checkedBy.name} 标记已买`;
		}
		if (item.updatedBy) return `${item.updatedBy.name} 更新`;
		if (item.createdBy) return `${item.createdBy.name} 添加`;
		return '历史购物项';
	};
	const selectedOption = (value: string | null | undefined, options: readonly string[], fallback = '') => {
		const normalized = String(value ?? '').trim();
		if (!normalized) return '';
		return options.includes(normalized) ? normalized : fallback;
	};
</script>

<svelte:head>
	<title>{data.shoppingList.title} / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="shopping-list-detail">
	<header class="fd-topbar with-back">
		<a href="/app/shopping-lists" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>{data.shoppingList.title}</h1>
				<p>来自 {data.mealPlan.title} · {data.summary.total} 项</p>
			</span>
		</a>
		<div class="fd-actions">
			<form method="post" action="?/regenerate" use:enhanceWithFeedback style="display:contents;">
				<input type="hidden" name="expectedMealPlanUpdatedAt" value={data.mealPlan.updatedAt} />
				<input type="hidden" name="expectedShoppingListUpdatedAt" value={data.shoppingList.updatedAt} />
				<button type="submit" class="fd-icon-button" aria-label="重新整理" data-confirm="重新整理会替换当前购物项，确认继续？" data-pending-label="整理中...">
					<RefreshCw class="size-5" />
				</button>
			</form>
			<button class="fd-icon-button" type="button" aria-label="更多"><MoreHorizontal class="size-5" /></button>
		</div>
	</header>

	<!-- 封面 + 进度 -->
	<section class="fd-detail-card" style="margin-top:14px;display:grid;gap:12px;">
		<div style="position:relative;border-radius:20px;overflow:hidden;">
			<img src={basketImage} alt="购物篮" style="display:block;width:100%;height:120px;object-fit:cover;" />
		</div>
		<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
			<strong style="font-size:16px;font-weight:850;">买菜进度</strong>
			<span style="color:var(--fd-muted);font-size:13px;font-weight:700;">{completionLabel}</span>
		</div>
		<div style="height:10px;border-radius:999px;background:var(--fd-line);overflow:hidden;">
			<div style="width:{completionPercent}%;height:100%;background:var(--fd-green);"></div>
		</div>
		<div style="display:flex;flex-wrap:wrap;gap:6px;">
			<span class="fd-pill orange">待买 {data.summary.pending}</span>
			<span class="fd-pill green">已买 {data.summary.checked}</span>
			<span class="fd-pill">{data.mealPlan.title}</span>
		</div>
	</section>

	{#if form?.message}
		<p class="fd-state-pill {form?.success ? 'green' : 'coral'}" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	{#if data.firstUse}
		<section class="fd-soft-card" style="margin-top:12px;background:var(--fd-green-soft);border-color:transparent;display:grid;gap:12px;">
			<div style="display:flex;align-items:center;gap:10px;">
				<span class="fd-round-btn" style="width:40px;height:40px;font-size:18px;background:var(--fd-green);color:#fff;border-color:transparent;"><CheckCircle2 class="size-5" /></span>
				<div>
					<strong style="display:block;font-size:15px;font-weight:850;color:var(--fd-green-deep);">这一顿安排好了</strong>
					<span style="display:block;margin-top:2px;font-size:12px;color:#4f6a4f;line-height:1.4;">下面是按基准份数生成的购物清单；没有食材的菜可以先手动补购物项。</span>
				</div>
			</div>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
				<a href={`/app/meal-plans/${data.mealPlan.id}`} class="fd-ghost-btn block">查看这顿饭</a>
				{#if data.canInvite}<a href="/app/invitations" class="fd-ghost-btn block">邀请家人一起看</a>{/if}
			</div>
		</section>
	{/if}

	<!-- 筛选 -->
	<div class="fd-segmented cols-3" style="margin-top:14px;" aria-label="购物项筛选">
		{#each filterOptions as option}
			<a href={filterHref(option.id)} class="fd-segment {data.filter === option.id ? 'active' : ''}" aria-current={data.filter === option.id ? 'page' : undefined}>
				{option.label} <span style="font-size:11px;opacity:.7;">{option.count}</span>
			</a>
		{/each}
	</div>

	<section style="margin-top:4px;" data-testid="shopping-list-items">
		{#if data.shoppingList.items.length === 0}
			<div class="fd-empty" style="margin-top:14px;">
				<span class="emoji"><ShoppingBag class="size-8" /></span>
				<h3>清单还是空的</h3>
				<p>回到饭单添加带食材的菜品，或先手动补充购物项。</p>
				<a href={`/app/meal-plans/${data.mealPlan.id}`} class="fd-primary-btn lg block" style="margin-top:6px;">打开饭单 <ArrowRight class="size-4" /></a>
			</div>
		{:else if data.groups.length === 0}
			<div class="fd-empty" style="margin-top:14px;">
				<span class="emoji"><CheckCircle2 class="size-8" /></span>
				<h3>{data.filter === 'checked' ? '还没有已买项' : '没有待买项'}</h3>
				<p>{data.filter === 'checked' ? '家人勾选后会显示在这里。' : '当前清单已经都处理完了，可以切到已买或全部查看。'}</p>
			</div>
		{:else}
			{#each data.groups as group}
				<section class="fd-section-head">
					<div>
						<h3>{group.category}</h3>
						<p>{group.checkedCount}/{group.items.length} 已买</p>
					</div>
				</section>
				<section class="fd-card-list">
					{#each group.items as item}
						<article class="fd-check-card {item.checked ? 'is-done' : ''}" style="grid-template-columns:36px minmax(0,1fr) auto;" data-testid={`shopping-list-item-${item.id}`}>
							<form method="post" action="?/toggleItem" use:enhanceWithFeedback style="display:contents;">
								<input type="hidden" name="itemId" value={item.id} />
								<input type="hidden" name="checked" value={item.checked ? 'false' : 'true'} />
								<button type="submit" class="fd-check" aria-label={item.checked ? '标记未购买' : '标记已购买'}><Check class="size-4" strokeWidth={3} /></button>
							</form>
							<div class="fd-check-copy min-w-0">
								<strong style="{item.checked ? 'text-decoration:line-through;color:var(--fd-muted);' : ''}">{item.name}</strong>
								<span>{item.quantity || '未填数量'}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}</span>
								<span style="font-size:11px;color:var(--fd-muted);">{shoppingActorLabel(item)}</span>
							</div>
							<div style="display:grid;gap:6px;justify-items:end;">
								<details style="position:relative;">
									<summary class="fd-icon-del" style="width:34px;height:34px;font-size:16px;list-style:none;cursor:pointer;display:grid;place-items:center;" aria-label="编辑"><MoreHorizontal class="size-4" /></summary>
									<form method="post" action="?/updateItem" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} style="position:absolute;right:0;top:42px;z-index:5;width:240px;display:grid;gap:10px;padding:14px;background:#fff;border:1px solid var(--fd-line);border-radius:18px;box-shadow:var(--fd-shadow);">
										<input type="hidden" name="itemId" value={item.id} />
										<div class="fd-field" style="padding:0;border:0;">
											<div class="fd-field-label" style="font-size:11px;"><strong>名称</strong></div>
											<Input id={`name-${item.id}`} name="name" value={item.name} required class="fd-text-input" style="height:40px;" />
										</div>
										<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
											<div class="fd-field" style="padding:0;border:0;">
												<div class="fd-field-label" style="font-size:11px;"><strong>数量</strong></div>
												<Input id={`quantity-${item.id}`} name="quantity" value={item.quantity ?? ''} class="fd-text-input" style="height:40px;" />
											</div>
											<div class="fd-field" style="padding:0;border:0;">
												<div class="fd-field-label" style="font-size:11px;"><strong>单位</strong></div>
												<select id={`unit-${item.id}`} name="unit" class={selectClass} style="height:40px;">
													<option value="" selected={!item.unit}>选择单位</option>
													{#each INGREDIENT_UNIT_OPTIONS as unit}
														<option value={unit} selected={selectedOption(item.unit, INGREDIENT_UNIT_OPTIONS, '适量') === unit}>{unit}</option>
													{/each}
												</select>
											</div>
										</div>
										<div class="fd-field" style="padding:0;border:0;">
											<div class="fd-field-label" style="font-size:11px;"><strong>分类</strong></div>
											<select id={`category-${item.id}`} name="category" class={selectClass} style="height:40px;">
												{#each INGREDIENT_CATEGORY_OPTIONS as category}
													<option value={category} selected={selectedOption(item.category, INGREDIENT_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
												{/each}
											</select>
										</div>
										<div class="fd-field" style="padding:0;border:0;">
											<div class="fd-field-label" style="font-size:11px;"><strong>备注</strong></div>
											<textarea id={`notes-${item.id}`} name="notes" class={textAreaClass} style="min-height:60px;">{item.notes ?? ''}</textarea>
										</div>
										<button type="submit" class="fd-primary-btn" style="height:40px;" data-pending-label="保存中..."><Save class="size-4" /> 保存</button>
									</form>
								</details>
								<form method="post" action="?/deleteItem" use:enhanceWithFeedback style="display:contents;">
									<input type="hidden" name="itemId" value={item.id} />
									<button type="submit" class="fd-icon-del" style="width:34px;height:34px;font-size:16px;" aria-label="删除购物项" data-confirm={`删除购物项「${item.name}」？`} data-pending-label="删除中...">
										<Trash2 class="size-4" />
									</button>
								</form>
							</div>
						</article>
					{/each}
				</section>
			{/each}
		{/if}
	</section>

	<!-- 临时加一项 -->
	<section class="fd-section-head">
		<div>
			<h3>临时加一项</h3>
			<p>想到什么随手加</p>
		</div>
	</section>
	<form method="post" action="?/addItem" use:enhanceWithFeedback={{ pendingLabel: '添加中...', resetOnSuccess: true }} class="fd-form-card" style="margin-top:4px;">
		<div class="fd-field">
			<div class="fd-field-label"><strong>名称</strong></div>
			<Input id="new-item-name" name="name" value={String(addValues.name ?? '')} placeholder="例如：葱" required class="fd-text-input" />
			{#if form?.action === 'addItem' && errors.name?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.name[0]}</p>{/if}
		</div>
		<div class="fd-field" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid var(--fd-line-soft);">
			<div style="padding:13px 0;">
				<div class="fd-field-label"><strong>数量</strong></div>
				<Input id="new-item-quantity" name="quantity" value={String(addValues.quantity ?? '')} placeholder="1" class="fd-text-input" />
			</div>
			<div style="padding:13px 0;">
				<div class="fd-field-label"><strong>单位</strong></div>
				<select id="new-item-unit" name="unit" class={selectClass}>
					<option value="" selected={!addValues.unit}>选择单位</option>
					{#each INGREDIENT_UNIT_OPTIONS as unit}
						<option value={unit} selected={selectedOption(String(addValues.unit ?? ''), INGREDIENT_UNIT_OPTIONS, '适量') === unit}>{unit}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="fd-field">
			<div class="fd-field-label"><strong>分类</strong></div>
			<select id="new-item-category" name="category" class={selectClass}>
				<option value="" selected={!addValues.category}>选择分类</option>
				{#each INGREDIENT_CATEGORY_OPTIONS as category}
					<option value={category} selected={selectedOption(String(addValues.category ?? ''), INGREDIENT_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
				{/each}
			</select>
		</div>
		<div class="fd-field">
			<div class="fd-field-label"><strong>备注</strong></div>
			<textarea id="new-item-notes" name="notes" class={textAreaClass}>{String(addValues.notes ?? '')}</textarea>
		</div>
		<button type="submit" class="fd-primary-btn block" data-pending-label="添加中..."><Plus class="size-4" /> 添加</button>
	</form>
</main>

<div class="fd-sticky-action">
	<a href={`/app/meal-plans/${data.mealPlan.id}`} class="fd-primary-btn block lg">
		<CheckCircle2 class="size-4" /> 看这顿饭安排 <ArrowRight class="size-4" />
	</a>
</div>

<MobileBottomNav />
