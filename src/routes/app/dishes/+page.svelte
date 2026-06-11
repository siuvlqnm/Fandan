<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ChefHat, ClipboardPlus, ListChecks, Plus, Search, Tags } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>菜品库 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">菜品库</p>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">维护可复用菜品</h1>
			<p class="max-w-2xl text-muted-foreground">
				保存常做菜、食材和简单做法。之后创建饭单和购物清单时会直接复用这些菜品。
			</p>
		</div>
		<Button href="/app/dishes/new">
			<Plus class="size-4" />
			新建菜品
		</Button>
	</section>

	<Card.Root class="rounded-lg">
		<Card.Content class="pt-6">
			<form method="get" class="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
				<div class="space-y-2">
					<Label for="dish-search">搜索</Label>
					<div class="relative">
						<Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
						<Input
							id="dish-search"
							name="q"
							value={data.filters.q}
							placeholder="菜名、食材或标签"
							class="pl-8"
						/>
					</div>
				</div>
				<div class="space-y-2">
					<Label for="dish-category">分类</Label>
					<select
						id="dish-category"
						name="category"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-3 md:text-sm"
					>
						{#each data.categoryOptions as option}
							<option value={option.value} selected={data.filters.category === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<Button type="submit" variant="outline">筛选</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if form?.message}
		<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="grid gap-4 lg:grid-cols-2">
		{#if data.dishes.length === 0}
			<Card.Root class="rounded-lg lg:col-span-2">
				<Card.Header>
					<Card.Title>还没有匹配的菜品</Card.Title>
					<Card.Description>可以先创建只有菜名的菜品，食材和做法之后再慢慢补。</Card.Description>
				</Card.Header>
				<Card.Content>
					<Button href="/app/dishes/new">
						<Plus class="size-4" />
						新建菜品
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each data.dishes as dish}
				<Card.Root class="rounded-lg">
					<Card.Header>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<Card.Title class="truncate">{dish.name}</Card.Title>
								<Card.Description>{dish.category || '未分类'} · {dish.ingredients.length} 种食材</Card.Description>
							</div>
							<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
								<ChefHat class="size-4" />
							</span>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid gap-3 text-sm md:grid-cols-2">
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<ListChecks class="size-4" />
									食材
								</span>
								<span>
									{dish.ingredients.length > 0 ? dish.ingredients.map((ingredient) => ingredient.name).join('、') : '暂无食材'}
								</span>
							</p>
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<Tags class="size-4" />
									标签
								</span>
								<span>{dish.tags.length > 0 ? dish.tags.join('、') : '暂无标签'}</span>
							</p>
						</div>
						<p class="line-clamp-2 text-sm text-muted-foreground">
							做法：{dish.instructions || '暂无做法记录'}
						</p>
						<div class="flex flex-wrap gap-2">
							<Button href={`/app/dishes/${dish.id}`} variant="outline" size="sm">编辑</Button>
							<Button href={`/app/meal-plans/new?dishId=${dish.id}`} variant="ghost" size="sm">
								<ClipboardPlus class="size-4" />
								加入饭单
							</Button>
							<form method="post" action="?/delete" use:enhanceWithFeedback class="ml-auto">
								<input type="hidden" name="id" value={dish.id} />
								<Button
									type="submit"
									variant="destructive"
									size="sm"
									data-confirm={`删除菜品「${dish.name}」？它会从菜品库移除。`}
									data-pending-label="删除中..."
								>
									删除
								</Button>
							</form>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</section>
</main>
