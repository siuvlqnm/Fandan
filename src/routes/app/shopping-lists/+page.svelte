<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import basketImage from '$lib/assets/meal-ui/basket.jpg';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import { ArrowRight, CheckCircle2, Plus, Search, ShoppingBasket } from 'lucide-svelte';
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
	const listStateLabel = (list: ShoppingListRow) =>
		list.completed ? '已买完' : list.totalCount === 0 ? '待补充' : `${list.pendingCount} 待买`;
	const listStateClass = (list: ShoppingListRow) =>
		list.completed ? 'fd-state-pill green' : list.totalCount === 0 ? 'fd-state-pill muted' : 'fd-state-pill attention';
</script>

<svelte:head>
	<title>买菜 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="shopping-lists-list">
	<header class="fd-topbar">
		<a href="/app" class="fd-brand">
			<span class="fd-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<h1>买菜</h1>
				<p>少跑一趟，少漏一样</p>
			</span>
		</a>
		<div class="fd-actions">
			<a href="/app/meal-plans" class="fd-icon-button" aria-label="从饭单生成购物清单"><Plus class="size-5" /></a>
			<a href="/app/settings" class="fd-avatar"><img src={avatarImage} alt="" /></a>
		</div>
	</header>

	<section class="fd-page-title">
		<span class="fd-eyebrow"><ShoppingBasket class="size-3.5" /> {firstCurrentList ? `还缺 ${currentPendingCount} 件` : '当前没有待买'}</span>
		<h2>今天要买什么？</h2>
		<p>从已安排的饭自动生成，买完就勾掉。临时想起的也能随手加。</p>
	</section>

	{#if firstCurrentList}
		<section class="fd-hero-card" aria-label="当前购物清单">
			<div class="fd-hero-copy min-w-0">
				<h3>{firstCurrentList.title}</h3>
				<p>来自 {firstCurrentList.mealPlan.title} · 待买 {firstCurrentList.pendingCount} 项 · 已买 {firstCurrentList.checkedCount} 项</p>
				<div class="mini">
					<span class="fd-pill orange">待买 {firstCurrentList.pendingCount}</span>
					<span class="fd-pill green">已买 {firstCurrentList.checkedCount}</span>
					<span class="fd-pill">{dateRangeLabel(firstCurrentList)}</span>
				</div>
			</div>
			<div class="fd-hero-media"><img src={basketImage} alt="购物篮" /></div>
		</section>
	{:else}
		<section class="fd-hero-card" aria-label="买菜建议">
			<div class="fd-hero-copy min-w-0">
				<h3>先安排一顿饭</h3>
				<p>安排饭后可以一键生成购物清单，买完进详情勾掉。</p>
				<div class="mini">
					<a href="/app/meal-plans/new" class="fd-primary-btn" style="height:36px;font-size:13px;padding:0 14px;">安排一顿饭 <ArrowRight class="size-4" /></a>
				</div>
			</div>
			<div class="fd-hero-media"><img src={basketImage} alt="购物篮" /></div>
		</section>
	{/if}

	<div class="fd-segmented cols-3" style="margin-top:14px;" aria-label="购物清单状态">
		{#each statusOptions as option}
			<a href={withFilters({ status: option.id })} class="fd-segment {data.filters.status === option.id ? 'active' : ''}" aria-current={data.filters.status === option.id ? 'page' : undefined}>
				{option.label} <span style="font-size:11px;opacity:.7;">{option.count}</span>
			</a>
		{/each}
	</div>

	<details class="fd-soft-card" style="margin-top:12px;padding:0;">
		<summary style="display:flex;min-height:48px;cursor:pointer;list-style:none;align-items:center;gap:8px;padding:12px 16px;font-size:14px;font-weight:700;color:#4f4943;">
			<Search class="size-4" style="color:var(--fd-green);" /> 找一份清单
			<span style="margin-left:auto;font-size:12px;color:var(--fd-muted);">日期 / 来源饭单</span>
		</summary>
		<form method="get" style="border-top:1px solid var(--fd-line-soft);padding:16px;display:grid;gap:12px;">
			<input type="hidden" name="status" value={data.filters.status} />
			<div class="fd-segmented cols-3">
				{#each dateOptions as option}
					<a href={withFilters({ date: option.id })} class="fd-segment {data.filters.date === option.id ? 'active' : ''}">{option.label}</a>
				{/each}
			</div>
			<label class="fd-search">
				<Search class="size-4" />
				<input type="search" name="q" value={data.filters.q} placeholder="清单或来源饭单" />
			</label>
			<select name="mealPlanId" class="fd-select">
				<option value="" selected={!data.filters.mealPlanId}>全部饭单</option>
				{#each data.mealPlanOptions as option}
					<option value={option.id} selected={data.filters.mealPlanId === option.id}>{option.title}</option>
				{/each}
			</select>
			<input type="hidden" name="date" value={data.filters.date} />
			<button type="submit" class="fd-ghost-btn block"><Search class="size-4" /> 筛一下</button>
		</form>
	</details>

	<section class="fd-section-head">
		<div>
			<h3>{data.filters.status === 'history' ? '最近买过' : '今天的清单'}</h3>
			<p>{data.lists.length} 份清单 · {data.filters.status === 'history' ? '上周完成的' : '按饭分组，照着买'}</p>
		</div>
	</section>

	{#if data.lists.length === 0}
		<div class="fd-empty" style="margin-top:14px;">
			<span class="emoji"><ShoppingBasket class="size-8" /></span>
			<h3>{data.stats.total === 0 ? '还没有购物清单' : '没有匹配的清单'}</h3>
			<p>从这顿饭生成买菜清单后，会自动出现在这里。</p>
			<a href="/app/meal-plans/new" class="fd-primary-btn lg block" style="margin-top:6px;">
				<Plus class="size-4" /> 安排一顿饭
			</a>
		</div>
	{:else}
		<section class="fd-card-list" data-testid="shopping-list-center">
			{#each data.lists as list (list.id)}
				<a href={`/app/shopping-lists/${list.id}`} class="fd-soft-card" style="display:grid;gap:9px;text-decoration:none;{list.completed ? 'opacity:.78;' : ''}" data-testid={`shopping-list-row-${list.id}`}>
					<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
						<div class="min-w-0">
							<strong style="font-size:17px;font-weight:850;display:block;truncate">{list.title}</strong>
							<span style="display:block;margin-top:2px;color:var(--fd-muted);font-size:12px;">{dateRangeLabel(list)} · 来自 {list.mealPlan.title}</span>
						</div>
						<span class={listStateClass(list)}>{listStateLabel(list)}</span>
					</div>
					<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
						<span class="fd-pill">{list.totalCount} 项</span>
						<span class="fd-pill green">已买 {list.checkedCount}</span>
						{#if list.completed}<span class="fd-pill"><CheckCircle2 class="size-3.5" /> 完成</span>{/if}
					</div>
					<div style="height:8px;border-radius:999px;background:var(--fd-line);overflow:hidden;">
						<div style="width:{list.progressPercent}%;height:100%;background:var(--fd-green);"></div>
					</div>
				</a>
			{/each}
		</section>
	{/if}
</main>

<a href="/app/meal-plans" class="fd-fab" aria-label="生成购物清单"><Plus class="size-6" /></a>

<MobileBottomNav />
