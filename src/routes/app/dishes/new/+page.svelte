<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ChefHat, Sparkles } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const ai = $derived(form?.ai);
</script>

<svelte:head>
	<title>新建菜品 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href="/app/dishes" variant="ghost" size="sm" class="h-11 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回菜品库
		</Button>
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">
				<ChefHat class="size-3.5" />
				菜品库
			</p>
			<h1 class="text-3xl font-semibold leading-tight">新建菜品</h1>
			<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">只填菜名即可保存，食材、标签和做法可以之后再补。</p>
		</div>
	</section>

	<section class="app-panel space-y-4 border-primary/15 bg-secondary/35 p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><Sparkles class="size-5" /></span>
			<div class="space-y-1">
				<h2 class="text-lg font-semibold">一句话补全草稿</h2>
				<p class="text-sm leading-6 text-muted-foreground">例如“番茄炒蛋，3 人份，少油”。AI 只填入下面的表单，不会自动保存。</p>
			</div>
		</div>
		<form method="post" action="?/draft" use:enhanceWithFeedback={{ pendingLabel: '正在整理草稿...' }} class="space-y-3">
			<label for="dish-draft-prompt" class="sr-only">菜品描述</label>
			<textarea
				id="dish-draft-prompt"
				name="prompt"
				maxlength="500"
				class="app-input min-h-24 py-3"
				placeholder="写下菜名、人数和口味偏好"
			>{ai?.prompt ?? ''}</textarea>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-xs leading-5 text-muted-foreground">不会推断过敏或忌口；不确定内容会标成待核对。</p>
				<Button type="submit" variant="outline" class="h-11 rounded-2xl bg-white" data-pending-label="正在整理草稿..." disabled={!data.aiAvailable}>
					<Sparkles class="size-4" />让 AI 帮我补全
				</Button>
			</div>
		</form>

		{#if !data.aiAvailable}
			<p class="rounded-2xl bg-white p-3 text-sm text-muted-foreground">AI 补全当前未配置；下面的手动表单仍可正常使用。</p>
		{:else if ai?.status === 'error'}
			<p class="rounded-2xl bg-white p-3 text-sm text-destructive" role="alert">{ai.message}</p>
		{:else if ai?.status === 'draft'}
			<div class="space-y-2 rounded-2xl bg-white p-4" aria-live="polite">
				<p class="font-medium text-primary">草稿已填入，尚未保存</p>
				<p class="text-sm leading-6 text-muted-foreground">请逐项编辑、删除或确认。点击最下方“确认并创建菜品”后才会写入菜品库。</p>
				{#if ai.notes.length > 0}
					<ul class="list-disc space-y-1 pl-5 text-sm text-amber-900">
						{#each ai.notes as note}<li>{note}</li>{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	<section class="app-panel space-y-5 p-5">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">菜品资料</h2>
			<p class="text-sm text-muted-foreground">食材会用于后续生成购物清单。</p>
		</div>
		<DishForm
			{values}
			{errors}
			action="?/create"
			aiUncertainFields={ai?.status === 'draft' ? ai.uncertainFields : []}
			message={ai?.status === 'draft' ? '这是可编辑的 AI 草稿。核对所有待确认内容后再保存。' : undefined}
			submitLabel={ai?.status === 'draft' ? '确认并创建菜品' : '创建菜品'}
		/>
	</section>
</main>
