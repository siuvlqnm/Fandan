<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import basketImage from '$lib/assets/meal-ui/basket.jpg';
	import breakfastImage from '$lib/assets/meal-ui/breakfast.jpg';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import heroImage from '$lib/assets/meal-ui/hero.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import snackImage from '$lib/assets/meal-ui/snack.jpg';
	import {
		ArrowRight,
		CalendarDays,
		CheckCircle2,
		Clock3,
		CookingPot,
		Moon,
		Plus,
		ShoppingBasket,
		Soup,
		Sun,
		UserPlus
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let dateMode = $state<'today' | 'tomorrow' | 'custom'>('today');
	let customDate = $state('');

	const displayName = $derived(data.user.name || data.user.email.split('@')[0] || '家里人');
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
	const slotState = (slot: PageData['quickStart']['slots'][number]) => {
		if (slot.disabledToday && dateMode === 'today') return '已过';
		if (slot.id === nextSlot?.id && dateMode === 'today') return '推荐';
		if (slot.id === 'late_night') return '轻';
		return '备';
	};
	const slotTone = (slot: PageData['quickStart']['slots'][number]) => {
		if (slot.disabledToday && dateMode === 'today') return 'opacity-60';
		if (slot.id === nextSlot?.id && dateMode === 'today') return 'border-accent bg-accent/45 shadow-[0_14px_30px_oklch(0.76_0.16_72_/_15%)]';
		return '';
	};
	const shortDate = (value: string) => {
		const [, month, day] = value.split('-');
		return `${month}-${day}`;
	};
	const isSlotDisabled = (slot: PageData['quickStart']['slots'][number]) =>
		selectedQuickDate === data.quickStart.today && slot.disabledToday;
	const flowChipClass = (tone: string) =>
		tone === 'attention'
			? 'bg-destructive/10 text-destructive'
			: tone === 'success'
				? 'bg-secondary text-primary'
				: tone === 'muted'
					? 'bg-muted text-muted-foreground'
					: 'bg-white text-primary';
</script>

<svelte:head>
	<title>今天吃什么 / 饭单</title>
</svelte:head>

<main class="app-client-page app-bottom-safe" data-testid="mobile-dashboard">
	<header class="app-topbar">
		<a href="/app" class="app-brand">
			<span class="app-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<span class="block text-2xl font-bold tracking-normal">饭单</span>
				<span class="block truncate text-sm text-muted-foreground">让每一顿都更简单温暖</span>
			</span>
		</a>
		<div class="flex items-center gap-2">
			{#if data.space.role === 'owner'}
				<a href="/app/invitations" class="app-icon-action" aria-label="邀请家人">
					<UserPlus class="size-5" />
				</a>
			{/if}
			<a href="/app/settings" class="app-icon-action overflow-hidden p-0" aria-label="打开家页">
				<img src={avatarImage} alt="" class="h-full w-full object-cover" />
			</a>
		</div>
	</header>

	<section class="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-white/85 p-4 shadow-[var(--app-shadow)]">
		<img src={heroImage} alt="" class="absolute right-[-2.2rem] top-0 h-full w-44 object-cover opacity-90 [mask-image:linear-gradient(90deg,transparent,black_32%)]" />
		<div class="relative max-w-[15rem] space-y-3">
			<p class="app-chip bg-white/80 text-muted-foreground">
				<span class="font-semibold text-foreground">今天 {shortDate(data.todayKey)}</span>
				<span>·</span>
				<span>{currentMealText}</span>
			</p>
			<div class="space-y-2">
				<h1 class="text-4xl font-black leading-[1.05] tracking-normal">下一顿吃什么？</h1>
				<p class="text-base leading-6 text-muted-foreground">你好，{displayName}。定好饭点，我帮你把菜单和买菜清单理顺。</p>
			</div>
		</div>
	</section>

	<section class="grid grid-cols-3 gap-2">
		<button
			type="button"
			class="min-h-16 rounded-[1.1rem] border px-3 text-left text-sm shadow-sm transition {dateMode === 'today' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white/85 text-foreground'}"
			onclick={() => (dateMode = 'today')}
		>
			<span class="block font-bold">今天</span>
			<span class="text-xs text-muted-foreground">{shortDate(data.quickStart.today)}</span>
		</button>
		<button
			type="button"
			class="min-h-16 rounded-[1.1rem] border px-3 text-left text-sm shadow-sm transition {dateMode === 'tomorrow' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white/85 text-foreground'}"
			onclick={() => (dateMode = 'tomorrow')}
		>
			<span class="block font-bold">明天</span>
			<span class="text-xs text-muted-foreground">{shortDate(data.quickStart.tomorrow)}</span>
		</button>
		<button
			type="button"
			class="min-h-16 rounded-[1.1rem] border px-3 text-left text-sm shadow-sm transition {dateMode === 'custom' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white/85 text-foreground'}"
			onclick={() => (dateMode = 'custom')}
		>
			<span class="block font-bold">选日期</span>
			<span class="text-xs text-muted-foreground">{dateMode === 'custom' ? shortDate(customDate || data.quickStart.today) : '自定义'}</span>
		</button>
	</section>

	{#if dateMode === 'custom'}
		<label class="grid gap-2 rounded-[1.1rem] border border-border/80 bg-white/85 p-3 text-sm font-medium shadow-sm">
			<span>选择日期</span>
			<input
				type="date"
				value={customDate || data.quickStart.today}
				min={data.quickStart.today}
				class="app-input h-11"
				oninput={(event) => (customDate = event.currentTarget.value)}
			/>
		</label>
	{/if}

	{#if form?.quickStartError}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{form.quickStartError}</p>
	{/if}

	<section class="grid gap-2">
		{#each data.quickStart.slots as slot}
			{@const Icon = slotIcon(slot.id)}
			{@const disabled = isSlotDisabled(slot)}
			<form method="post" action="?/quickStart" use:enhanceWithFeedback={{ pendingLabel: '正在安排...' }}>
				<input type="hidden" name="quickStartDate" value={selectedQuickDate} />
				<input type="hidden" name="quickStartSlot" value={slot.id} />
				<button
					type="submit"
					class="app-meal-card w-full text-left transition {slotTone(slot)}"
					disabled={disabled}
					data-pending-label="正在安排..."
				>
					<span class="flex justify-center text-primary"><Icon class="size-7" /></span>
					<span class="min-w-0 py-3">
						<span class="flex min-w-0 items-baseline gap-2">
							<span class="text-xl font-black leading-none">{slot.mealSlot}</span>
							<span class="truncate text-xs font-semibold text-muted-foreground">{slot.helper}</span>
							<span class="ml-auto rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-bold text-primary">{slotState(slot)}</span>
						</span>
						<span class="mt-2 block truncate text-xs text-muted-foreground">推荐：{slot.recommendedNames.join('、')}</span>
					</span>
					<span class="app-meal-card-image"><img src={slotImage[slot.id]} alt="" /></span>
				</button>
			</form>
		{/each}
	</section>

	{#if heroMealPlan}
		<section class="app-hero">
			<div class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-0">
				<div class="min-w-0 space-y-3 p-4">
					<p class="app-chip {flowChipClass(heroMealPlan.flow.tone)}">{heroMealPlan.flow.label}</p>
					<div>
						<h2 class="truncate text-xl font-bold">{heroMealPlan.title}</h2>
						<p class="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{heroMealPlan.flow.summary}</p>
					</div>
					<Button href={`/app/meal-plans/${heroMealPlan.id}`} class="h-11 rounded-full px-4">
						继续这顿 <ArrowRight class="size-4" />
					</Button>
				</div>
				<img src={basketImage} alt="" class="h-32 w-full object-cover [mask-image:linear-gradient(90deg,transparent,black_25%)]" />
			</div>
		</section>
	{:else}
		<section class="app-hero">
			<div class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-0">
				<div class="min-w-0 space-y-3 p-4">
					<p class="app-chip bg-accent text-accent-foreground">今天建议</p>
					<div>
						<h2 class="text-xl font-bold">先定{nextSlot?.mealSlot ?? '下一顿'}</h2>
						<p class="mt-1 text-sm leading-5 text-muted-foreground">从常做菜里挑，最快一分钟完成。</p>
					</div>
					<Button href="/app/meal-plans/new" class="h-11 rounded-full px-4">
						手动安排 <Plus class="size-4" />
					</Button>
				</div>
				<img src={basketImage} alt="" class="h-32 w-full object-cover [mask-image:linear-gradient(90deg,transparent,black_25%)]" />
			</div>
		</section>
	{/if}

	{#if !data.isNewUser}
		<section class="app-section-title">
			<div>
				<h2>今天进展</h2>
				<p>{visibleMealPlans.length > 0 ? '家里的吃饭安排' : '还没有安排，先从上面选一顿'}</p>
			</div>
			<a href="/app/meal-plans" class="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground">
				全部 <ArrowRight class="size-4" />
			</a>
		</section>

		<section class="grid gap-2">
			{#if visibleMealPlans.length === 0}
				<div class="app-list-row text-sm text-muted-foreground">
					<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Soup class="size-5" /></span>
					<span>今天还没有饭单。选一个餐别，我来先生成菜单和清单。</span>
				</div>
			{:else}
				{#each visibleMealPlans as mealPlan}
					<a href={`/app/meal-plans/${mealPlan.id}`} class="app-list-row">
						<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><CookingPot class="size-5" /></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-semibold">{mealPlan.title}</span>
							<span class="block truncate text-sm text-muted-foreground">{mealPlan.dateRangeLabel} · {mealPlan.items.length} 道菜 · {mealPlan.flow.label}</span>
						</span>
						<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
					</a>
				{/each}
			{/if}
		</section>

		<section class="grid grid-cols-2 gap-2">
			<a href="/app/dishes" class="app-list-row min-h-24 flex-col items-start justify-center">
				<CookingPot class="size-6 text-primary" />
				<span class="font-semibold">常做菜</span>
				<span class="text-sm text-muted-foreground">{data.stats.dishes} 道可复用</span>
			</a>
			<a href="/app/shopping-lists" class="app-list-row min-h-24 flex-col items-start justify-center">
				<ShoppingBasket class="size-6 text-primary" />
				<span class="font-semibold">买菜</span>
				<span class="text-sm text-muted-foreground">待买清单和历史</span>
			</a>
		</section>

		{#if data.pendingTasks.length > 0}
			<section class="app-section-title">
				<div>
					<h2>还差一步</h2>
					<p>优先处理这些事情</p>
				</div>
			</section>
			<section class="grid gap-2" data-testid="dashboard-pending-tasks">
				{#each data.pendingTasks.slice(0, 3) as task}
					<a href={task.href} class="app-list-row" data-testid={`pending-task-${task.type}`}>
						<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><CheckCircle2 class="size-5" /></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-semibold">{task.title}</span>
							<span class="block truncate text-sm text-muted-foreground">{task.detail}</span>
						</span>
						<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
					</a>
				{/each}
			</section>
		{/if}
	{/if}
</main>

<MobileBottomNav />
