<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		ArrowRight,
		CalendarDays,
		CheckCircle2,
		ChefHat,
		ClipboardList,
		Clock3,
		Inbox,
		Plus,
		UsersRound
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ label: '用餐对象', value: data.stats.targets, href: '/app/targets', icon: UsersRound },
		{ label: '菜品', value: data.stats.dishes, href: '/app/dishes', icon: ChefHat },
		{ label: '饭单', value: data.stats.mealPlans, href: '/app/meal-plans', icon: ClipboardList }
	]);

	const priorityMealPlans = $derived(
		data.pendingMealPlans.length > 0
			? data.pendingMealPlans
			: data.todayMealPlans.length > 0
				? data.todayMealPlans
				: data.recentMealPlans
	);

	const priorityTitle = $derived(
		data.pendingMealPlans.length > 0 ? '待确认饭单' : data.todayMealPlans.length > 0 ? '今日饭单' : '最近饭单'
	);

	const priorityDescription = $derived(
		data.pendingMealPlans.length > 0
			? '先处理需要家人或客户确认的饭单。'
			: data.todayMealPlans.length > 0
				? `今天 ${data.todayKey} 需要处理的安排。`
				: '从最近编辑过的饭单继续。'
	);
</script>

<svelte:head>
	<title>工作台 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
	<section class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
		<div class="min-w-0 space-y-3">
			<p class="text-sm text-muted-foreground">{data.user.email}</p>
			<div class="space-y-2">
				<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">{data.space.name}</h1>
				<p class="max-w-2xl text-muted-foreground">
					从这里继续创建饭单、查看确认进度，并快速回到最近的对象和菜品。
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button href="/app/meal-plans/new" class="min-w-32">
					<Plus class="size-4" />
					新建饭单
				</Button>
				<Button href="/app/meal-plans" variant="outline">
					<ClipboardList class="size-4" />
					全部饭单
				</Button>
			</div>
		</div>
		<form method="post" action="/logout" class="lg:pt-1">
			<Button type="submit" variant="outline">退出登录</Button>
		</form>
	</section>

	<section class="grid gap-3 md:grid-cols-3">
		{#each stats as item}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="rounded-lg border bg-card p-4 text-card-foreground shadow-xs transition hover:border-primary/50 hover:bg-accent/40"
			>
				<span class="flex items-center justify-between gap-3">
					<span class="text-sm text-muted-foreground">{item.label}</span>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
						<Icon class="size-4" />
					</span>
				</span>
				<span class="mt-3 block text-3xl font-semibold">{item.value}</span>
			</a>
		{/each}
	</section>

	{#if data.isNewUser}
		<Card.Root class="rounded-lg border-primary/30 bg-primary/5" data-testid="dashboard-empty-state">
			<Card.Header class="gap-3">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div class="min-w-0 space-y-2">
						<Card.Title class="text-2xl">创建第一份饭单</Card.Title>
						<Card.Description class="max-w-2xl text-base">
							可以直接从饭单开始；如果还没有用餐对象或菜品，创建流程里也能快速补上第一批信息。
						</Card.Description>
					</div>
					<span class="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<ClipboardList class="size-5" />
					</span>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				<Button href="/app/meal-plans/new" class="sm:min-w-40">
					<Plus class="size-4" />
					新建第一份饭单
				</Button>
				<Button href="/app/dishes/new" variant="outline">先录菜品</Button>
				<Button href="/app/targets/new" variant="outline">添加用餐对象</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<section class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
			<Card.Root class="rounded-lg" data-testid="dashboard-priority">
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 space-y-1">
							<Card.Title class="flex items-center gap-2">
								<Clock3 class="size-5" />
								{priorityTitle}
							</Card.Title>
							<Card.Description>{priorityDescription}</Card.Description>
						</div>
						<Button href="/app/meal-plans/new" size="sm">
							<Plus class="size-4" />
							新建
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if priorityMealPlans.length === 0}
						<div class="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
							<Inbox class="mb-3 size-5" />
							暂无需要继续处理的饭单。
						</div>
					{:else}
						{#each priorityMealPlans as mealPlan}
							<article class="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_auto] md:items-center">
								<div class="min-w-0 space-y-1">
									<h2 class="truncate text-base font-medium">{mealPlan.title}</h2>
									<p class="text-sm text-muted-foreground">
										{mealPlan.targetName} · {mealPlan.typeLabel} · {mealPlan.statusLabel}
									</p>
									<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
										<span class="inline-flex items-center gap-1.5">
											<CalendarDays class="size-4" />
											{mealPlan.dateRangeLabel}
										</span>
										<span>{mealPlan.items.length} 道菜</span>
									</p>
								</div>
								<Button href={`/app/meal-plans/${mealPlan.id}`} variant="outline" size="sm">
									打开
									<ArrowRight class="size-4" />
								</Button>
							</article>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<CalendarDays class="size-5" />
						本周安排
					</Card.Title>
					<Card.Description>{data.weekRangeLabel}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if data.weekMealPlans.length === 0}
						<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">本周还没有饭单安排。</p>
					{:else}
						{#each data.weekMealPlans as mealPlan}
							<a
								href={`/app/meal-plans/${mealPlan.id}`}
								class="block rounded-md border p-3 text-sm transition hover:border-primary/50 hover:bg-accent/40"
							>
								<span class="block truncate font-medium">{mealPlan.title}</span>
								<span class="mt-1 block text-muted-foreground">{mealPlan.dateRangeLabel}</span>
							</a>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{/if}

	<section class="grid gap-4 lg:grid-cols-3">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ClipboardList class="size-5" />
					最近饭单
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.recentMealPlans.length === 0}
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">饭单会在创建后显示在这里。</p>
				{:else}
					{#each data.recentMealPlans as mealPlan}
						<a
							href={`/app/meal-plans/${mealPlan.id}`}
							class="block rounded-md border p-3 text-sm transition hover:border-primary/50 hover:bg-accent/40"
						>
							<span class="block truncate font-medium">{mealPlan.title}</span>
							<span class="mt-1 block text-muted-foreground">{mealPlan.statusLabel} · {mealPlan.dateRangeLabel}</span>
						</a>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<UsersRound class="size-5" />
					最近对象
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.recentTargets.length === 0}
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">添加对象后，创建饭单时可直接复用偏好。</p>
				{:else}
					{#each data.recentTargets as target}
						<a
							href={`/app/targets/${target.id}`}
							class="block rounded-md border p-3 text-sm transition hover:border-primary/50 hover:bg-accent/40"
						>
							<span class="block truncate font-medium">{target.name}</span>
							<span class="mt-1 block text-muted-foreground">{target.peopleCount} 人 · {target.typeLabel}</span>
						</a>
					{/each}
				{/if}
				<Button href="/app/targets" variant="outline" class="w-full">查看对象</Button>
			</Card.Content>
		</Card.Root>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ChefHat class="size-5" />
					最近菜品
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.recentDishes.length === 0}
					<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">录入菜品后，新饭单可以直接添加它们。</p>
				{:else}
					{#each data.recentDishes as dish}
						<a
							href={`/app/dishes/${dish.id}`}
							class="block rounded-md border p-3 text-sm transition hover:border-primary/50 hover:bg-accent/40"
						>
							<span class="block truncate font-medium">{dish.name}</span>
							<span class="mt-1 block text-muted-foreground">
								{dish.category || '未分类'} · {dish.ingredients.length} 个食材
							</span>
						</a>
					{/each}
				{/if}
				<Button href="/app/dishes" variant="outline" class="w-full">
					<CheckCircle2 class="size-4" />
					查看菜品
				</Button>
			</Card.Content>
		</Card.Root>
	</section>
</main>
