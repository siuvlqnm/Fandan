<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, ClipboardPlus, ListChecks } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dish = $derived(data.dish as NonNullable<PageData['dish']>);
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const message = $derived(form?.message);
</script>

<svelte:head>
	<title>{dish.name} / 菜品库 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<Button href="/app/dishes" variant="ghost" size="sm" class="px-0">
				<ArrowLeft class="size-4" />
				返回菜品库
			</Button>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">{dish.name}</h1>
			<p class="max-w-2xl text-muted-foreground">
				维护食材、标签和简单做法。后续饭单和购物清单会从这里读取菜品信息。
			</p>
		</div>
		<Button href={`/app/meal-plans/new?dishId=${dish.id}`}>
			<ClipboardPlus class="size-4" />
			加入饭单
		</Button>
	</section>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title>编辑菜品</Card.Title>
				<Card.Description>保存后会立即用于后续创建饭单和购物清单。</Card.Description>
			</Card.Header>
			<Card.Content>
				<DishForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ListChecks class="size-5" />
						食材摘要
					</Card.Title>
					<Card.Description>{dish.ingredients.length} 种食材</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if dish.ingredients.length === 0}
						<p class="rounded-md border p-3 text-sm text-muted-foreground">暂无食材。</p>
					{:else}
						{#each dish.ingredients as ingredient}
							<div class="rounded-md border p-3 text-sm">
								<p class="font-medium">{ingredient.name}</p>
								<p class="text-muted-foreground">
									{ingredient.quantity || '未填数量'} {ingredient.unit || ''} · {ingredient.category || '未分类'}
								</p>
							</div>
						{/each}
					{/if}
					<Button href={`/app/meal-plans/new?dishId=${dish.id}`} variant="outline" class="w-full">
						<ClipboardPlus class="size-4" />
						用此菜新建饭单
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title>删除菜品</Card.Title>
					<Card.Description>删除后会移除菜品库记录和它的食材。</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/delete">
						<Button type="submit" variant="destructive" class="w-full">删除菜品</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</main>
