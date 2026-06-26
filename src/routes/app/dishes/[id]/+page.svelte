<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
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

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href="/app/dishes" variant="ghost" size="sm" class="h-9 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回菜品库
		</Button>
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">编辑菜品</p>
			<h1 class="text-3xl font-semibold leading-tight">{dish.name}</h1>
			<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">
				维护食材、标签和简单做法。后续饭单和购物清单会从这里读取菜品信息。
			</p>
			<p class="text-xs text-muted-foreground">
				{dish.updatedBy ? `最近由 ${dish.updatedBy.name} 更新` : '历史菜品，暂无操作归属'}
			</p>
		</div>
		<Button href={`/app/meal-plans/new?dishId=${dish.id}`} class="h-12 rounded-2xl">
			<ClipboardPlus class="size-4" />
			加入饭单
		</Button>
	</section>

	<div class="grid gap-4 lg:grid-cols-[1fr_320px]">
		<section class="app-panel space-y-5 p-5">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">菜品资料</h2>
				<p class="text-sm text-muted-foreground">保存后会立即用于后续创建饭单和购物清单。</p>
			</div>
			<DishForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
		</section>

		<div class="space-y-4">
			<section class="app-panel p-5">
				<div class="mb-4 space-y-1">
					<h2 class="flex items-center gap-2 text-xl font-semibold">
						<ListChecks class="size-5" />
						食材摘要
					</h2>
				<p class="text-sm text-muted-foreground">{dish.ingredients.length} 种食材 · 基准 {dish.baseServings} 人份</p>
				{#if !dish.servingBasisConfirmed}
					<p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">旧菜品的基准份数尚未确认，请在左侧核对后保存。</p>
				{/if}
				</div>
				<div class="space-y-3">
					{#if dish.ingredients.length === 0}
						<p class="rounded-2xl border border-border/80 bg-white p-3 text-sm text-muted-foreground">暂无食材。</p>
					{:else}
						{#each dish.ingredients as ingredient}
							<div class="rounded-2xl border border-border/80 bg-white p-3 text-sm">
								<p class="font-medium">{ingredient.name}</p>
								<p class="text-muted-foreground">
									{ingredient.quantity || '未填数量'} {ingredient.unit || ''} · {ingredient.category || '未分类'}
								</p>
							</div>
						{/each}
					{/if}
					<Button href={`/app/meal-plans/new?dishId=${dish.id}`} variant="outline" class="h-12 w-full rounded-2xl bg-white">
						<ClipboardPlus class="size-4" />
						用此菜新建饭单
					</Button>
				</div>
			</section>

			<section class="app-panel space-y-4 border-destructive/20 p-5">
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">删除菜品</h2>
					<p class="text-sm text-muted-foreground">删除后会移除菜品库记录和它的食材。</p>
				</div>
				<form method="post" action="?/delete" use:enhanceWithFeedback>
					<Button
						type="submit"
						variant="destructive"
						class="h-12 w-full rounded-2xl"
						data-confirm={`删除菜品「${dish.name}」？它会从菜品库移除。`}
						data-pending-label="删除中..."
					>
						删除菜品
					</Button>
				</form>
			</section>
		</div>
	</div>
</main>
