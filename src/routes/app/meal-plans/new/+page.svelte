<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, CalendarDays, Check, ChevronDown, Utensils } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const values = $derived(form?.values ?? data.values);
	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const dishes = $derived(form?.dishes ?? data.dishes);
	const targets = $derived(form?.targets ?? data.targets);
	const selectedIds = $derived(new Set(values.dishIds ?? []));
	const controlClass = 'app-input h-12';
</script>

<svelte:head><title>安排一顿饭 / 饭单</title></svelte:head>

<main class="app-page app-bottom-safe max-w-3xl">
	<section class="space-y-4">
		<Button href="/app" variant="ghost" size="sm" class="h-11 justify-start px-0 text-muted-foreground"><ArrowLeft class="size-4" />返回</Button>
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary"><Utensils class="size-3.5" />今晚吃什么</p>
			<h1 class="text-3xl font-semibold leading-tight">安排一顿饭</h1>
			<p class="text-sm leading-6 text-muted-foreground">写下想吃的菜，已有菜品也可以直接勾选。其他资料以后再补。</p>
		</div>
	</section>

	<form method="post" use:enhanceWithFeedback={{ pendingLabel: '正在安排...' }} class="space-y-5">
		<section class="app-panel space-y-5 p-5">
			<div class="space-y-2">
				<Label for="dish-names" class="text-base font-semibold">这顿想吃什么？</Label>
				<textarea id="dish-names" name="dishNamesText" class="app-input min-h-28 py-3" placeholder="例如：番茄炒蛋、清炒时蔬">{values.dishNamesText ?? ''}</textarea>
				<p class="text-sm text-muted-foreground">用逗号或换行分隔，新菜会自动保存，之后可以补食材。</p>
				{#if errors.dishNamesText?.[0]}<p class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{errors.dishNamesText[0]}</p>{/if}
			</div>

			{#if dishes.length > 0}
				<div class="space-y-3">
					<p class="text-sm font-medium">或者选择家里已有的菜</p>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each dishes as dish}
							<label class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border/80 bg-white p-3 has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
								<input type="checkbox" name="dishIds" value={dish.id} checked={selectedIds.has(dish.id)} class="size-5 rounded" />
								<span class="min-w-0 flex-1"><span class="block truncate font-medium">{dish.name}</span><span class="text-xs text-muted-foreground">{dish.ingredients.length} 种食材 · 基准 {dish.baseServings} 人份</span></span>
								<Check class="size-4 text-primary" />
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="servings" class="text-base font-semibold">大约几个人吃？</Label>
				<Input id="servings" name="servings" type="number" min="1" max="999" value={values.servings ?? 2} class={controlClass} />
				<p class="text-sm text-muted-foreground">默认 2 人，购物数量会按菜品基准份数换算。</p>
				{#if errors.servings?.[0]}<p class="text-sm text-destructive">{errors.servings[0]}</p>{/if}
			</div>
		</section>

		<details class="app-panel overflow-hidden">
			<summary class="flex min-h-12 cursor-pointer items-center justify-between px-5 py-3 font-medium">更多设置 <ChevronDown class="size-4" /></summary>
			<div class="space-y-4 border-t border-border/70 p-5">
				<div class="space-y-2"><Label for="planned-date">日期</Label><Input id="planned-date" name="plannedDate" type="date" value={values.plannedDate ?? ''} class={controlClass} /></div>
				<div class="space-y-2"><Label for="meal-slot">时间</Label><Input id="meal-slot" name="mealSlot" value={values.mealSlot ?? '晚餐'} class={controlClass} /></div>
				<div class="space-y-2"><Label for="title">名称（可选）</Label><Input id="title" name="title" value={values.title ?? ''} placeholder="例如：周末家庭晚餐" class={controlClass} /></div>
				{#if targets.length > 0}
					<div class="space-y-2"><Label for="target">为谁安排（可选）</Label><select id="target" name="targetId" class={controlClass}><option value="">当前家庭</option>{#each targets as target}<option value={target.id} selected={values.targetId === target.id}>{target.name}</option>{/each}</select></div>
				{/if}
				<div class="space-y-2"><Label for="notes">备注（可选）</Label><textarea id="notes" name="notes" class="app-input min-h-24 py-3" placeholder="例如：少油、不吃辣">{values.notes ?? ''}</textarea></div>
			</div>
		</details>

		<Button type="submit" class="h-14 w-full rounded-2xl text-base" data-pending-label="正在安排..."><CalendarDays class="size-5" />安排好并查看购物清单</Button>
	</form>
</main>
