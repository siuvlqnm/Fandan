<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import basketImage from '$lib/assets/meal-ui/basket.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import { ArrowRight, CheckCircle2, ClipboardList, Plus, Search, ShoppingBasket } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type StatusFilter = PageData['filters']['status'];
	type DateFilter = PageData['filters']['date'];
	type ShoppingListRow = PageData['lists'][number];

	const firstCurrentList = $derived(data.lists.find((list) => !list.completed) ?? null);
	const currentPendingCount = $derived(firstCurrentList?.pendingCount ?? 0);
	const statusOptions = $derived([
		{ id: 'current' as const, label: '待买', count: data.stats.current },
		{ id: 'history' as const, label: '历史', count: data.stats.history },
		{ id: 'all' as const, label: '全部', count: data.stats.total }
	]);
	const dateOptions = [
		{ id: 'all' as const, label: '全部日期' },
		{ id: 'today' as const, label: '今天' },
		{ id: 'week' as const, label: '本周' }
	];
	const withFilters = (changes: Partial<{ status: StatusFilter; date: DateFilter; mealPlanId: string; q: string }>) => {
		const params = new URLSearchParams();
		params.set('status', changes.status ?? data.filters.status);
		params.set('date', changes.date ?? data.filters.date);
		const mealPlanId = changes.mealPlanId ?? data.filters.mealPlanId;
		const q = changes.q ?? data.filters.q;
		if (mealPlanId) params.set('mealPlanId', mealPlanId);
		if (q) params.set('q', q);
		return `?${params.toString()}`;
	};
	const dateRangeLabel = (list: ShoppingListRow) => {
		const start = list.mealPlan.startDate ?? list.dateStart;
		const end = list.mealPlan.endDate ?? list.dateEnd;

		if (!start && !end) return '未设置日期';
		if (!end || start === end) return start ?? end ?? '未设置日期';
		return `${start} - ${end}`;
	};
	const listStateLabel = (list: ShoppingListRow) => (list.completed ? '已买完' : list.totalCount === 0 ? '待补充' : `待买 ${list.pendingCount}`);
</script>

<svelte:head>
	<title>买菜 / 饭单</title>
</svelte:head>

<main class="app-client-page app-bottom-safe">
	<header class="app-topbar">
		<a href="/app" class="app-brand">
			<span class="app-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<span class="block text-2xl font-bold">买菜</span>
				<span class="block truncate text-sm text-muted-foreground">少跑一趟，少漏一样</span>
			</span>
		</a>
		<Button href="/app/meal-plans" class="app-icon-action" aria-label="从饭单生成购物清单">
			<ClipboardList class="size-5" />
		</Button>
	</header>

	<section class="space-y-3">
		<p class="app-chip bg-white/80 text-muted-foreground">
			<ShoppingBasket class="size-3.5 text-primary" />
			{firstCurrentList ? `还缺 ${currentPendingCount} 件` : '当前没有待买'}
		</p>
		<div class="space-y-2">
			<h1 class="text-4xl font-black leading-[1.06] tracking-normal">今天要买什么？</h1>
			<p class="text-base leading-6 text-muted-foreground">从已安排的饭自动生成。买完进入详情勾掉，历史清单会自动收好。</p>
		</div>
	</section>

	<section class="app-hero">
		<div class="grid grid-cols-[minmax(0,1fr)_8rem]">
			<div class="min-w-0 space-y-3 p-4">
				<p class="app-chip bg-accent text-accent-foreground">{firstCurrentList ? '当前清单' : '买菜建议'}</p>
				<div>
					<h2 class="truncate text-2xl font-bold">{firstCurrentList?.title ?? '先安排一顿饭'}</h2>
					<p class="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
						{#if firstCurrentList}
							来自 {firstCurrentList.mealPlan.title} · 待买 {firstCurrentList.pendingCount} 项 · 已买 {firstCurrentList.checkedCount} 项
						{:else}
							安排饭后可以一键生成购物清单。
						{/if}
					</p>
				</div>
				<Button href={firstCurrentList ? `/app/shopping-lists/${firstCurrentList.id}` : '/app/meal-plans/new'} class="h-11 rounded-full px-4">
					{firstCurrentList ? '去勾选' : '安排一顿饭'} <ArrowRight class="size-4" />
				</Button>
			</div>
			<img src={basketImage} alt="" class="h-full min-h-40 w-full object-cover [mask-image:linear-gradient(90deg,transparent,black_25%)]" />
		</div>
	</section>

	<nav class="app-segmented grid-cols-3" aria-label="购物清单状态">
		{#each statusOptions as option}
			<a href={withFilters({ status: option.id })} class="app-segment {data.filters.status === option.id ? 'app-segment-active' : ''}" aria-current={data.filters.status === option.id ? 'page' : undefined}>
				<span>{option.label}</span>
				<span class="ml-1 text-xs opacity-75">{option.count}</span>
			</a>
		{/each}
	</nav>

	<details class="app-panel overflow-hidden">
		<summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
			<Search class="size-4 text-primary" />
			找一份清单
			<span class="ml-auto text-xs text-muted-foreground">日期 / 来源饭单</span>
		</summary>
		<form method="get" class="space-y-3 border-t border-border/70 p-4">
			<input type="hidden" name="status" value={data.filters.status} />
			<div class="grid grid-cols-3 gap-2">
				{#each dateOptions as option}
					<a href={withFilters({ date: option.id })} class="app-segment {data.filters.date === option.id ? 'app-segment-active' : 'bg-muted/45'}">
						{option.label}
					</a>
				{/each}
			</div>
			<label class="flex h-11 min-w-0 items-center gap-2 rounded-full border border-border/80 bg-white px-3">
				<Search class="size-4 shrink-0 text-muted-foreground" />
				<Input name="q" value={data.filters.q} placeholder="清单或来源饭单" class="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0" />
			</label>
			<select name="mealPlanId" class="app-input h-11 text-sm">
				<option value="" selected={!data.filters.mealPlanId}>全部饭单</option>
				{#each data.mealPlanOptions as option}
					<option value={option.id} selected={data.filters.mealPlanId === option.id}>{option.title}</option>
				{/each}
			</select>
			<input type="hidden" name="date" value={data.filters.date} />
			<Button type="submit" variant="outline" class="h-11 w-full rounded-full bg-white">
				<Search class="size-4" />
				筛一下
			</Button>
		</form>
	</details>

	<section class="app-section-title">
		<div>
			<h2>{data.filters.status === 'history' ? '买过的清单' : '待买清单'}</h2>
			<p>{data.lists.length} 份清单</p>
		</div>
	</section>

	<section class="grid gap-2" data-testid="shopping-list-center">
		{#if data.lists.length === 0}
			<div class="app-hero space-y-4 p-5 text-center">
				<ShoppingBasket class="mx-auto size-9 text-primary" />
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">{data.stats.total === 0 ? '还没有购物清单' : '没有匹配的清单'}</h2>
					<p class="text-sm leading-6 text-muted-foreground">从饭单详情生成购物清单后，会自动出现在这里。</p>
				</div>
				<Button href="/app/meal-plans/new" class="h-12 rounded-full px-5">
					<Plus class="size-4" />
					安排一顿饭
				</Button>
			</div>
		{:else}
			{#each data.lists as list}
				<a href={`/app/shopping-lists/${list.id}`} class="app-list-row" data-testid={`shopping-list-row-${list.id}`}>
					<span class="flex size-12 shrink-0 items-center justify-center rounded-2xl {list.completed ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'}">
						{#if list.completed}<CheckCircle2 class="size-6" />{:else}<ShoppingBasket class="size-6" />{/if}
					</span>
					<span class="min-w-0 flex-1">
						<span class="flex min-w-0 items-center gap-2">
							<span class="truncate text-lg font-semibold">{list.title}</span>
							<span class="app-chip shrink-0 {list.completed ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'}">{listStateLabel(list)}</span>
						</span>
						<span class="mt-1 block truncate text-sm text-muted-foreground">来自 {list.mealPlan.title} · {dateRangeLabel(list)}</span>
						<span class="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
							<span class="block h-full rounded-full bg-primary" style={`width: ${list.progressPercent}%`}></span>
						</span>
					</span>
					<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
				</a>
			{/each}
		{/if}
	</section>
</main>

<MobileBottomNav />
