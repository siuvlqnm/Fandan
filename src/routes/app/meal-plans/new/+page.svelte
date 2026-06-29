<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, CalendarDays, Check, ChevronDown, Sparkles, Utensils } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const dishes = $derived(form?.dishes ?? data.dishes);
	const targets = $derived(form?.targets ?? data.targets);
	const mealAi = $derived(form?.mealAi);
	const selectedIds = $derived(new Set(values.dishIds ?? []));
	const selectedDishes = $derived(dishes.filter((dish) => selectedIds.has(dish.id)));
	const suggestedNames = $derived(
		String(values.dishNamesText ?? '')
			.split(/[,，、\n]/)
			.map((name) => name.trim())
			.filter(Boolean)
	);
	const suggestedDrafts = $derived(mealAi?.status === 'draft' ? mealAi.suggestedDishes : []);
	const controlClass = 'app-input h-12';
</script>

<svelte:head><title>安排一顿饭 / 饭单</title></svelte:head>

<main class="app-page app-bottom-safe max-w-3xl">
	<section class="app-scene-hero">
		<div class="app-scene-hero-media">
			<img src={dinnerImage} alt="" />
		</div>
		<div class="app-scene-body -mt-14">
			<Button href="/app" variant="ghost" size="sm" class="mb-2 h-11 justify-start rounded-2xl bg-white/85 px-3 text-muted-foreground"><ArrowLeft class="size-4" />返回今天</Button>
			<div class="space-y-2">
				<p class="app-chip bg-white text-primary shadow-sm"><Utensils class="size-3.5" />今晚吃什么</p>
				<h1 class="text-3xl font-semibold leading-tight">安排一顿饭</h1>
				<p class="text-sm leading-6 text-muted-foreground">先把想吃的菜和人数定下来，细节可以之后慢慢补。</p>
			</div>
		</div>
	</section>

	<section class="app-soft-panel space-y-4 p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Sparkles class="size-5" /></span>
			<div class="space-y-1">
				<h2 class="text-lg font-semibold">一句话生成饭单草稿</h2>
				<p class="text-sm leading-6 text-muted-foreground">例如“今晚 3 人，清淡，半小时能做好”。AI 会先填入下面的可编辑表单。</p>
			</div>
		</div>
		<form method="post" action="?/draft" use:enhanceWithFeedback={{ pendingLabel: '正在生成草稿...' }} class="space-y-3">
			<label for="meal-draft-prompt" class="sr-only">饭单需求</label>
			<textarea id="meal-draft-prompt" name="prompt" maxlength="500" class="app-input min-h-24 py-3" placeholder="写下人数、时间、口味或限制">{mealAi?.prompt ?? ''}</textarea>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-xs leading-5 text-muted-foreground">会优先复用已有菜品，新建议会明确标记；过敏和忌口不被覆盖。</p>
				<Button type="submit" variant="outline" class="h-11 rounded-2xl bg-white" data-pending-label="正在生成草稿..." disabled={!data.aiAvailable}>
					<Sparkles class="size-4" />生成饭单草稿
				</Button>
			</div>
		</form>
		{#if !data.aiAvailable}
			<p class="rounded-2xl bg-white p-3 text-sm text-muted-foreground">AI 草稿当前未配置；下面仍可直接手动安排。</p>
		{:else if mealAi?.status === 'error'}
			<p class="rounded-2xl bg-white p-3 text-sm text-destructive" role="alert">{mealAi.message}</p>
		{:else if mealAi?.status === 'draft'}
			<div class="space-y-3 rounded-2xl bg-white p-4" aria-live="polite">
				<div class="space-y-1">
					<p class="font-medium text-primary">饭单草稿已填入，尚未保存</p>
					<p class="text-sm leading-6 text-muted-foreground">可以删除、替换或继续编辑。点击底部主按钮后才会创建饭单并生成购物清单。</p>
				</div>
				{#if mealAi.assumptions.length > 0 || mealAi.constraints.length > 0}
					<ul class="list-disc space-y-1 pl-5 text-sm text-amber-900">
						{#each [...mealAi.constraints, ...mealAi.assumptions] as item}<li>{item}</li>{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	<form method="post" action="?/create" use:enhanceWithFeedback={{ pendingLabel: '正在安排...' }} class="space-y-5">
		<input type="hidden" name="draftPrompt" value={mealAi?.prompt ?? ''} />
		<input type="hidden" name="suggestedDishDraftsJson" value={values.suggestedDishDraftsJson ?? ''} />
		<section class="app-panel space-y-5 p-5">
			{#if mealAi?.status === 'draft'}
				<div class="grid gap-3 rounded-2xl bg-white p-4 text-sm">
					{#if selectedDishes.length > 0}
						<div><p class="font-medium text-primary">复用已有菜品</p><p class="text-muted-foreground">{selectedDishes.map((dish) => dish.name).join('、')}</p></div>
					{/if}
					{#if suggestedNames.length > 0}
						<div class="space-y-2">
							<p class="font-medium text-primary">AI 新建议</p>
							<div class="grid gap-2">
								{#each suggestedNames as name}
									{@const draft = suggestedDrafts.find((dish) => dish.name === name)}
									<div class="grid gap-2 rounded-xl border border-border/70 p-3">
										<div>
											<p class="font-medium">{name}<span class="ml-2 text-xs text-muted-foreground">确认后才会保存为菜品</span></p>
											{#if draft?.reason}<p class="text-xs leading-5 text-muted-foreground">{draft.reason}</p>{/if}
										</div>
										{#if draft}
											<div class="grid gap-2 rounded-xl bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
												<p>{draft.category} · 基准 {draft.baseServings} 人份 · {draft.tags.join('、')}</p>
												{#if draft.ingredients.length > 0}
													<p>
														食材：
														{draft.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.quantity} ${ingredient.unit}`).join('、')}
													</p>
												{/if}
												{#if draft.uncertainFields.length > 0}
													<p class="text-amber-800">AI 估算了部分分类、数量或做法，保存前请核对。</p>
												{/if}
											</div>
										{:else}
											<p class="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">这道新菜还没有食材草稿，保存后购物清单可能为空。</p>
										{/if}
										<div class="grid grid-cols-2 gap-2">
											<Button type="submit" variant="outline" size="sm" class="h-11 bg-white" name="removeDishName" value={name} formaction="?/removeDish">删除</Button>
											<Button type="submit" variant="ghost" size="sm" class="h-11" name="replaceDishName" value={name} formaction="?/replaceDish" data-pending-label="替换中...">换一道</Button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

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

		<details class="app-panel overflow-hidden" open={Boolean(errors.dishNamesText?.[0])}>
			<summary class="flex min-h-12 cursor-pointer items-center justify-between px-5 py-3 font-medium">补充细节 <ChevronDown class="size-4" /></summary>
			<div class="space-y-4 border-t border-border/70 p-5">
				<div class="space-y-2">
					<Label for="dish-names">这顿想吃什么？</Label>
					<textarea id="dish-names" name="dishNamesText" class="app-input min-h-28 py-3" placeholder="例如：番茄炒蛋、清炒时蔬">{values.dishNamesText ?? ''}</textarea>
					<p class="text-sm text-muted-foreground">用逗号或换行分隔。AI 新菜会带可编辑食材草稿；手动输入的新菜可之后补食材。</p>
					{#if errors.dishNamesText?.[0]}<p class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{errors.dishNamesText[0]}</p>{/if}
				</div>
				<div class="space-y-2"><Label for="planned-date">日期</Label><Input id="planned-date" name="plannedDate" type="date" value={values.plannedDate ?? ''} class={controlClass} /></div>
				<div class="space-y-2"><Label for="meal-slot">时间</Label><Input id="meal-slot" name="mealSlot" value={values.mealSlot ?? '晚餐'} class={controlClass} /></div>
				<div class="space-y-2"><Label for="title">名称（可选）</Label><Input id="title" name="title" value={values.title ?? ''} placeholder="例如：周末家庭晚餐" class={controlClass} /></div>
				{#if targets.length > 0}
				<div class="space-y-2"><Label for="target">套用哪份偏好（可选）</Label><select id="target" name="targetId" class={controlClass}><option value="">当前家庭</option>{#each targets as target}<option value={target.id} selected={values.targetId === target.id}>{target.name}</option>{/each}</select></div>
				{/if}
				<div class="space-y-2"><Label for="notes">备注（可选）</Label><textarea id="notes" name="notes" class="app-input min-h-24 py-3" placeholder="例如：少油、不吃辣">{values.notes ?? ''}</textarea></div>
			</div>
		</details>

		<Button type="submit" class="h-14 w-full rounded-2xl text-base" data-pending-label="正在安排..."><CalendarDays class="size-5" />安排好并查看购物清单</Button>
	</form>
</main>
