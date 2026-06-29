<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import dinnerImage from '$lib/assets/meal-ui/dinner.jpg';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import { ArrowLeft, ArrowRight, CookingPot, ListChecks, MoreHorizontal, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dish = $derived(data.dish as NonNullable<PageData['dish']>);
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const message = $derived(form?.message);
	const steps = $derived(
		(dish.instructions ?? '')
			.split(/\r?\n+/)
			.map((line) => line.trim())
			.filter(Boolean)
	);
</script>

<svelte:head>
	<title>{dish.name} / 常做菜 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="dish-detail">
	<header class="fd-topbar with-back">
		<a href="/app/dishes" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>常做菜</h1>
				<p>{dish.name}</p>
			</span>
		</a>
		<button class="fd-icon-button" type="button" aria-label="更多"><MoreHorizontal class="size-5" /></button>
	</header>

	{#if message}
		<p class="fd-state-pill green" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{message}</p>
	{/if}

	<!-- 大图 + 头 -->
	<section style="position:relative;margin-top:14px;border-radius:26px;overflow:hidden;box-shadow:var(--fd-shadow);">
		<img src={lunchImage} alt={dish.name} style="display:block;width:100%;height:170px;object-fit:cover;" />
		<div style="position:absolute;left:0;right:0;bottom:0;padding:14px 16px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.55));">
			<h2 style="margin:0;color:#fff;font-size:26px;font-weight:900;">{dish.name}</h2>
			<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
				<span class="fd-pill" style="background:rgba(255,255,255,.86);">{dish.baseServings} 人份</span>
				<span class="fd-pill green" style="background:rgba(234,247,223,.95);">{dish.category || '家常菜'}</span>
				{#each dish.tags.slice(0, 2) as tag}
					<span class="fd-pill" style="background:rgba(255,255,255,.86);">{tag}</span>
				{/each}
			</div>
		</div>
	</section>

	{#if !dish.servingBasisConfirmed}
		<p class="fd-state-pill orange" style="justify-content:flex-start;margin-top:12px;">这是旧菜品的安全默认份数，请在下方编辑区核对后保存。</p>
	{/if}

	<!-- 食材 -->
	<section class="fd-section-head">
		<div>
			<h3>食材</h3>
			<p>基础 {dish.baseServings} 人份 · {dish.ingredients.length} 种</p>
		</div>
		<a href="#edit" class="fd-ghost-btn">改</a>
	</section>
	<section class="fd-card-list">
		{#if dish.ingredients.length === 0}
			<div class="fd-soft-card" style="font-size:13px;color:var(--fd-muted);">暂无食材。点上方「改」补充，安排这菜时才能自动带出买菜清单。</div>
		{:else}
			{#each dish.ingredients as ingredient}
				<article class="fd-check-card" style="grid-template-columns:34px minmax(0,1fr) auto;">
					<span class="fd-check" style="background:var(--fd-green-soft);border-color:var(--fd-green);color:var(--fd-green);"><CookingPot class="size-4" /></span>
					<span class="fd-check-copy min-w-0"><strong>{ingredient.name}</strong><span>{ingredient.category || '未分类'}</span></span>
					<span class="quantity" style="font-weight:800;color:#38332e;font-size:13px;">{ingredient.quantity || '适量'} {ingredient.unit || ''}</span>
				</article>
			{/each}
		{/if}
	</section>

	<!-- 做法 -->
	<section class="fd-section-head">
		<div>
			<h3>做法</h3>
			<p>自己记的几步</p>
		</div>
	</section>
	{#if steps.length > 0}
		<section class="fd-soft-card" style="display:grid;gap:10px;">
			{#each steps as step, index}
				<div style="display:flex;gap:10px;">
					<span style="flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:var(--fd-green-soft);color:var(--fd-green);display:grid;place-items:center;font-size:12px;font-weight:800;">{index + 1}</span>
					<span style="font-size:14px;line-height:1.5;color:#38332e;">{step}</span>
				</div>
			{/each}
		</section>
	{:else}
		<div class="fd-soft-card" style="font-size:13px;color:var(--fd-muted);">还没有写做法。点下方「编辑」补充几步，自己看得懂就行。</div>
	{/if}

	<!-- 编辑区 -->
	<section class="fd-section-head" id="edit">
		<div>
			<h3>编辑</h3>
			<p>改食材、份数、做法</p>
		</div>
	</section>
	<div class="fd-form-card">
		<DishForm {values} {errors} {message} action="?/update" submitLabel="保存修改" expectedUpdatedAt={dish.updatedAt} />
	</div>

	<!-- 不再常做 -->
	<section class="fd-section-head">
		<div>
			<h3 style="color:var(--fd-coral);">不再常做</h3>
			<p>删除后会移除这道菜和它的食材</p>
		</div>
	</section>
	<form method="post" action="?/delete" use:enhanceWithFeedback>
		<button type="submit" class="fd-danger-btn block" data-confirm={`删除常做菜「${dish.name}」？`} data-pending-label="删除中...">
			<Trash2 class="size-4" /> 删除菜品
		</button>
	</form>

	{#if dish.updatedBy}
		<p style="margin:16px 0 0;color:var(--fd-muted);font-size:11px;text-align:center;">最近由 {dish.updatedBy.name} 更新</p>
	{/if}
</main>

<div class="fd-sticky-action two">
	<a href="/app/dishes" class="fd-ghost-btn"><ArrowLeft class="size-4" /> 常做菜</a>
	<a href={`/app/meal-plans/new?dishId=${dish.id}`} class="fd-primary-btn"><ListChecks class="size-4" /> 用它安排饭 <ArrowRight class="size-4" /></a>
</div>
