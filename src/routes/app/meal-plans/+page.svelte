<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import FlowSteps from '$lib/components/flow-steps.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowRight, ChevronDown, ClipboardCopy, ClipboardList, Plus, Search, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type MealPlanRow = PageData['mealPlans'][number];

	const activeMealPlans = $derived(data.mealPlans.filter((p) => p.flow.step !== 'archived' && p.flow.step !== 'done'));
	const historyMealPlans = $derived(data.mealPlans.filter((p) => p.flow.step === 'archived' || p.flow.step === 'done'));

	const mealPlanHref = (mealPlan: MealPlanRow) =>
		mealPlan.flow.step === 'confirm'
			? `/app/meal-plans/${mealPlan.id}?panel=confirm`
			: mealPlan.flow.step === 'shop'
				? `/app/meal-plans/${mealPlan.id}?panel=shopping`
				: `/app/meal-plans/${mealPlan.id}`;
	const flowStateClass = (tone: string) =>
		tone === 'attention'
			? 'fd-state-pill attention'
			: tone === 'success'
				? 'fd-state-pill green'
				: tone === 'muted'
					? 'fd-state-pill muted'
					: 'fd-state-pill';
	const actionText = (step: string) =>
		step === 'confirm' ? '发给家人确认' : step === 'shop' ? '去买菜' : step === 'done' ? '已完成' : '继续安排';
	const actionColor = (step: string) =>
		step === 'confirm' ? 'var(--fd-orange)' : step === 'shop' || step === 'done' ? 'var(--fd-green)' : '#38332e';
	const statusQuickLink = (value: string) => (value === 'all' ? '/app/meal-plans' : `/app/meal-plans?status=${value}`);
	const quickStatus = $derived([
		{ value: 'all', label: '进行中' },
		{ value: 'completed', label: '已完成' },
		{ value: 'archived', label: '已归档' }
	]);
	const quickStatusActive = $derived(
		data.filters.status === 'all' ? 'all' : data.filters.status === 'completed' ? 'completed' : data.filters.status === 'archived' ? 'archived' : 'all'
	);
</script>

<svelte:head>
	<title>吃饭安排 / 饭单</title>
</svelte:head>

<main class="fd-screen">
	<header class="fd-topbar">
		<a href="/app" class="fd-brand">
			<span class="fd-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<h1>饭单</h1>
				<p>每一顿，都在这里</p>
			</span>
		</a>
		<div class="fd-actions">
			<a href="/app/meal-plans?status=all" class="fd-icon-button" aria-label="筛选"><Search class="size-5" /></a>
			<a href="/app/settings" class="fd-avatar"><img src={avatarImage} alt="" /></a>
		</div>
	</header>

	<section class="fd-page-title">
		<span class="fd-eyebrow green">安排一顿饭</span>
		<h2>安排 → 确认 → 买菜</h2>
		<p>把每顿饭从头到尾串成一条线，不用东翻西找。</p>
	</section>

	<div class="fd-segmented cols-3" aria-label="饭单状态">
		{#each quickStatus as option}
			<a href={statusQuickLink(option.value)} class="fd-segment {quickStatusActive === option.value ? 'active' : ''}">
				{option.label}
			</a>
		{/each}
	</div>

	{#if data.total > 5}
		<details class="fd-soft-card" style="margin-top:12px;padding:0;" open={data.filters.status !== 'all' || data.filters.type !== 'all' || Boolean(data.filters.targetId)}>
			<summary style="display:flex;min-height:48px;cursor:pointer;list-style:none;align-items:center;gap:8px;padding:12px 16px;font-size:14px;font-weight:700;color:#4f4943;">
				<Search class="size-4" style="color:var(--fd-green);" />筛选饭单
				<span style="margin-left:auto;font-size:12px;color:var(--fd-muted);">按进展、类型或偏好</span>
			</summary>
			<form method="get" class="space-y-4" style="border-top:1px solid var(--fd-line-soft);padding:16px;">
				<div class="grid gap-3">
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="meal-plan-status">进展</Label>
							<select id="meal-plan-status" name="status" class="fd-select">
								{#each data.statusOptions as option}
									<option value={option.value} selected={data.filters.status === option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-2">
							<Label for="meal-plan-type">类型</Label>
							<select id="meal-plan-type" name="type" class="fd-select">
								{#each data.typeOptions as option}
									<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="meal-plan-target">用餐偏好</Label>
						<select id="meal-plan-target" name="targetId" class="fd-select">
							<option value="" selected={!data.filters.targetId}>全部偏好</option>
							{#each data.targets as target}
								<option value={target.id} selected={data.filters.targetId === target.id}>{target.name}</option>
							{/each}
						</select>
					</div>
					<Button type="submit" variant="outline" class="fd-ghost-btn block">看看这些</Button>
				</div>
			</form>
		</details>
	{/if}

	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	{#snippet mealPlanCard(mealPlan: MealPlanRow)}
		<a href={mealPlanHref(mealPlan)} class="fd-soft-card" style="display:grid;gap:9px;text-decoration:none;" data-testid={`meal-plan-card-${mealPlan.id}`}>
			<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
				<strong style="font-size:18px;font-weight:850;">{mealPlan.title}</strong>
				<span class={flowStateClass(mealPlan.flow.tone)}>{mealPlan.flow.label}</span>
			</div>
			<p style="margin:0;color:#595550;font-size:13px;line-height:1.35;">{mealPlan.flow.summary}</p>
			<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
				<span class="fd-pill">{mealPlan.items.length} 道菜</span>
				<span class="fd-pill green">{mealPlan.targetName}</span>
				{#if mealPlan.type !== 'single_meal'}<span class="fd-pill coral">{mealPlan.typeLabel}</span>{/if}
			</div>
			<FlowSteps step={mealPlan.flow.step} archived={mealPlan.flow.step === 'archived'} />
			<span style="display:inline-flex;align-items:center;gap:5px;color:{actionColor(mealPlan.flow.step)};font-size:13px;font-weight:800;">
				{actionText(mealPlan.flow.step)} <ArrowRight class="size-4" />
			</span>
			<details style="margin-top:4px;border-top:1px solid var(--fd-line-soft);padding-top:10px;">
				<summary style="display:flex;min-height:36px;cursor:pointer;list-style:none;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;color:var(--fd-muted);">
					更多动作 <ChevronDown class="size-4" />
				</summary>
				<div class="grid grid-cols-3 gap-2" style="margin-top:10px;">
					<form method="post" action="?/duplicate" use:enhanceWithFeedback={{ pendingLabel: '复制中...' }}>
						<input type="hidden" name="id" value={mealPlan.id} />
						<Button type="submit" variant="ghost" size="sm" class="fd-ghost-btn block" data-pending-label="复制中...">
							<ClipboardCopy class="size-4" /> 复制
						</Button>
					</form>
					{#if mealPlan.status !== 'archived'}
						<form method="post" action="?/archive" use:enhanceWithFeedback>
							<input type="hidden" name="id" value={mealPlan.id} />
							<Button type="submit" variant="ghost" size="sm" class="fd-ghost-btn block" data-confirm={`收起「${mealPlan.title}」？收起后会保留记录但不再作为当前安排。`} data-pending-label="收起中...">
								收起
							</Button>
						</form>
					{/if}
					<form method="post" action="?/delete" use:enhanceWithFeedback>
						<input type="hidden" name="id" value={mealPlan.id} />
						<Button type="submit" variant="destructive" size="sm" class="fd-danger-btn block" data-confirm={`删除「${mealPlan.title}」？相关菜单、买菜清单和反馈会一并移除。`} data-pending-label="删除中...">
							<Trash2 class="size-4" /> 删除
						</Button>
					</form>
				</div>
			</details>
		</a>
	{/snippet}

	{#if data.mealPlans.length === 0}
		<div class="fd-empty">
			<span class="emoji"><ClipboardList class="size-8" /></span>
			<h3>{data.total === 0 ? '还没有饭单' : '没有匹配的饭单'}</h3>
			<p>{data.total === 0 ? '写下想吃的菜，就能开始安排并生成购物清单。' : '换个筛选，或者回到全部饭单看看。'}</p>
			<a href="/app/meal-plans/new" class="fd-primary-btn lg block" style="margin-top:6px;">
				<Plus class="size-4" /> 安排一顿饭
			</a>
		</div>
	{:else}
		{#if activeMealPlans.length > 0}
			<section class="fd-section-head">
				<div>
					<h3>还差一步</h3>
					<p>需要你接着往下走</p>
				</div>
				<a href="/app/meal-plans/new" class="fd-ghost-btn"><Plus class="size-4" /> 安排</a>
			</section>
			<section class="fd-card-list">
				{#each activeMealPlans as mealPlan (mealPlan.id)}
					{@render mealPlanCard(mealPlan)}
				{/each}
			</section>
		{/if}

		{#if historyMealPlans.length > 0}
			<section class="fd-section-head">
				<div>
					<h3>历史饭单</h3>
					<p>已完成或已收起</p>
				</div>
			</section>
			<section class="fd-card-list">
				{#each historyMealPlans as mealPlan (mealPlan.id)}
					{@render mealPlanCard(mealPlan)}
				{/each}
			</section>
		{/if}
	{/if}
</main>

<a href="/app/meal-plans/new" class="fd-fab" aria-label="安排一顿饭"><Plus class="size-6" /></a>

<MobileBottomNav />
