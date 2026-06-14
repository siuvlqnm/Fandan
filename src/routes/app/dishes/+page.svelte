<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ChefHat, ClipboardPlus, ListChecks, Plus, Search, Tags } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>菜品库 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<div class="space-y-2">
			<Button href="/app" variant="ghost" size="sm" class="h-9 justify-start px-0 text-muted-foreground">
				<ArrowLeft class="size-4" />
				返回工作台
			</Button>
			<p class="app-chip bg-secondary text-primary">菜品库</p>
			<h1 class="text-3xl font-semibold leading-tight">维护可复用菜品</h1>
			<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">
				保存常做菜、食材和简单做法。之后创建饭单和购物清单时会直接复用这些菜品。
			</p>
		</div>
		<Button href="/app/dishes/new" class="h-12 rounded-2xl">
			<Plus class="size-4" />
			新建菜品
		</Button>
	</section>

	<form method="get" class="app-panel space-y-4 p-4">
		<div class="space-y-2">
			<Label for="dish-search">搜索</Label>
			<div class="relative">
				<Search class="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
				<Input
					id="dish-search"
					name="q"
					value={data.filters.q}
					placeholder="菜名、食材或标签"
					class="app-input pl-9"
				/>
			</div>
		</div>
		<div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
			<div class="space-y-2">
				<Label for="dish-category">分类</Label>
				<select id="dish-category" name="category" class="app-input h-11 text-sm">
					{#each data.categoryOptions as option}
						<option value={option.value} selected={data.filters.category === option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			<Button type="submit" variant="outline" class="h-11 rounded-xl bg-white">筛选</Button>
		</div>
	</form>

	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="space-y-3">
		<div class="flex items-end justify-between gap-3">
			<div>
				<h2 class="text-xl font-semibold">菜品列表</h2>
				<p class="text-sm text-muted-foreground">{data.dishes.length} 道可复用菜品</p>
			</div>
		</div>

		{#if data.dishes.length === 0}
			<div class="app-panel space-y-4 p-5 text-center">
				<ChefHat class="mx-auto size-8 text-primary" />
				<div class="space-y-1">
					<h3 class="text-xl font-semibold">还没有匹配的菜品</h3>
					<p class="text-sm leading-6 text-muted-foreground">可以先创建只有菜名的菜品，食材和做法之后再慢慢补。</p>
				</div>
				<Button href="/app/dishes/new" class="h-12 rounded-2xl">
					<Plus class="size-4" />
					新建菜品
				</Button>
			</div>
		{:else}
			<div class="app-panel divide-y divide-border/70 overflow-hidden">
				{#each data.dishes as dish}
					<article class="space-y-4 p-4">
						<a href={`/app/dishes/${dish.id}`} class="flex items-start gap-3">
							<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
								<ChefHat class="size-5" />
							</span>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate text-lg font-semibold">{dish.name}</span>
								<span class="block text-sm text-muted-foreground">{dish.category || '未分类'} · {dish.ingredients.length} 种食材</span>
							</span>
						</a>

						<div class="grid gap-2 text-sm md:grid-cols-2">
							<p class="rounded-2xl border border-border/80 bg-white p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<ListChecks class="size-4" />
									食材
								</span>
								<span class="line-clamp-2">
									{dish.ingredients.length > 0 ? dish.ingredients.map((ingredient) => ingredient.name).join('、') : '暂无食材'}
								</span>
							</p>
							<p class="rounded-2xl border border-border/80 bg-white p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<Tags class="size-4" />
									标签
								</span>
								<span class="line-clamp-2">{dish.tags.length > 0 ? dish.tags.join('、') : '暂无标签'}</span>
							</p>
						</div>

						<p class="line-clamp-2 text-sm leading-6 text-muted-foreground">
							做法：{dish.instructions || '暂无做法记录'}
						</p>

						<div class="grid grid-cols-[1fr_1fr_auto] gap-2">
							<Button href={`/app/dishes/${dish.id}`} variant="outline" size="sm" class="rounded-xl bg-white">编辑</Button>
							<Button href={`/app/meal-plans/new?dishId=${dish.id}`} variant="ghost" size="sm" class="rounded-xl">
								<ClipboardPlus class="size-4" />
								加入饭单
							</Button>
							<form method="post" action="?/delete" use:enhanceWithFeedback>
								<input type="hidden" name="id" value={dish.id} />
								<Button
									type="submit"
									variant="destructive"
									size="icon-sm"
									class="rounded-xl"
									aria-label={`删除菜品「${dish.name}」`}
									data-confirm={`删除菜品「${dish.name}」？它会从菜品库移除。`}
									data-pending-label="删除中..."
								>
									删除
								</Button>
							</form>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>
