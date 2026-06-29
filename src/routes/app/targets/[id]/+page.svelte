<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ArrowRight, ClipboardList, Plus, Trash2 } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const target = $derived(data.target as NonNullable<PageData['target']>);
	const mealPlans = $derived(data.mealPlans ?? []);
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const message = $derived(form?.message);
	const typeLabels: Record<string, string> = {
		home: '家庭',
		client: '特别照顾',
		gathering: '聚餐',
		other: '其他'
	};
	const typeLabel = $derived(typeLabels[target.type] ?? '其他');
	const mealPlanCount = $derived(mealPlans.length);
</script>

<svelte:head>
	<title>{target.name} / 家人偏好 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="target-detail">
	<header class="fd-topbar with-back">
		<a href="/app/targets" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>{target.name}</h1>
				<p>{typeLabel} · {target.peopleCount} 人</p>
			</span>
		</a>
		<a href={`/app/meal-plans/new?targetId=${target.id}`} class="fd-icon-button" aria-label="按这个口味安排"><Plus class="size-5" /></a>
	</header>

	{#if message}
		<p class="fd-state-pill green" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{message}</p>
	{/if}

	<!-- 概览 -->
	<section class="fd-detail-card" style="margin-top:14px;display:grid;gap:10px;">
		<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
			<strong style="font-size:18px;font-weight:850;">{target.name}</strong>
			<span class="fd-pill green">{typeLabel}</span>
		</div>
		<p style="margin:0;color:#595550;font-size:13px;line-height:1.35;">{target.peopleCount} 人 · {mealPlanCount} 份饭单</p>
		<div style="display:flex;gap:6px;flex-wrap:wrap;">
			{#if target.tasteNotes}<span class="fd-pill">口味：{target.tasteNotes}</span>{/if}
			{#if target.dietaryRestrictions}<span class="fd-pill coral">忌口：{target.dietaryRestrictions}</span>{/if}
			{#if target.budgetNotes}<span class="fd-pill">预算：{target.budgetNotes}</span>{/if}
			{#if target.contactNotes}<span class="fd-pill">备注：{target.contactNotes}</span>{/if}
		</div>
		<a href={`/app/meal-plans/new?targetId=${target.id}`} class="fd-primary-btn block"><Plus class="size-4" /> 按这个口味安排 <ArrowRight class="size-4" /></a>
	</section>

	<!-- 吃过什么 -->
	<section class="fd-section-head">
		<div>
			<h3>吃过什么</h3>
			<p>{mealPlans.length} 次安排</p>
		</div>
	</section>
	{#if mealPlans.length === 0}
		<div class="fd-soft-card" style="font-size:13px;color:var(--fd-muted);">还没有按这份偏好安排过。</div>
	{:else}
		<section class="fd-card-list">
			{#each mealPlans as mealPlan}
				<a href={`/app/meal-plans/${mealPlan.id}`} class="fd-soft-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;text-decoration:none;">
					<div class="min-w-0">
						<strong style="display:block;font-size:15px;font-weight:850;truncate">{mealPlan.title}</strong>
						<span style="display:block;margin-top:2px;color:var(--fd-muted);font-size:12px;">{mealPlan.startDate || '未设置日期'} · {mealPlan.status}</span>
					</div>
					<ArrowRight class="size-5" style="color:#6a645d;" />
				</a>
			{/each}
		</section>
	{/if}

	<!-- 编辑 -->
	<section class="fd-section-head">
		<div>
			<h3>编辑偏好</h3>
			<p>改人数、口味、忌口</p>
		</div>
	</section>
	<div class="fd-form-card">
		<TargetForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
	</div>

	<!-- 不再使用 -->
	<section class="fd-section-head">
		<div>
			<h3 style="color:var(--fd-coral);">不再使用</h3>
			<p>删除后不会影响已经安排过的饭</p>
		</div>
	</section>
	<form method="post" action="?/delete" use:enhanceWithFeedback>
		<button type="submit" class="fd-danger-btn block" data-confirm={`删除偏好「${target.name}」？已存在饭单不会删除。`} data-pending-label="删除中...">
			<Trash2 class="size-4" /> 删除偏好
		</button>
	</form>
</main>

<div class="fd-sticky-action">
	<a href={`/app/meal-plans/new?targetId=${target.id}`} class="fd-primary-btn block lg"><ClipboardList class="size-4" /> 按这个口味安排饭 <ArrowRight class="size-4" /></a>
</div>
