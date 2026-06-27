<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Search, ShoppingBag } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type StatusFilter = PageData['filters']['status'];
	type DateFilter = PageData['filters']['date'];
	type ShoppingListRow = PageData['lists'][number];

	const statusOptions = $derived([
		{ id: 'current' as const, label: '待买', count: data.stats.current },
		{ id: 'history' as const, label: '历史', count: data.stats.history },
		{ id: 'all' as const, label: '全部', count: data.stats.total }
	]);
	const dateOptions = $derived([
		{ id: 'all' as const, label: '全部日期' },
		{ id: 'today' as const, label: '今天' },
		{ id: 'week' as const, label: '本周' }
	]);
	const firstCurrentList = $derived(data.lists.find((list) => !list.completed) ?? null);
	const listStateLabel = (list: ShoppingListRow) => (list.completed ? '历史' : list.totalCount === 0 ? '待完善' : '待买');
	const listPendingLabel = (list: ShoppingListRow) =>
		list.totalCount === 0 ? '还没有购物项' : `待买 ${list.pendingCount} 项`;
	const dateRangeLabel = (list: ShoppingListRow) => {
		const start = list.mealPlan.startDate ?? list.dateStart;
		const end = list.mealPlan.endDate ?? list.dateEnd;

		if (!start && !end) return '未设置日期';
		if (!end || start === end) return start ?? end ?? '未设置日期';
		return `${start} - ${end}`;
	};
	const recentActionLabel = (list: ShoppingListRow) => {
		if (list.recentAction?.actor) {
			return `由 ${list.recentAction.actor.name} ${list.recentAction.action}`;
		}

		return '暂无家庭处理记录';
	};
	const formatActionTime = (value: string | null | undefined) => {
		if (!value) return '';
		const normalized = value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
		return normalized.length >= 16 ? normalized.slice(5, 16) : normalized;
	};
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
	const clearHref = $derived(withFilters({ status: 'current', date: 'all', mealPlanId: '', q: '' }));
</script>

<svelte:head>
	<title>购物清单 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0 space-y-2">
				<p class="app-chip bg-secondary text-primary">购物清单</p>
				<h1 class="break-words text-3xl font-semibold leading-tight">要买的东西，都在这里</h1>
				<p class="text-sm leading-6 text-muted-foreground">默认只看还没买完的清单，完成后的清单会进入历史。</p>
			</div>
			<Button href="/app/meal-plans" class="size-12 shrink-0 rounded-2xl" aria-label="从饭单生成购物清单">
				<ClipboardList class="size-5" />
			</Button>
		</div>

		{#if firstCurrentList}
			<a href={`/app/shopping-lists/${firstCurrentList.id}`} class="app-soft-panel flex min-h-24 items-center gap-3 p-4">
				<span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
					<ShoppingBag class="size-6" />
				</span>
				<span class="min-w-0 flex-1 space-y-1">
					<span class="block text-sm text-muted-foreground">最近清单</span>
					<span class="block truncate text-lg font-semibold">{firstCurrentList.title}</span>
					<span class="block text-sm text-muted-foreground">{listPendingLabel(firstCurrentList)} · {dateRangeLabel(firstCurrentList)}</span>
				</span>
				<ArrowRight class="size-5 shrink-0 text-muted-foreground" />
			</a>
		{/if}
	</section>

	<section class="space-y-3">
		<div class="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1 shadow-sm" aria-label="购物清单状态">
			{#each statusOptions as option}
				<Button
					href={withFilters({ status: option.id })}
					variant={data.filters.status === option.id ? 'default' : 'ghost'}
					class="h-12 rounded-xl px-2 text-sm"
					aria-current={data.filters.status === option.id ? 'page' : undefined}
				>
					<span>{option.label}</span>
					<span class={data.filters.status === option.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}>{option.count}</span>
				</Button>
			{/each}
		</div>

		<form method="get" class="app-panel space-y-4 p-4">
			<input type="hidden" name="status" value={data.filters.status} />
			<div class="grid grid-cols-3 gap-2">
				{#each dateOptions as option}
					<a
						href={withFilters({ date: option.id })}
						class="flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition {data.filters.date === option.id
							? 'bg-secondary text-primary'
							: 'bg-muted/60 text-muted-foreground'}"
					>
						{option.label}
					</a>
				{/each}
			</div>

			<div class="space-y-2">
				<Label for="shopping-list-query">搜索</Label>
				<div class="relative">
					<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="shopping-list-query"
						name="q"
						value={data.filters.q}
						placeholder="清单或来源饭单"
						class="app-input h-11 pl-9"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="shopping-list-meal-plan">来源饭单</Label>
				<select id="shopping-list-meal-plan" name="mealPlanId" class="app-input h-11 text-sm">
					<option value="" selected={!data.filters.mealPlanId}>全部饭单</option>
					{#each data.mealPlanOptions as option}
						<option value={option.id} selected={data.filters.mealPlanId === option.id}>{option.title}</option>
					{/each}
				</select>
			</div>

			<input type="hidden" name="date" value={data.filters.date} />
			<div class="grid grid-cols-[1fr_auto] gap-3">
				<Button type="submit" variant="outline" class="h-11 rounded-2xl bg-white">
					<Search class="size-4" />
					筛选
				</Button>
				<Button href={clearHref} variant="ghost" class="h-11 rounded-2xl px-3">重置</Button>
			</div>
		</form>
	</section>

	<section class="app-panel divide-y divide-border/70 overflow-hidden" data-testid="shopping-list-center">
		{#if data.lists.length === 0}
			<div class="space-y-4 p-5">
				<div class="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
					<ShoppingBag class="size-6" />
				</div>
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">{data.stats.total === 0 ? '还没有购物清单' : '没有匹配的清单'}</h2>
					<p class="text-sm leading-6 text-muted-foreground">从饭单详情生成购物清单后，会自动出现在这里。待买清单和历史清单会分开显示。</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<Button href="/app/meal-plans" variant="outline" class="h-11 rounded-2xl bg-white">
						<ClipboardList class="size-4" />
						去饭单生成
					</Button>
					<Button href="/app/meal-plans/new" class="h-11 rounded-2xl">
						安排一顿饭
					</Button>
				</div>
			</div>
		{:else}
			{#each data.lists as list}
				<article class="p-4" data-testid={`shopping-list-row-${list.id}`}>
					<a href={`/app/shopping-lists/${list.id}`} class="flex items-start gap-3">
						<span class="mt-1 flex size-12 shrink-0 items-center justify-center rounded-2xl {list.completed ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'}">
							{#if list.completed}
								<CheckCircle2 class="size-6" />
							{:else}
								<ShoppingBag class="size-6" />
							{/if}
						</span>
						<span class="min-w-0 flex-1 space-y-2">
							<span class="flex min-w-0 items-center gap-2">
								<span class="truncate text-lg font-semibold">{list.title}</span>
								<span class="app-chip shrink-0 {list.completed ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'}">
									{listStateLabel(list)}
								</span>
							</span>
							<span class="block text-sm leading-6 text-muted-foreground">
								来自 {list.mealPlan.title}
							</span>
							<span class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
								<span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" />{dateRangeLabel(list)}</span>
								<span>{listPendingLabel(list)}</span>
								<span>完成 {list.checkedCount}/{list.totalCount}</span>
							</span>
							<span class="block h-2 overflow-hidden rounded-full bg-muted">
								<span class="block h-full rounded-full bg-primary" style={`width: ${list.progressPercent}%`}></span>
							</span>
							<span class="block text-xs text-muted-foreground">
								{recentActionLabel(list)}{list.recentAction?.at ? ` · ${formatActionTime(list.recentAction.at)}` : ''}
							</span>
						</span>
						<ArrowRight class="mt-7 size-5 shrink-0 text-muted-foreground" />
					</a>
				</article>
			{/each}
		{/if}
	</section>
</main>

<MobileBottomNav />
