<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowRight,
		CalendarDays,
		ChefHat,
		ClipboardList,
		MessageCircle,
		Plus,
		Send,
		ShoppingBag,
		UsersRound,
		UserPlus
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
	const flow = $derived([
		{ label: '菜品', detail: '搭配菜单', icon: ChefHat, active: selectedDishCount > 0 },
		{ label: '确认', detail: '收集反馈', icon: UsersRound, active: heroMealPlan?.status === 'pending_confirmation' || heroMealPlan?.status === 'confirmed' },
		{ label: '清单', detail: '采购准备', icon: ClipboardList, active: Boolean(heroMealPlan && selectedDishCount > 0) }
	]);
	const stats = $derived([
		{ label: '饭单总数', value: data.stats.mealPlans, icon: ClipboardList },
		{ label: '待确认', value: data.pendingMealPlans.length, icon: MessageCircle },
		{ label: '菜品数量', value: data.stats.dishes, icon: ChefHat },
		{ label: '对象', value: data.stats.targets, icon: UsersRound }
	]);
</script>

<svelte:head>
	<title>工作台 / 饭单</title>
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
		<h1 class="text-2xl font-semibold leading-tight">你好，{displayName}</h1>
	</section>

	{#if data.isNewUser}
		<section class="app-panel overflow-hidden">
			<div class="space-y-4 bg-secondary/70 p-5">
				<p class="app-chip bg-white text-primary">第一次使用</p>
				<div class="space-y-2">
					<h2 class="text-2xl font-semibold">先安排一顿饭</h2>
					<p class="text-sm leading-6 text-muted-foreground">
						只要写下想吃的菜和人数，就能直接得到这一顿的购物清单。
					</p>
				</div>
				<Button href="/app/meal-plans/new" class="h-12 w-full rounded-2xl text-base">
					<Plus class="size-4" />
					安排一顿饭
				</Button>
			</div>
		</section>
	{:else if heroMealPlan}
		<section class="app-panel overflow-hidden border-destructive/20">
			<div class="space-y-4 bg-[linear-gradient(135deg,oklch(1_0_0),oklch(0.975_0.025_151))] p-4">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 space-y-3">
						<p class="app-chip bg-destructive/10 text-destructive">
							{heroMealPlan.statusLabel === '待确认' ? '待确认饭单' : heroMealPlan.statusLabel}
						</p>
						<div class="space-y-2">
							<h2 class="break-words text-2xl font-semibold leading-tight">{heroMealPlan.title}</h2>
							<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
								<span class="inline-flex items-center gap-1.5"><UsersRound class="size-4" />{heroMealPlan.targetName}</span>
								<span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" />{heroMealPlan.dateRangeLabel}</span>
							</p>
						</div>
					</div>
					<a href={`/app/meal-plans/${heroMealPlan.id}`} class="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm" aria-label="打开饭单">
						<ArrowRight class="size-5" />
					</a>
				</div>

				<div class="grid grid-cols-3 divide-x divide-border/70 rounded-2xl bg-white p-3 text-center text-sm">
					<p><span class="block text-2xl font-semibold">{heroMealPlan.items.length}</span><span class="text-xs text-muted-foreground">菜品</span></p>
					<p><span class="block font-semibold">{heroMealPlan.typeLabel}</span><span class="text-xs text-muted-foreground">类型</span></p>
					<p><span class="block font-semibold">{heroMealPlan.statusLabel}</span><span class="text-xs text-muted-foreground">状态</span></p>
				</div>

				<div class="grid grid-cols-[1fr_1.25fr] gap-3">
					<Button href={`/app/meal-plans/${heroMealPlan.id}?panel=confirm`} variant="outline" class="h-12 rounded-2xl bg-white">
						<MessageCircle class="size-4" />
						查看反馈
					</Button>
					<Button href={`/app/meal-plans/${heroMealPlan.id}?panel=confirm`} class="h-12 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90">
						<Send class="size-4" />
						分享确认
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
							<span class="block truncate text-sm text-muted-foreground">{mealPlan.targetName} · {mealPlan.dateRangeLabel}</span>
							<span class="block text-sm {mealPlan.status === 'pending_confirmation' ? 'text-destructive' : 'text-primary'}">
								{mealPlan.statusLabel}
							</span>
						</span>
						<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
					</a>
				{/each}
			{/if}
		</div>
		</section>

		<section class="space-y-3">
		<h2 class="text-xl font-semibold">本周概览</h2>
		<div class="app-soft-panel grid grid-cols-4 divide-x divide-border/70 p-3 text-center">
			{#each stats as item}
				{@const Icon = item.icon}
				<div class="space-y-1 px-1">
					<Icon class="mx-auto size-5 text-primary" />
					<p class="text-2xl font-semibold">{item.value}</p>
					<p class="text-xs text-muted-foreground">{item.label}</p>
				</div>
			{/each}
		</div>
		</section>

		<section class="app-panel flex items-center justify-between gap-3 bg-[oklch(0.98_0.025_88)] p-5">
		<div class="space-y-1">
			<p class="text-lg font-semibold">准备购物清单</p>
			<p class="text-sm text-muted-foreground">{heroMealPlan ? `当前饭单有 ${selectedDishCount} 道菜` : '先创建饭单并添加带食材的菜品'}</p>
		</div>
		<Button
			href={heroMealPlan ? `/app/meal-plans/${heroMealPlan.id}` : '/app/meal-plans/new'}
			variant={heroMealPlan ? 'outline' : 'default'}
			class="h-11 rounded-2xl {heroMealPlan ? 'bg-white' : ''}"
		>
			生成清单
			<ShoppingBag class="size-4" />
		</Button>
		</section>
	{/if}
</main>

<MobileBottomNav />
