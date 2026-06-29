<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import breakfastImage from '$lib/assets/meal-ui/breakfast.jpg';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import snackImage from '$lib/assets/meal-ui/snack.jpg';
	import { ArrowRight, CookingPot, Plus, Search, SlidersHorizontal, Soup, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dishImages = [lunchImage, dinnerImage, breakfastImage, snackImage];
	const featuredDish = $derived(data.dishes[0] ?? null);
	const dishImage = (index: number) => dishImages[index % dishImages.length];
</script>

<svelte:head>
	<title>常做菜 / 饭单</title>
</svelte:head>

<main class="app-client-page app-bottom-safe">
	<header class="app-topbar">
		<a href="/app" class="app-brand">
			<span class="app-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<span class="block text-2xl font-bold">常做菜</span>
				<span class="block truncate text-sm text-muted-foreground">家里顺手的好味道</span>
			</span>
		</a>
		<Button href="/app/dishes/new" class="app-icon-action" aria-label="新增常做菜">
			<Plus class="size-5" />
		</Button>
	</header>

	<section class="space-y-3">
		<p class="app-chip bg-white/80 text-muted-foreground">
			<CookingPot class="size-3.5 text-primary" />
			{data.total > 0 ? `${data.total} 道常做菜` : '先记下一道常做菜'}
		</p>
		<div class="space-y-2">
			<h1 class="text-4xl font-black leading-[1.06] tracking-normal">从熟悉的菜里挑</h1>
			<p class="text-base leading-6 text-muted-foreground">不用每次重新想。常吃、好买、适合今天的菜会先浮上来。</p>
		</div>
	</section>

	{#if featuredDish}
		<section class="app-hero">
			<div class="grid grid-cols-[minmax(0,1fr)_8rem]">
				<div class="min-w-0 space-y-3 p-4">
					<p class="app-chip bg-accent text-accent-foreground">今天可用</p>
					<div>
						<h2 class="truncate text-2xl font-bold">{featuredDish.name}</h2>
						<p class="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
							{featuredDish.category || '家常菜'} · {featuredDish.ingredients.length} 种食材 · 可直接加入下一顿
						</p>
					</div>
					<Button href={`/app/meal-plans/new?dishId=${featuredDish.id}`} class="h-11 rounded-full px-4">
						安排这道 <ArrowRight class="size-4" />
					</Button>
				</div>
				<img src={lunchImage} alt="" class="h-full min-h-40 w-full object-cover [mask-image:linear-gradient(90deg,transparent,black_25%)]" />
			</div>
		</section>
	{/if}

	<form method="get" class="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2">
		<label class="flex h-11 min-w-0 items-center gap-2 rounded-full border border-border/80 bg-white/85 px-3 shadow-sm">
			<Search class="size-4 shrink-0 text-muted-foreground" />
			<Input
				id="dish-search"
				name="q"
				value={data.filters.q}
				placeholder="搜菜名、食材、口味"
				class="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0"
			/>
		</label>
		<Button type="submit" variant="outline" class="size-11 rounded-full bg-white" aria-label="搜索常做菜">
			<SlidersHorizontal class="size-4" />
		</Button>
	</form>

	{#if data.total > 5}
		<div class="app-segmented grid-cols-3">
			{#each data.categoryOptions.slice(0, 3) as option}
				<a href={option.value === 'all' ? '/app/dishes' : `/app/dishes?category=${encodeURIComponent(String(option.value))}`} class="app-segment {data.filters.category === option.value ? 'app-segment-active' : ''}">
					{option.label}
				</a>
			{/each}
		</div>
	{/if}

	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="app-section-title">
		<div>
			<h2>今天可选</h2>
			<p>{data.dishes.length} 道菜，按家里习惯继续用</p>
		</div>
		<Button href="/app/dishes/new" variant="outline" class="h-11 rounded-full bg-white px-4">
			<Plus class="size-4" />
			新增
		</Button>
	</section>

	<section class="grid gap-2">
		{#if data.dishes.length === 0}
			<div class="app-hero space-y-4 p-5 text-center">
				<Soup class="mx-auto size-9 text-primary" />
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">{data.total === 0 ? '还没有常做菜' : '没有找到这道菜'}</h2>
					<p class="text-sm leading-6 text-muted-foreground">{data.total === 0 ? '先记下一道家里常吃的菜，食材和做法以后可以慢慢补。' : '换个关键词，或者回到全部常做菜看看。'}</p>
				</div>
				<Button href={data.total === 0 ? '/app/dishes/new' : '/app/dishes'} class="h-12 rounded-full px-5">
					{data.total === 0 ? '新增常做菜' : '查看全部'}
				</Button>
			</div>
		{:else}
			{#each data.dishes as dish, index}
				<article class="app-meal-card grid-cols-[5.4rem_minmax(0,1fr)]" data-testid={`dish-${dish.id}`}>
					<a href={`/app/dishes/${dish.id}`} class="app-meal-card-image min-h-28"><img src={dishImage(index)} alt="" /></a>
					<div class="min-w-0 space-y-3 p-3">
						<a href={`/app/dishes/${dish.id}`} class="block min-w-0">
							<span class="block truncate text-lg font-bold">{dish.name}</span>
							<span class="mt-1 block truncate text-sm text-muted-foreground">{dish.category || '未分类'} · {dish.ingredients.length} 种食材</span>
							<span class="mt-1 block truncate text-xs text-muted-foreground">
								{dish.ingredients.length > 0 ? dish.ingredients.map((ingredient) => ingredient.name).join('、') : '还没有食材，之后补也可以'}
							</span>
						</a>
						<div class="grid grid-cols-[1fr_auto] gap-2">
							<Button href={`/app/meal-plans/new?dishId=${dish.id}`} variant="outline" class="h-10 rounded-full bg-white">
								加入下一顿
							</Button>
							<form method="post" action="?/delete" use:enhanceWithFeedback>
								<input type="hidden" name="id" value={dish.id} />
								<Button
									type="submit"
									variant="ghost"
									class="size-10 rounded-full text-destructive"
									aria-label={`删除常做菜「${dish.name}」`}
									data-confirm={`删除常做菜「${dish.name}」？`}
									data-pending-label="删除中..."
								>
									<Trash2 class="size-4" />
								</Button>
							</form>
						</div>
					</div>
				</article>
			{/each}
		{/if}
	</section>
</main>

<MobileBottomNav />
