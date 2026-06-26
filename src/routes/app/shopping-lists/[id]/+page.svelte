<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { INGREDIENT_CATEGORY_OPTIONS, INGREDIENT_UNIT_OPTIONS } from '$lib/domain/food-options';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, CheckCircle2, Circle, ClipboardList, Plus, RefreshCw, Save, ShoppingBag, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const addValues = $derived((form?.action === 'addItem' ? (form.values ?? {}) : {}) as Record<string, unknown>);
	const completionLabel = $derived(`${data.summary.checked}/${data.summary.total}`);
	const completionPercent = $derived(data.summary.total === 0 ? 0 : Math.round((data.summary.checked / data.summary.total) * 100));
	const textAreaClass =
		'app-input min-h-20 py-3';
	const selectClass = 'app-input h-11 text-sm';
	const shoppingActorLabel = (item: PageData['shoppingList']['items'][number]) => {
		if (item.checked && item.checkedBy) {
			return `由 ${item.checkedBy.name} 标记已买`;
		}

		if (item.updatedBy) {
			return `由 ${item.updatedBy.name} 更新`;
		}

		if (item.createdBy) {
			return `由 ${item.createdBy.name} 添加`;
		}

		return '历史购物项，暂无操作归属';
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

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="ghost" size="sm" class="h-11 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回饭单
		</Button>
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0 space-y-2">
				<p class="app-chip bg-secondary text-primary">购物清单</p>
				<h1 class="break-words text-3xl font-semibold leading-tight">{data.shoppingList.title}</h1>
				<p class="text-sm leading-6 text-muted-foreground">来自 {data.mealPlan.title} · 待买 {data.summary.pending} 项</p>
			</div>
			<form method="post" action="?/regenerate" use:enhanceWithFeedback>
				<Button
					type="submit"
					variant="outline"
					class="size-12 shrink-0 rounded-2xl bg-white"
					aria-label="重新生成"
					data-confirm="重新生成会替换当前购物项，确认继续？"
					data-pending-label="重新生成中..."
				>
					<RefreshCw class="size-5" />
				</Button>
			</form>
		</div>
	</section>

	{#if form?.message}
		<p
			class:!bg-secondary={form?.success}
			class:!text-secondary-foreground={form?.success}
			class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
		>{form.message}</p>
	{/if}

	{#if data.firstUse}
		<section class="app-panel space-y-4 border-primary/20 bg-secondary/50 p-5">
			<div class="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><CheckCircle2 class="size-6" /></div>
			<div class="space-y-1"><h2 class="text-xl font-semibold">这一顿安排好了</h2><p class="text-sm leading-6 text-muted-foreground">菜品和饭单已经保存。下面是按基准份数生成的购物清单；没有食材的菜可以先手动补购物项。</p></div>
			<div class="grid gap-3 sm:grid-cols-2">
				<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="outline" class="h-11 rounded-2xl bg-white">查看这顿饭</Button>
				{#if data.canInvite}<Button href="/app/invitations" variant="ghost" class="h-11 rounded-2xl">邀请家人一起看</Button>{/if}
			</div>
		</section>
	{/if}

	<section class="app-soft-panel space-y-4 p-5">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-muted-foreground">完成度</p>
				<p class="text-3xl font-semibold">{completionLabel}</p>
			</div>
			<div class="flex size-16 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-primary">
				{completionPercent}%
			</div>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-white">
			<div class="h-full rounded-full bg-primary" style={`width: ${completionPercent}%`}></div>
		</div>
		<div class="grid grid-cols-2 divide-x divide-border/70 rounded-2xl bg-white p-3 text-center">
			<p><span class="block text-2xl font-semibold">{data.summary.pending}</span><span class="text-xs text-muted-foreground">待购买</span></p>
			<p><span class="block text-2xl font-semibold">{data.summary.checked}</span><span class="text-xs text-muted-foreground">已购买</span></p>
		</div>
	</section>

	<section class="space-y-4" data-testid="shopping-list-items">
		<p class="rounded-2xl border border-border/80 bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
			数量按每道菜的“饭单份数 ÷ 食材基准份数”计算；文本数量、缺失数量和单位冲突不会猜测。每项下方会显示计算依据，可展开编辑确认。
		</p>
		{#if data.groups.length === 0}
			<div class="app-panel space-y-4 p-5">
				<div class="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
					<ShoppingBag class="size-6" />
				</div>
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">清单还是空的</h2>
					<p class="text-sm leading-6 text-muted-foreground">回到饭单添加带食材的菜品，或先手动补充购物项。</p>
				</div>
				<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="outline" class="h-11 rounded-2xl bg-white">
					<ClipboardList class="size-4" />
					打开饭单
				</Button>
			</div>
		{:else}
			{#each data.groups as group}
				<section class="app-panel overflow-hidden">
					<div class="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-3">
						<h2 class="font-semibold">{group.category}</h2>
						<p class="text-sm text-muted-foreground">{group.checkedCount}/{group.items.length} 已买</p>
					</div>
					<div class="divide-y divide-border/70">
						{#each group.items as item}
							<article class="space-y-3 p-4" data-testid={`shopping-list-item-${item.id}`}>
								<div class="flex items-start gap-3">
									<form method="post" action="?/toggleItem" use:enhanceWithFeedback class="pt-0.5">
										<input type="hidden" name="itemId" value={item.id} />
										<input type="hidden" name="checked" value={item.checked ? 'false' : 'true'} />
										<Button
											type="submit"
											variant={item.checked ? 'secondary' : 'outline'}
											size="icon-lg"
											class="size-12 rounded-2xl bg-white"
											aria-label={item.checked ? '标记未购买' : '标记已购买'}
										>
											{#if item.checked}
												<CheckCircle2 class="size-6 text-primary" />
											{:else}
												<Circle class="size-6" />
											{/if}
										</Button>
									</form>

									<div class="min-w-0 flex-1">
										<h3 class:line-through={item.checked} class:text-muted-foreground={item.checked} class="break-words text-lg font-semibold">
											{item.name}
										</h3>
										<p class="text-sm text-muted-foreground">
											{item.quantity || '未填数量'}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}
										</p>
										<p class="mt-1 text-xs text-muted-foreground">{shoppingActorLabel(item)}</p>
									</div>

									<form method="post" action="?/deleteItem" use:enhanceWithFeedback>
										<input type="hidden" name="itemId" value={item.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon-sm"
											class="size-11 rounded-xl text-muted-foreground"
											aria-label="删除购物项"
											data-confirm={`删除购物项「${item.name}」？`}
											data-pending-label="删除中..."
										>
											<Trash2 class="size-4" />
										</Button>
									</form>
								</div>

								<details class="rounded-2xl bg-muted/45">
									<summary class="flex min-h-11 cursor-pointer items-center px-3 py-2 text-sm font-medium text-muted-foreground">编辑数量和分类</summary>
									<form method="post" action="?/updateItem" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-3 p-3 pt-1">
										<input type="hidden" name="itemId" value={item.id} />
										<div class="space-y-2">
											<Label for={`name-${item.id}`}>名称</Label>
											<Input id={`name-${item.id}`} name="name" value={item.name} required class="app-input h-11" />
										</div>
										<div class="grid grid-cols-2 gap-3">
											<div class="space-y-2">
												<Label for={`quantity-${item.id}`}>数量</Label>
												<Input id={`quantity-${item.id}`} name="quantity" value={item.quantity ?? ''} class="app-input h-11" />
											</div>
											<div class="space-y-2">
												<Label for={`unit-${item.id}`}>单位</Label>
												<select id={`unit-${item.id}`} name="unit" class={selectClass}>
													<option value="" selected={!item.unit}>选择单位</option>
													{#each INGREDIENT_UNIT_OPTIONS as unit}
														<option value={unit} selected={selectedOption(item.unit, INGREDIENT_UNIT_OPTIONS, '适量') === unit}>{unit}</option>
													{/each}
												</select>
											</div>
										</div>
										<div class="space-y-2">
											<Label for={`category-${item.id}`}>分类</Label>
											<select id={`category-${item.id}`} name="category" class={selectClass}>
												{#each INGREDIENT_CATEGORY_OPTIONS as category}
													<option value={category} selected={selectedOption(item.category, INGREDIENT_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
												{/each}
											</select>
										</div>
										<div class="space-y-2">
											<Label for={`notes-${item.id}`}>备注</Label>
											<textarea id={`notes-${item.id}`} name="notes" class={textAreaClass}>{item.notes ?? ''}</textarea>
										</div>
										<Button type="submit" variant="outline" class="h-11 w-full rounded-2xl bg-white" data-pending-label="保存中...">
											<Save class="size-4" />
											保存
										</Button>
									</form>
								</details>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		{/if}
	</section>

	<section class="app-panel p-5">
		<div class="mb-4 flex items-center gap-2">
			<Plus class="size-5 text-primary" />
			<h2 class="text-xl font-semibold">添加购物项</h2>
		</div>
		<form method="post" action="?/addItem" use:enhanceWithFeedback={{ pendingLabel: '添加中...', resetOnSuccess: true }} class="space-y-4">
			<div class="space-y-2">
				<Label for="new-item-name">名称</Label>
				<Input id="new-item-name" name="name" value={String(addValues.name ?? '')} placeholder="例如：葱" required class="app-input h-11" />
				{#if form?.action === 'addItem' && errors.name?.[0]}
					<p class="text-sm text-destructive">{errors.name[0]}</p>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<Label for="new-item-quantity">数量</Label>
					<Input id="new-item-quantity" name="quantity" value={String(addValues.quantity ?? '')} placeholder="1" class="app-input h-11" />
				</div>
				<div class="space-y-2">
					<Label for="new-item-unit">单位</Label>
					<select id="new-item-unit" name="unit" class={selectClass}>
						<option value="" selected={!addValues.unit}>选择单位</option>
						{#each INGREDIENT_UNIT_OPTIONS as unit}
							<option value={unit} selected={selectedOption(String(addValues.unit ?? ''), INGREDIENT_UNIT_OPTIONS, '适量') === unit}>{unit}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="space-y-2">
				<Label for="new-item-category">分类</Label>
				<select id="new-item-category" name="category" class={selectClass}>
					<option value="" selected={!addValues.category}>选择分类</option>
					{#each INGREDIENT_CATEGORY_OPTIONS as category}
						<option value={category} selected={selectedOption(String(addValues.category ?? ''), INGREDIENT_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label for="new-item-notes">备注</Label>
				<textarea id="new-item-notes" name="notes" class={textAreaClass}>{String(addValues.notes ?? '')}</textarea>
			</div>
			<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="添加中...">
				<Plus class="size-4" />
				添加
			</Button>
		</form>
	</section>
</main>

<MobileBottomNav />
