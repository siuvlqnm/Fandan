<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import FlowSteps from '$lib/components/flow-steps.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import breakfastImage from '$lib/assets/meal-ui/breakfast.jpg';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import heroImage from '$lib/assets/meal-ui/hero.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import snackImage from '$lib/assets/meal-ui/snack.jpg';
	import { ArrowRight, Clock3, Moon, Plus, Sun } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let dateMode = $state<'today' | 'tomorrow' | 'custom'>('today');
	let customDate = $state('');

	const priorityMealPlans = $derived(
		data.pendingMealPlans.length > 0
			? data.pendingMealPlans
			: data.todayMealPlans.length > 0
				? data.todayMealPlans
				: data.recentMealPlans
	);
	const heroMealPlan = $derived(priorityMealPlans[0] ?? null);
	const selectedQuickDate = $derived(
		dateMode === 'today' ? data.quickStart.today : dateMode === 'tomorrow' ? data.quickStart.tomorrow : customDate || data.quickStart.today
	);
	const existingMealForSlot = (slot: PageData['quickStart']['slots'][number]) =>
		data.quickStartMealPlans[selectedQuickDate]?.[slot.mealSlot] ?? null;
	const nextSlot = $derived(data.quickStart.slots.find((slot) => !slot.disabledToday) ?? data.quickStart.slots.at(-1));
	const currentMealText = $derived(nextSlot ? `适合安排${nextSlot.mealSlot}` : '适合先想明天');
	const visibleMealPlans = $derived(
		(data.todayMealPlans.length > 0 ? data.todayMealPlans : data.recentMealPlans).slice(0, 3)
	);

	const slotImage = {
		breakfast: breakfastImage,
		lunch: lunchImage,
		dinner: dinnerImage,
		late_night: snackImage
	} satisfies Record<PageData['quickStart']['slots'][number]['id'], string>;
	const slotIcon = (id: PageData['quickStart']['slots'][number]['id']) =>
		id === 'breakfast' || id === 'lunch' ? Sun : id === 'dinner' ? Moon : Clock3;
	const slotVariant = (id: PageData['quickStart']['slots'][number]['id']) =>
		id === 'dinner' ? 'green' : id === 'late_night' ? 'coral' : 'warm';
	const slotState = (slot: PageData['quickStart']['slots'][number]) => {
		if (existingMealForSlot(slot)) return { text: '已安排', cls: 'scheduled' };
		if (slot.disabledToday && dateMode === 'today') return { text: '过', cls: '' };
		if (slot.id === nextSlot?.id && dateMode === 'today') return { text: '推荐', cls: 'recommend' };
		if (slot.id === 'late_night') return { text: '轻', cls: 'light' };
		return { text: '备', cls: 'ready' };
	};
	const slotTimeHint = (slot: PageData['quickStart']['slots'][number]) => slot.helper;
	const shortDate = (value: string) => {
		const [, month, day] = value.split('-');
		return `${month}-${day}`;
	};
	const isSlotDisabled = (slot: PageData['quickStart']['slots'][number]) =>
		selectedQuickDate === data.quickStart.today && slot.disabledToday;
	const flowChipClass = (tone: string) =>
		tone === 'attention'
			? 'fd-state-pill attention'
			: tone === 'success'
				? 'fd-state-pill green'
				: tone === 'muted'
					? 'fd-state-pill muted'
					: 'fd-state-pill';
	const actionText = (mealPlan: { flow: { step: string } }) =>
		mealPlan.flow.step === 'confirm'
			? '发给家人确认'
			: mealPlan.flow.step === 'shop'
				? '去买菜'
				: mealPlan.flow.step === 'done'
					? '已就绪'
					: '继续安排';
	const actionColor = (step: string) =>
		step === 'confirm' ? 'var(--fd-orange)' : step === 'shop' || step === 'done' ? 'var(--fd-green)' : '#38332e';
</script>

<svelte:head>
	<title>今天吃什么 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="mobile-dashboard">
	<header class="fd-topbar">
		<a href="/app" class="fd-brand">
			<span class="fd-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<h1>饭单</h1>
				<p>让每一顿都更简单温暖</p>
			</span>
		</a>
		<div class="fd-actions">
			{#if data.space.role === 'owner'}
				<a href="/app/invitations" class="fd-icon-button" aria-label="邀请家人">
					<Plus class="size-5" />
				</a>
			{:else}
				<a href="/app/meal-plans" class="fd-icon-button" aria-label="打开饭单">
					<ArrowRight class="size-5" />
				</a>
			{/if}
			<a href="/app/settings" class="fd-avatar" aria-label="打开家页">
				<img src={avatarImage} alt="" />
			</a>
		</div>
	</header>

	<div class="fd-pill" style="margin-top:18px;gap:8px;">
		<span style="color:#28231f;font-weight:760;">今天 {shortDate(data.todayKey)}</span>
		<span style="width:1px;height:13px;background:#e2d5c4;"></span>
		<span>{currentMealText}</span>
	</div>

	<section class="fd-headline" style="margin-top:14px;">
		<h2 style="width:fit-content;">下一顿吃什么？</h2>
		<p>定好饭点，我帮你把菜单和买菜清单理顺。{data.stats.dishes} 道常做菜可选。</p>
	</section>

	<!-- 日期切换 -->
	<section aria-label="选择日期" class="fd-date-grid">
		<button
			type="button"
			class="fd-date-card {dateMode === 'today' ? 'active' : ''}"
			onclick={() => (dateMode = 'today')}
		>
			<strong>今天</strong>
			<span>{shortDate(data.quickStart.today)}</span>
		</button>
		<button
			type="button"
			class="fd-date-card {dateMode === 'tomorrow' ? 'active' : ''}"
			onclick={() => (dateMode = 'tomorrow')}
		>
			<strong>明天</strong>
			<span>{shortDate(data.quickStart.tomorrow)}</span>
		</button>
		<button
			type="button"
			class="fd-date-card {dateMode === 'custom' ? 'active' : ''}"
			onclick={() => (dateMode = 'custom')}
		>
			<strong>选日期</strong>
			<span>{dateMode === 'custom' ? shortDate(customDate || data.quickStart.today) : '自定义'}</span>
		</button>
	</section>

	{#if dateMode === 'custom'}
		<label class="fd-soft-card" style="margin-top:10px;display:grid;gap:8px;font-size:13px;font-weight:700;color:#38332e;">
			<span>选择日期</span>
			<input
				type="date"
				value={customDate || data.quickStart.today}
				min={data.quickStart.today}
				class="fd-text-input"
				oninput={(event) => (customDate = event.currentTarget.value)}
			/>
		</label>
	{/if}

	{#if form?.quickStartError}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;" role="alert">{form.quickStartError}</p>
	{/if}

	<!-- 餐别：直接选今天哪顿，点进去=安排 -->
	<section class="fd-section-head">
		<div>
			<h3>今天几顿</h3>
			<p>点哪顿就开始安排哪顿</p>
		</div>
		<a href="/app/meal-plans/new" class="fd-ghost-btn"><Plus class="size-4" /> 新饭单</a>
	</section>

	<section style="display:grid;gap:7px;margin-top:9px;">
		{#each data.quickStart.slots as slot}
			{@const Icon = slotIcon(slot.id)}
			{@const existingMeal = existingMealForSlot(slot)}
			{@const disabled = !existingMeal && isSlotDisabled(slot)}
			{@const state = slotState(slot)}
			{@const variant = slotVariant(slot.id)}
			<form method="post" action="?/quickStart" use:enhanceWithFeedback={{ pendingLabel: '正在安排...' }}>
				<input type="hidden" name="quickStartDate" value={selectedQuickDate} />
				<input type="hidden" name="quickStartSlot" value={slot.id} />
				<button
					type="submit"
					class="fd-meal-card {variant} {disabled ? 'is-past' : ''} {existingMeal ? 'is-scheduled' : ''} {slot.id === nextSlot?.id && dateMode === 'today' && !existingMeal ? 'is-focus' : ''} w-full text-left"
					disabled={disabled}
					data-pending-label={existingMeal ? '正在打开...' : '正在安排...'}
				>
					<span class="mc-icon"><Icon strokeWidth={2.4} /></span>
					<span class="mc-body min-w-0">
						<span class="mc-line">
							<strong>{slot.mealSlot}</strong>
							<span class="time" style="color:{variant === 'green' ? '#2e8a2d' : variant === 'coral' ? '#d16a5c' : '#e18400'};">{slotTimeHint(slot)}</span>
							<span class="state {state.cls}">{state.text}</span>
						</span>
						<p class="mc-desc">
							{#if existingMeal}
								{existingMeal.title} · {existingMeal.flowLabel}
							{:else}
								推荐：{slot.recommendedNames.length > 0 ? slot.recommendedNames.join('、') : '先想好主菜'}
							{/if}
						</p>
					</span>
					<span class="mc-img"><img src={slotImage[slot.id]} alt={slot.mealSlot} /></span>
				</button>
			</form>
		{/each}
	</section>

	<!-- 主线焦点卡 -->
	{#if heroMealPlan}
		<section class="fd-next-card" aria-label="今天建议">
			<div class="min-w-0">
				<span class="next-chip {flowChipClass(heroMealPlan.flow.tone)}">{heroMealPlan.flow.label}</span>
				<div class="next-title">
					<strong class="truncate">{heroMealPlan.title}</strong>
					<span class="sub">下一顿</span>
				</div>
				<p class="next-desc line-clamp-2">{heroMealPlan.flow.summary}</p>
			</div>
			<a href={`/app/meal-plans/${heroMealPlan.id}`} class="continue-btn">
				继续这顿 <ArrowRight class="size-4" />
			</a>
		</section>
		<FlowSteps step={heroMealPlan.flow.step} archived={heroMealPlan.flow.step === 'archived'} />
	{:else}
		<section class="fd-next-card" aria-label="今天建议">
			<div class="min-w-0">
				<span class="next-chip">今天建议</span>
				<div class="next-title">
					<strong>先定{nextSlot?.mealSlot ?? '下一顿'}</strong>
					{#if nextSlot}<span class="sub">{nextSlot.helper}</span>{/if}
				</div>
				<p class="next-desc">从 {data.stats.dishes} 道常做菜里挑，最快 1 分钟完成。</p>
			</div>
			<a href="/app/meal-plans/new" class="continue-btn">
				开始安排 <ArrowRight class="size-4" />
			</a>
		</section>
		<FlowSteps step="arrange" />
	{/if}

	{#if !data.isNewUser}
		<!-- 进展：直线进度 -->
		<section class="fd-section-head">
			<div>
				<h3>今天进展</h3>
				<p>{visibleMealPlans.length > 0 ? '家里的吃饭安排' : '安排 → 确认 → 买菜 → 完成'}</p>
			</div>
		</section>

		{#if visibleMealPlans.length > 0}
			<div class="fd-card-list">
				{#each visibleMealPlans as mealPlan}
					<a href={`/app/meal-plans/${mealPlan.id}`} class="fd-soft-card" style="display:grid;gap:9px;text-decoration:none;">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
							<strong style="font-size:17px;font-weight:850;">{mealPlan.title}</strong>
							<span class={flowChipClass(mealPlan.flow.tone)}>{mealPlan.flow.label}</span>
						</div>
						<p style="margin:0;color:#595550;font-size:13px;line-height:1.35;">{mealPlan.flow.summary}</p>
						<div style="display:flex;align-items:center;gap:8px;">
							<span class="fd-pill">{mealPlan.items.length} 道菜</span>
							<span class="fd-pill green">{mealPlan.dateRangeLabel}</span>
						</div>
						<FlowSteps step={mealPlan.flow.step} archived={mealPlan.flow.step === 'archived'} />
						<span style="display:inline-flex;align-items:center;gap:5px;color:{actionColor(mealPlan.flow.step)};font-size:13px;font-weight:800;">
							{actionText(mealPlan)} <ArrowRight class="size-4" />
						</span>
					</a>
				{/each}
			</div>
		{:else}
			<p style="margin-top:10px;color:var(--fd-muted);font-size:13px;">今天还没有饭单。选一个餐别，我来先生成菜单和清单。</p>
		{/if}

		<a class="fd-soft-card" href="/app/meal-plans" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;text-decoration:none;">
			<div>
				<strong style="font-size:15px;font-weight:850;">看全部饭单</strong>
				<p style="margin:3px 0 0;color:var(--fd-muted);font-size:12px;">{data.stats.mealPlans} 顿已安排</p>
			</div>
			<ArrowRight class="size-5" style="color:#6a645d;" />
		</a>
	{/if}
</main>

<MobileBottomNav />
