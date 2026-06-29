<script lang="ts">
	import FlowSteps from '$lib/components/flow-steps.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ArrowRight, Check, Clock3, Moon, Plus, Sparkles, Sun, UsersRound, Utensils } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const dishes = $derived(form?.dishes ?? data.dishes);
	const targets = $derived(form?.targets ?? data.targets);
	const mealAi = $derived(form?.mealAi);
	const selectedIds = $derived(new Set(values.dishIds ?? []));
	const selectedDishes = $derived(dishes.filter((dish) => selectedIds.has(dish.id)));
	const suggestedNames = $derived(
		String(values.dishNamesText ?? '')
			.split(/[,，、\n]/)
			.map((name) => name.trim())
			.filter(Boolean)
	);
	const suggestedDrafts = $derived(mealAi?.status === 'draft' ? mealAi.suggestedDishes : []);

	const slotOptions = [
		{ value: '早餐', icon: Sun, hint: '07:00-09:00', variant: 'breakfast' },
		{ value: '午餐', icon: Sun, hint: '11:00-13:30', variant: 'lunch' },
		{ value: '晚餐', icon: Moon, hint: '17:00-19:30', variant: 'dinner' },
		{ value: '宵夜', icon: Clock3, hint: '20:30 以后', variant: 'snack' }
	] as const;

	const draftForName = (name: string) => suggestedDrafts.find((dish) => dish.name === name);
	const formatDateLabel = (value: string) => {
		if (!value) return '';
		const [, month, day] = value.split('-');
		return `${Number(month)}月${Number(day)}日`;
	};
</script>

<svelte:head><title>安排一顿饭 / 饭单</title></svelte:head>

<main class="fd-screen" data-testid="meal-plan-new">
	<header class="fd-topbar with-back">
		<a href="/app/meal-plans" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>安排一顿饭</h1>
				<p>定好饭点，下一步看吃什么</p>
			</span>
		</a>
		<a href="/app/meal-plans" class="fd-ghost-btn">取消</a>
	</header>

	<FlowSteps step="arrange" />

	<!-- AI 草稿：一句话生成 -->
	<section class="fd-soft-card" style="margin-top:12px;display:grid;gap:14px;">
		<div style="display:flex;align-items:flex-start;gap:10px;">
			<span class="fd-round-btn" style="width:40px;height:40px;font-size:18px;background:var(--fd-green-soft);color:var(--fd-green-deep);border-color:transparent;"><Sparkles class="size-5" /></span>
			<div>
				<strong style="display:block;font-size:15px;font-weight:850;">一句话生成饭单草稿</strong>
				<span style="display:block;margin-top:2px;color:var(--fd-muted);font-size:12px;line-height:1.4;">例如「今晚 3 人，清淡，半小时能做好」。AI 会先填入下面的表单。</span>
			</div>
		</div>
		<form id="meal-draft-form" method="post" action="?/draft" use:enhanceWithFeedback={{ pendingLabel: '正在生成草稿...' }} style="display:grid;gap:10px;">
			<label for="meal-draft-prompt" class="sr-only">饭单需求</label>
			<textarea id="meal-draft-prompt" name="prompt" maxlength="500" class="fd-textarea" style="min-height:84px;" placeholder="写下人数、时间、口味或限制">{mealAi?.prompt ?? ''}</textarea>
			<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
				<span style="font-size:11px;color:var(--fd-muted);line-height:1.3;max-width:60%;">优先复用已有菜品，新建议会标记；过敏忌口不被覆盖。</span>
				<button type="submit" class="fd-ghost-btn" data-pending-label="正在生成草稿..." disabled={!data.aiAvailable}>
					<Sparkles class="size-4" /> 生成草稿
				</button>
			</div>
		</form>
		{#if !data.aiAvailable}
			<p style="margin:0;font-size:12px;color:var(--fd-muted);">AI 草稿当前未配置；下面仍可直接手动安排。</p>
		{:else if mealAi?.status === 'error'}
			<p class="fd-state-pill coral" style="justify-content:flex-start;" role="alert">{mealAi.message}</p>
		{:else if mealAi?.status === 'draft'}
			<div class="fd-soft-card" style="background:var(--fd-green-soft);border-color:transparent;" aria-live="polite">
				<strong style="display:block;font-size:13px;font-weight:850;color:var(--fd-green-deep);">草稿已填入，尚未保存</strong>
				<span style="display:block;margin-top:3px;font-size:12px;color:#4f6a4f;line-height:1.4;">可以删除、替换或继续编辑。点底部主按钮后才会创建饭单并生成购物清单。</span>
				{#if mealAi.assumptions.length > 0 || mealAi.constraints.length > 0}
					<ul style="margin:8px 0 0;padding-left:18px;font-size:12px;color:#7a5b1e;line-height:1.5;">
						{#each [...mealAi.constraints, ...mealAi.assumptions] as item}<li>{item}</li>{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	<form id="meal-create-form" method="post" action="?/create" use:enhanceWithFeedback={{ pendingLabel: '正在安排...' }} style="display:grid;gap:14px;margin-top:14px;">
		<input type="hidden" name="draftPrompt" value={mealAi?.prompt ?? ''} />
		<input type="hidden" name="suggestedDishDraftsJson" value={values.suggestedDishDraftsJson ?? ''} />

		<!-- 第一步：这顿饭是什么 -->
		<section class="fd-form-card">
			<div class="fd-field">
				<div class="fd-field-label"><strong>饭名</strong></div>
				<Input id="title" name="title" value={values.title ?? ''} placeholder="比如：周六午餐" class="fd-text-input" />
			</div>
			<div class="fd-field">
				<div class="fd-field-label"><strong>这顿想吃什么？</strong><span class="hint">用逗号或换行分隔</span></div>
				<textarea id="dish-names" name="dishNamesText" class="fd-textarea" style="min-height:84px;" placeholder="例如：番茄炒蛋、清炒时蔬">{values.dishNamesText ?? ''}</textarea>
				{#if errors.dishNamesText?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.dishNamesText[0]}</p>{/if}
			</div>
			<div class="fd-field">
				<div class="fd-field-label"><strong>大约几个人吃？</strong></div>
				<Input id="servings" name="servings" type="number" min="1" max="999" value={values.servings ?? 2} class="fd-text-input" />
				{#if errors.servings?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.servings[0]}</p>{/if}
			</div>
			<div class="fd-field">
				<div class="fd-field-label"><strong>日期</strong><span class="hint">{formatDateLabel(values.plannedDate ?? '')}</span></div>
				<Input id="planned-date" name="plannedDate" type="date" value={values.plannedDate ?? ''} class="fd-text-input" />
			</div>
			<div class="fd-field">
				<div class="fd-field-label"><strong>给谁做</strong><span class="hint">偏好</span></div>
				<select id="target" name="targetId" class="fd-select">
					<option value="" selected={!values.targetId}>当前家庭</option>
					{#each targets as target}
						<option value={target.id} selected={values.targetId === target.id}>{target.name}{target.peopleCount ? ` · ${target.peopleCount} 人` : ''}</option>
					{/each}
				</select>
			</div>
			<div class="fd-field">
				<div class="fd-field-label"><strong>备注（可选）</strong></div>
				<textarea id="notes" name="notes" class="fd-textarea" style="min-height:72px;" placeholder="例如：少油、不吃辣">{values.notes ?? ''}</textarea>
			</div>
		</section>

		<!-- 第二步：选哪一顿 -->
		<section class="fd-section-head">
			<div>
				<h3>选哪一顿</h3>
				<p>选好就能加菜</p>
			</div>
		</section>
		<div class="fd-slot-grid">
			{#each slotOptions as slot}
				{@const Icon = slot.icon}
				<label class="fd-slot-card {slot.variant} {values.mealSlot === slot.value ? 'active' : ''}" style="cursor:pointer;">
					<input type="radio" name="mealSlot" value={slot.value} class="sr-only" checked={values.mealSlot === slot.value || (!values.mealSlot && slot.value === '晚餐')} />
					<Icon class="size-5" />
					<strong>{slot.value}</strong>
					<span>{slot.hint}</span>
				</label>
			{/each}
		</div>

		<!-- 第三步：吃什么 -->
		<section class="fd-section-head">
			<div>
				<h3>吃什么</h3>
				<p>{selectedDishes.length + suggestedNames.length > 0 ? `已选 ${selectedDishes.length + suggestedNames.length} 道菜` : '从常做菜里加，或临时写一个'}</p>
			</div>
			<a href="/app/dishes" class="fd-ghost-btn"><Utensils class="size-4" /> 挑常做菜</a>
		</section>

		<!-- AI 建议的新菜 -->
		{#if mealAi?.status === 'draft' && suggestedNames.length > 0}
			<section class="fd-card-list">
				{#each suggestedNames as name}
					{@const draft = draftForName(name)}
					<article class="fd-plan-item">
						<img src={lunchImage} alt="" />
						<div class="pi-copy min-w-0">
							<strong>{name}</strong>
							<span>{draft?.category ?? '新菜'} · 来自 AI 建议</span>
							{#if draft?.reason}<span class="fd-pill" style="margin-top:4px;">{draft.reason}</span>{/if}
							{#if draft}
								<span style="margin-top:4px;font-size:11px;color:var(--fd-muted);line-height:1.35;">
									基准 {draft.baseServings} 人份{draft.tags.length > 0 ? ` · ${draft.tags.join('、')}` : ''}
									{#if draft.ingredients.length > 0}<br />{draft.ingredients.map((i) => `${i.name} ${i.quantity} ${i.unit}`).join('、')}{/if}
								</span>
								{#if draft.uncertainFields.length > 0}<span class="fd-pill orange" style="margin-top:4px;">AI 估算，保存前核对</span>{/if}
							{:else}
								<span class="fd-pill coral" style="margin-top:4px;">尚无食材草稿</span>
							{/if}
						</div>
						<div style="display:grid;gap:6px;justify-items:end;">
							<button type="submit" class="fd-ghost-btn" style="height:34px;font-size:12px;padding:0 12px;" name="removeDishName" value={name} formaction="?/removeDish">删除</button>
							<button type="submit" class="fd-ghost-btn" style="height:34px;font-size:12px;padding:0 12px;" name="replaceDishName" value={name} formaction="?/replaceDish" data-pending-label="替换中...">换一道</button>
						</div>
					</article>
				{/each}
			</section>
		{/if}

		<!-- 已选的常做菜 -->
		{#if selectedDishes.length > 0}
			<section class="fd-card-list">
				{#each selectedDishes as dish}
					<label class="fd-plan-item" style="cursor:pointer;">
						<img src={dinnerImage} alt="" />
						<div class="pi-copy min-w-0">
							<strong>{dish.name}</strong>
							<span>{dish.category ?? '常做菜'} · {dish.ingredients.length} 种食材 · 基准 {dish.baseServings} 人份</span>
						</div>
						<span class="pi-servings" style="display:inline-flex;align-items:center;gap:4px;color:var(--fd-green-deep);font-weight:700;font-size:12px;">
							<UsersRound class="size-3.5" /> 已选
						</span>
						<input type="checkbox" name="dishIds" value={dish.id} checked class="sr-only" />
						<span class="fd-round-btn" style="width:30px;height:30px;font-size:14px;background:var(--fd-green-soft);color:var(--fd-green-deep);border-color:transparent;"><Check class="size-4" strokeWidth={3} /></span>
					</label>
				{/each}
			</section>
		{/if}

		<!-- 选已有菜 -->
		{#if dishes.length > 0}
			<details class="fd-form-card" style="padding:0 17px 14px;">
				<summary style="cursor:pointer;padding:14px 0;font-size:15px;font-weight:850;border-bottom:1px solid var(--fd-line-soft);list-style:none;">
					从常做菜里加（{dishes.length} 道可选）
				</summary>
				<div class="fd-card-list" style="margin-top:12px;">
					{#each dishes as dish}
						<label class="fd-check-card {selectedIds.has(dish.id) ? 'is-done' : ''}" style="cursor:pointer;">
							<input type="checkbox" name="dishIds" value={dish.id} checked={selectedIds.has(dish.id)} class="size-5" />
							<span class="fd-check" aria-hidden="true"><Check class="size-4" strokeWidth={3} /></span>
							<span class="min-w-0 flex-1">
								<span class="block truncate" style="font-weight:800;">{dish.name}</span>
								<span class="block" style="font-size:11px;color:var(--fd-muted);">{dish.category ?? '常做菜'} · {dish.ingredients.length} 种食材 · 基准 {dish.baseServings} 人份</span>
							</span>
						</label>
					{/each}
				</div>
			</details>
		{/if}
	</form>
</main>

<div class="fd-sticky-action two">
	<button type="submit" form="meal-draft-form" class="fd-ghost-btn" disabled={!data.aiAvailable} data-pending-label="正在生成草稿...">存草稿</button>
	<button type="submit" form="meal-create-form" class="fd-primary-btn" data-pending-label="正在安排...">
		列好菜单 <ArrowRight class="size-4" />
	</button>
</div>
