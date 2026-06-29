<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import breakfastImage from '$lib/assets/meal-ui/breakfast.jpg';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import snackImage from '$lib/assets/meal-ui/snack.jpg';
	import { ArrowRight, Plus, Search, Soup, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dishImages = [lunchImage, dinnerImage, breakfastImage, snackImage];
	const featuredDish = $derived(data.dishes[0] ?? null);
	const dishImage = (index: number) => dishImages[index % dishImages.length];
</script>

<svelte:head>
	<title>常做菜 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="dishes-list">
	<header class="fd-topbar">
		<a href="/app" class="fd-brand">
			<span class="fd-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<h1>常做菜</h1>
				<p>家里顺手的好味道</p>
			</span>
		</a>
		<div class="fd-actions">
			<a href="/app/dishes/new" class="fd-icon-button" aria-label="新增常做菜"><Plus class="size-5" /></a>
			<a href="/app/settings" class="fd-avatar"><img src={avatarImage} alt="" /></a>
		</div>
	</header>

	<section class="fd-page-title">
		<span class="fd-eyebrow green">{data.total > 0 ? `${data.total} 道可直接用` : '先记下一道常做菜'}</span>
		<h2>从熟悉的菜里挑</h2>
		<p>不用每次重新想。常吃、好买、适合今天的菜会先浮上来。</p>
	</section>

	{#if featuredDish}
		<section class="fd-hero-card" aria-label="今天可用">
			<div class="fd-hero-copy min-w-0">
				<h3>{featuredDish.name}</h3>
				<p>{featuredDish.category || '家常菜'} · {featuredDish.ingredients.length} 种食材 · 可直接加入下一顿</p>
				<div class="mini">
					<span class="fd-pill">{featuredDish.baseServings} 人份</span>
					<span class="fd-pill green">家常</span>
					<span class="fd-pill">常被选择</span>
				</div>
			</div>
			<div class="fd-hero-media"><img src={lunchImage} alt={featuredDish.name} /></div>
		</section>
	{/if}

	<form method="get" class="fd-search-row" style="margin-top:14px;">
		<label class="fd-search">
			<Search class="size-4" />
			<input type="search" name="q" value={data.filters.q} placeholder="搜菜名、食材、口味" />
		</label>
		<button type="submit" class="fd-round-btn" style="width:48px;height:48px;font-size:18px;" aria-label="搜索"><Search class="size-5" /></button>
	</form>

	{#if data.total > 5 && data.categoryOptions.length > 1}
		<div class="fd-segmented" style="margin-top:12px;" aria-label="常做菜分类">
			{#each data.categoryOptions.slice(0, 4) as option}
				<a href={option.value === 'all' ? '/app/dishes' : `/app/dishes?category=${encodeURIComponent(String(option.value))}`} class="fd-segment {data.filters.category === option.value ? 'active' : ''}">
					{option.label}
				</a>
			{/each}
		</div>
	{/if}

	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	<section class="fd-section-head">
		<div>
			<h3>今天可用</h3>
			<p>{data.dishes.length} 道菜，按家里习惯继续用</p>
		</div>
		<a href="/app/dishes/new" class="fd-ghost-btn"><Plus class="size-4" /> 新增</a>
	</section>

	{#if data.dishes.length === 0}
		<div class="fd-empty" style="margin-top:14px;">
			<span class="emoji"><Soup class="size-8" /></span>
			<h3>{data.total === 0 ? '还没有常做菜' : '没有找到这道菜'}</h3>
			<p>{data.total === 0 ? '先记下一道家里常吃的菜，食材和做法以后可以慢慢补。' : '换个关键词，或者回到全部常做菜看看。'}</p>
			<a href={data.total === 0 ? '/app/dishes/new' : '/app/dishes'} class="fd-primary-btn lg block" style="margin-top:6px;">
				{data.total === 0 ? '新增常做菜' : '查看全部'}
			</a>
		</div>
	{:else}
		<section class="fd-card-list">
			{#each data.dishes as dish, index}
				<article class="fd-list-card" data-testid={`dish-${dish.id}`}>
					<span class="thumb"><img src={dishImage(index)} alt={dish.name} /></span>
					<span class="list-copy min-w-0">
						<a href={`/app/dishes/${dish.id}`} class="min-w-0">
							<strong>{dish.name}</strong>
							<span class="sub">{dish.category || '未分类'} · {dish.ingredients.length} 种食材</span>
							<small>{dish.ingredients.length > 0 ? dish.ingredients.map((ingredient) => ingredient.name).join('、') : '还没有食材，之后补也可以'}</small>
						</a>
						<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
							<a href={`/app/meal-plans/new?dishId=${dish.id}`} class="fd-ghost-btn" style="height:34px;font-size:12px;padding:0 12px;">加入下一顿 <ArrowRight class="size-3.5" /></a>
							<form method="post" action="?/delete" use:enhanceWithFeedback>
								<input type="hidden" name="id" value={dish.id} />
								<button type="submit" class="fd-icon-del" style="width:34px;height:34px;font-size:16px;" aria-label={`删除常做菜「${dish.name}」`} data-confirm={`删除常做菜「${dish.name}」？`} data-pending-label="删除中...">
									<Trash2 class="size-4" />
								</button>
							</form>
						</div>
					</span>
				</article>
			{/each}
		</section>
	{/if}
</main>

<a href="/app/dishes/new" class="fd-fab" aria-label="新增常做菜"><Plus class="size-6" /></a>

<MobileBottomNav />
