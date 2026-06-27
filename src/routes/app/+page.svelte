<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		Activity,
		ArrowRight,
		CalendarDays,
		ChefHat,
		CheckCircle2,
		ClipboardList,
		Clock3,
		ListTodo,
		MessageCircle,
		Plus,
		ShoppingBag,
		UsersRound,
		UserPlus
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let dateMode = $state<'today' | 'tomorrow' | 'custom'>('today');
	let customDate = $state('');

	const displayName = $derived(data.user.name || data.user.email.split('@')[0] || '饭单创建者');
	const priorityMealPlans = $derived(
		data.pendingMealPlans.length > 0
			? data.pendingMealPlans
			: data.todayMealPlans.length > 0
				? data.todayMealPlans
				: data.recentMealPlans
	);
	const heroMealPlan = $derived(priorityMealPlans[0] ?? null);
	const visibleMealPlans = $derived(
		(data.todayMealPlans.length > 0 ? data.todayMealPlans : data.recentMealPlans).slice(0, 3)
	);
	const selectedDishCount = $derived(heroMealPlan?.items.length ?? data.stats.dishes);
	const heroActionHref = $derived(
		heroMealPlan
			? heroMealPlan.flow.step === 'confirm'
				? `/app/meal-plans/${heroMealPlan.id}?panel=confirm`
				: heroMealPlan.flow.step === 'shop'
					? `/app/meal-plans/${heroMealPlan.id}?panel=shopping`
					: `/app/meal-plans/${heroMealPlan.id}`
			: '/app/meal-plans/new'
	);
	const flow = $derived([
		{ label: '选菜', detail: selectedDishCount > 0 ? `${selectedDishCount} 道菜` : '先决定吃什么', icon: ChefHat, active: selectedDishCount > 0 },
		{
			label: '确认',
			detail: heroMealPlan?.flow.step === 'confirm' ? '正在确认' : '家人看一眼',
			icon: UsersRound,
			active: Boolean(heroMealPlan && ['confirm', 'shop', 'done'].includes(heroMealPlan.flow.step))
		},
		{
			label: '买菜',
			detail: heroMealPlan?.flow.step === 'shop' ? '清单就绪' : '生成清单',
			icon: ClipboardList,
			active: Boolean(heroMealPlan && ['shop', 'done'].includes(heroMealPlan.flow.step))
		}
	]);
	const weekSummary = $derived([
		{ label: '本周安排', value: data.weekMealPlans.length, icon: CalendarDays },
		{ label: '等待确认', value: data.pendingMealPlans.length, icon: MessageCircle },
		{ label: '饭单总数', value: data.stats.mealPlans, icon: ClipboardList }
	]);
	const customQuickDate = $derived(customDate || data.quickStart.today);
	const selectedQuickDate = $derived(
		dateMode === 'today' ? data.quickStart.today : dateMode === 'tomorrow' ? data.quickStart.tomorrow : customQuickDate
	);
	const flowChipClass = (tone: string) =>
		tone === 'attention'
			? 'bg-destructive/10 text-destructive'
			: tone === 'success'
				? 'bg-secondary text-primary'
				: tone === 'muted'
					? 'bg-muted text-muted-foreground'
					: 'bg-white text-primary';
	const shortDate = (value: string) => {
		const [, month, day] = value.split('-');
		return `${month}-${day}`;
	};
	const isSlotDisabled = (slot: PageData['quickStart']['slots'][number]) =>
		selectedQuickDate === data.quickStart.today && slot.disabledToday;
	const formatTime = (value: string) =>
		new Intl.DateTimeFormat('zh-CN', {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`));
	const taskIcon = (type: PageData['pendingTasks'][number]['type']) =>
		type === 'confirm' ? MessageCircle : type === 'shop' ? ShoppingBag : type === 'generate' ? ClipboardList : UserPlus;
	const activityIcon = (type: PageData['activityItems'][number]['type']) =>
		type === 'meal_plan' ? ClipboardList : type === 'dish' ? ChefHat : type === 'shopping' ? CheckCircle2 : UserPlus;
</script>

<svelte:head>
	<title>安排一顿饭 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe" data-testid="mobile-dashboard">
	<section class="flex items-center justify-between gap-4">
		<a href="/app" class="flex min-w-0 items-center gap-2.5">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
				<ChefHat class="size-5" />
			</span>
			<span class="min-w-0 leading-tight">
				<span class="block text-lg font-semibold">饭单</span>
				<span class="block text-xs text-muted-foreground">Fandan</span>
			</span>
		</a>
		<div class="flex items-center gap-2">
			{#if data.space.role === 'owner'}
				<a href="/app/invitations" class="flex size-11 items-center justify-center rounded-full bg-white text-primary shadow-sm" aria-label="邀请家人">
					<UserPlus class="size-5" />
				</a>
			{/if}
			<form method="post" action="/logout">
				<button type="submit" class="min-h-11 rounded-full border border-border bg-white px-3 py-2 text-sm text-muted-foreground">退出</button>
			</form>
		</div>
	</section>

	<section class="space-y-1">
		<p class="text-xs text-muted-foreground">{data.todayKey}</p>
		<h1 class="text-2xl font-semibold leading-tight">先安排一顿饭</h1>
		<p class="text-sm leading-6 text-muted-foreground">你好，{displayName}。先把哪天吃、吃哪顿定下来，再继续确认和买菜。</p>
	</section>

	<section class="app-panel space-y-5 p-5">
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">先安排一顿饭</p>
			<h2 class="text-2xl font-semibold leading-tight">哪天吃，吃哪顿？</h2>
			<p class="text-sm leading-6 text-muted-foreground">
				现在是北京时间 {data.quickStart.currentHour}:00。今天已经过了的餐别会自动变灰。
			</p>
		</div>

		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				class="min-h-14 rounded-2xl border px-3 text-left text-sm transition {dateMode === 'today' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white text-foreground'}"
				onclick={() => (dateMode = 'today')}
			>
				<span class="block font-semibold">今天</span>
				<span class="text-xs text-muted-foreground">{shortDate(data.quickStart.today)}</span>
			</button>
			<button
				type="button"
				class="min-h-14 rounded-2xl border px-3 text-left text-sm transition {dateMode === 'tomorrow' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white text-foreground'}"
				onclick={() => (dateMode = 'tomorrow')}
			>
				<span class="block font-semibold">明天</span>
				<span class="text-xs text-muted-foreground">{shortDate(data.quickStart.tomorrow)}</span>
			</button>
			<button
				type="button"
				class="min-h-14 rounded-2xl border px-3 text-left text-sm transition {dateMode === 'custom' ? 'border-primary bg-secondary text-primary' : 'border-border bg-white text-foreground'}"
				onclick={() => (dateMode = 'custom')}
			>
				<span class="block font-semibold">选日期</span>
				<span class="text-xs text-muted-foreground">{dateMode === 'custom' ? shortDate(customQuickDate) : '自定义'}</span>
			</button>
		</div>

		{#if dateMode === 'custom'}
			<div class="space-y-2">
				<label for="quick-start-date" class="text-sm font-medium">选择日期</label>
				<input
					id="quick-start-date"
					type="date"
					value={customQuickDate}
					min={data.quickStart.today}
					class="app-input h-12"
					oninput={(event) => (customDate = event.currentTarget.value)}
				/>
			</div>
		{/if}

		{#if form?.quickStartError}
			<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{form.quickStartError}</p>
		{/if}

		<div class="grid grid-cols-2 gap-3">
			{#each data.quickStart.slots as slot}
				{@const disabled = isSlotDisabled(slot)}
				<form method="post" action="?/quickStart" use:enhanceWithFeedback={{ pendingLabel: '正在生成饭单...' }}>
					<input type="hidden" name="quickStartDate" value={selectedQuickDate} />
					<input type="hidden" name="quickStartSlot" value={slot.id} />
					<Button
						type="submit"
						variant={disabled ? 'outline' : 'default'}
						class="min-h-28 w-full min-w-0 flex-col items-start justify-start whitespace-normal rounded-2xl p-4 text-left {disabled ? 'bg-muted text-muted-foreground' : ''}"
						disabled={disabled}
						data-pending-label="正在生成饭单..."
					>
						<span class="flex w-full items-center justify-between gap-2">
							<span class="text-base font-semibold">{slot.label}</span>
							{#if disabled}<span class="text-xs">已过</span>{/if}
						</span>
						<span class="w-full min-w-0 break-words text-xs font-normal leading-5 opacity-80">{slot.helper}</span>
						<span class="line-clamp-2 w-full min-w-0 break-words text-xs font-normal leading-5 opacity-80">
							推荐：{slot.recommendedNames.join('、')}
						</span>
					</Button>
				</form>
			{/each}
		</div>
	</section>

	{#if !data.isNewUser && heroMealPlan}
		<section class="app-panel overflow-hidden border-destructive/20">
			<div class="space-y-4 bg-[linear-gradient(135deg,oklch(1_0_0),oklch(0.975_0.025_151))] p-4">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 space-y-3">
						<p class="app-chip {flowChipClass(heroMealPlan.flow.tone)}">
							{heroMealPlan.flow.label}
						</p>
						<div class="space-y-2">
							<h2 class="break-words text-2xl font-semibold leading-tight">{heroMealPlan.title}</h2>
							<p class="text-sm leading-6 text-muted-foreground">{heroMealPlan.flow.summary}</p>
							<p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
								<span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" />{heroMealPlan.dateRangeLabel}</span>
								<span>{heroMealPlan.items.length} 道菜</span>
							</p>
						</div>
					</div>
					<a href={`/app/meal-plans/${heroMealPlan.id}`} class="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm" aria-label="打开饭单">
						<ArrowRight class="size-5" />
					</a>
				</div>

				<div class="grid grid-cols-3 divide-x divide-border/70 rounded-2xl bg-white p-3 text-center text-sm">
					<p><span class="block text-2xl font-semibold">{heroMealPlan.items.length}</span><span class="text-xs text-muted-foreground">道菜</span></p>
					<p><span class="block font-semibold">{heroMealPlan.targetName}</span><span class="text-xs text-muted-foreground">用餐</span></p>
					<p><span class="block font-semibold">{heroMealPlan.statusLabel}</span><span class="text-xs text-muted-foreground">系统状态</span></p>
				</div>

				<div class="grid grid-cols-[1fr_1.25fr] gap-3">
					<Button href="/app/meal-plans/new" variant="outline" class="h-12 rounded-2xl bg-white">
						<Plus class="size-4" />
						再安排一顿
					</Button>
					<Button href={heroActionHref} class="h-12 rounded-2xl text-base">
						<ArrowRight class="size-4" />
						{heroMealPlan.flow.primaryLabel}
					</Button>
				</div>
			</div>

			<div class="grid grid-cols-3 bg-white px-4 py-3">
				{#each flow as step, index}
					{@const Icon = step.icon}
					<div class="relative flex flex-col items-center gap-2 text-center">
						{#if index < flow.length - 1}
							<span class="absolute left-[calc(50%+1.25rem)] top-5 h-px w-[calc(100%-2.5rem)] bg-border"></span>
						{/if}
						<span class="relative flex size-9 items-center justify-center rounded-full {step.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
							<Icon class="size-5" />
						</span>
						<span class="text-sm font-semibold">{step.label}</span>
						<span class="text-xs text-muted-foreground">{step.detail}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if !data.isNewUser}
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">待处理事项</h2>
				<span class="inline-flex items-center gap-1 text-sm text-muted-foreground"><ListTodo class="size-4" />{data.pendingTasks.length}</span>
			</div>
			<div class="app-panel divide-y divide-border/70 overflow-hidden" data-testid="dashboard-pending-tasks">
				{#if data.pendingTasks.length === 0}
					<div class="flex items-center gap-3 p-4 text-sm leading-6 text-muted-foreground">
						<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><CheckCircle2 class="size-5" /></span>
						<span>当前没有需要家人马上处理的饭单、采购或邀请。</span>
					</div>
				{:else}
					{#each data.pendingTasks as task}
						{@const Icon = taskIcon(task.type)}
						<a href={task.href} class="flex min-h-20 items-center gap-3 p-4 transition hover:bg-muted/50" data-testid={`pending-task-${task.type}`}>
							<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
								<Icon class="size-5" />
							</span>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate text-base font-semibold">{task.title}</span>
								<span class="block truncate text-sm text-muted-foreground">{task.detail}</span>
							</span>
							<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
						</a>
					{/each}
				{/if}
			</div>
		</section>

		<section class="app-panel flex items-center justify-between gap-3 p-4" data-testid="dashboard-shopping-list-entry">
			<a href="/app/shopping-lists" class="flex min-w-0 flex-1 items-center gap-3">
				<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
					<ShoppingBag class="size-5" />
				</span>
				<span class="min-w-0 space-y-1">
					<span class="block text-lg font-semibold">当前采购</span>
					<span class="block truncate text-sm text-muted-foreground">查看待买清单，或翻回历史采购记录。</span>
				</span>
			</a>
			<Button href="/app/shopping-lists" variant="outline" class="h-11 shrink-0 rounded-2xl bg-white px-3">
				打开
			</Button>
		</section>

		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">今日饭单</h2>
				<a href="/app/meal-plans" class="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground">
					全部 <ArrowRight class="size-4" />
				</a>
			</div>
			<div class="app-panel divide-y divide-border/70 overflow-hidden">
				{#if visibleMealPlans.length === 0}
					<div class="p-5 text-sm leading-6 text-muted-foreground">今天还没有安排。新建一份饭单，把菜品和确认流程串起来。</div>
				{:else}
					{#each visibleMealPlans as mealPlan}
						<a href={`/app/meal-plans/${mealPlan.id}`} class="flex items-center gap-3 p-4 transition hover:bg-muted/50">
							<span class="h-16 w-1 shrink-0 rounded-full {mealPlan.status === 'pending_confirmation' ? 'bg-destructive' : mealPlan.status === 'confirmed' ? 'bg-primary' : 'bg-[oklch(0.76_0.16_72)]'}"></span>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate text-lg font-semibold">{mealPlan.title}</span>
								<span class="block truncate text-sm text-muted-foreground">{mealPlan.dateRangeLabel} · {mealPlan.items.length} 道菜</span>
								<span class="block text-sm {mealPlan.flow.tone === 'attention' ? 'text-destructive' : 'text-primary'}">
									{mealPlan.flow.label}
								</span>
							</span>
							<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
						</a>
					{/each}
				{/if}
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-xl font-semibold">本周节奏</h2>
			<div class="app-soft-panel grid grid-cols-3 divide-x divide-border/70 p-3 text-center">
				{#each weekSummary as item}
					{@const Icon = item.icon}
					<div class="space-y-1 px-1">
						<Icon class="mx-auto size-5 text-primary" />
						<p class="text-2xl font-semibold">{item.value}</p>
						<p class="text-xs text-muted-foreground">{item.label}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">家庭动态</h2>
				<span class="inline-flex items-center gap-1 text-sm text-muted-foreground"><Activity class="size-4" />最近</span>
			</div>
			<div class="app-panel divide-y divide-border/70 overflow-hidden" data-testid="dashboard-activity">
				{#if data.activityItems.length === 0}
					<div class="flex items-center gap-3 p-4 text-sm leading-6 text-muted-foreground">
						<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Clock3 class="size-5" /></span>
						<span>还没有家庭协作动态。创建饭单、采购或邀请家人后会出现在这里。</span>
					</div>
				{:else}
					{#each data.activityItems as item}
						{@const Icon = activityIcon(item.type)}
						<a href={item.href} class="flex min-h-20 items-center gap-3 p-4 transition hover:bg-muted/50" data-testid={`activity-${item.type}`}>
							<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
								<Icon class="size-5" />
							</span>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="flex min-w-0 items-center gap-2">
									<span class="truncate text-base font-semibold">{item.title}</span>
									<span class="shrink-0 text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
								</span>
								<span class="block truncate text-sm text-muted-foreground">{item.actorName} · {item.detail}</span>
							</span>
							<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
						</a>
					{/each}
				{/if}
			</div>
		</section>
	{/if}
</main>

<MobileBottomNav />
