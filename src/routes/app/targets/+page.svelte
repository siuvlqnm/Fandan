<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ArrowRight, Briefcase, Cake, Home, Plus, Search, Trash2, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const typeIcon = (type: string) =>
		type === 'home' ? Home : type === 'client' ? Briefcase : type === 'gathering' ? Cake : UsersRound;
	const typeAccent = (type: string) =>
		type === 'home' ? 'green' : type === 'client' ? '' : type === 'gathering' ? 'orange' : '';
</script>

<svelte:head>
	<title>给谁做饭 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="targets-list">
	<header class="fd-topbar with-back">
		<a href="/app/settings" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>给谁做饭</h1>
				<p>安排饭时直接选</p>
			</span>
		</a>
		<a href="/app/targets/new" class="fd-icon-button" aria-label="新增偏好"><Plus class="size-5" /></a>
	</header>

	<section class="fd-page-title">
		<span class="fd-eyebrow green"><UsersRound class="size-3.5" /> {data.total > 0 ? `${data.total} 份偏好` : '目标'}</span>
		<h2>不同场合不同饭</h2>
		<p>家里、聚餐、客户……存好人数和口味，安排饭时一键带入。</p>
	</section>

	{#if data.total > 0}
		<form method="get" class="fd-search-row" style="margin-top:14px;">
			<label class="fd-search">
				<Search class="size-4" />
				<input type="search" name="q" value={data.filters.q} placeholder="名称、口味、忌口或备注" />
			</label>
			<button type="submit" class="fd-round-btn" style="width:48px;height:48px;font-size:18px;" aria-label="搜索"><Search class="size-5" /></button>
		</form>
	{/if}

	{#if data.total > 5}
		<details class="fd-soft-card" style="margin-top:12px;padding:0;" open={data.filters.type !== 'all'}>
			<summary style="display:flex;min-height:48px;cursor:pointer;list-style:none;align-items:center;gap:8px;padding:12px 16px;font-size:14px;font-weight:700;color:#4f4943;">
				<Search class="size-4" style="color:var(--fd-green);" /> 按类型筛选
			</summary>
			<form method="get" style="border-top:1px solid var(--fd-line-soft);padding:16px;display:grid;gap:12px;">
				<input type="hidden" name="q" value={data.filters.q} />
				<div class="space-y-2">
					<Label for="target-type" style="font-size:12px;font-weight:700;">类型</Label>
					<select id="target-type" name="type" class="fd-select">
						{#each data.typeOptions as option}
							<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<button type="submit" class="fd-ghost-btn block">筛选</button>
			</form>
		</details>
	{/if}

	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	<section class="fd-section-head">
		<div>
			<h3>偏好列表</h3>
			<p>{data.targets.length} 份偏好</p>
		</div>
		<a href="/app/targets/new" class="fd-ghost-btn"><Plus class="size-4" /> 新建</a>
	</section>

	{#if data.targets.length === 0}
		<div class="fd-empty" style="margin-top:14px;">
			<span class="emoji"><UsersRound class="size-8" /></span>
			<h3>{data.total === 0 ? '还没有偏好' : '没有匹配的偏好'}</h3>
			<p>{data.total === 0 ? '需要记录特别的口味或忌口时，再创建一份档案。' : '换个关键词，或清除筛选后再看看。'}</p>
			<a href={data.total === 0 ? '/app/targets/new' : '/app/targets'} class="fd-primary-btn lg block" style="margin-top:6px;">
				<Plus class="size-4" /> {data.total === 0 ? '新建偏好' : '清除筛选'}
			</a>
		</div>
	{:else}
		<section class="fd-card-list">
			{#each data.targets as target (target.id)}
				{@const Icon = typeIcon(target.type)}
				{@const accent = typeAccent(target.type)}
				<article class="fd-soft-card" style="display:grid;gap:10px;" data-testid={`target-card-${target.id}`}>
					<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
						<div style="display:flex;align-items:center;gap:11px;min-width:0;">
							<span class="fd-avatar-text" style="width:42px;height:42px;" data-accent={accent}><Icon class="size-5" /></span>
							<div class="min-w-0">
								<strong style="display:block;font-size:17px;font-weight:850;truncate">{target.name}</strong>
								<span style="color:var(--fd-muted);font-size:12px;">{target.typeLabel} · {target.peopleCount} 人 · {target.mealPlanCount} 份饭单</span>
							</div>
						</div>
						{#if target.type === 'home'}<span class="fd-state-pill green">常用</span>{/if}
					</div>
					<p style="margin:0;color:#595550;font-size:13px;line-height:1.35;">{target.tasteNotes || target.dietaryRestrictions || '暂无口味或忌口记录'}</p>
					<div style="display:flex;gap:8px;flex-wrap:wrap;">
						{#if target.tasteNotes}<span class="fd-pill">{target.tasteNotes}</span>{/if}
						{#if target.dietaryRestrictions}<span class="fd-pill coral">忌口 {target.dietaryRestrictions}</span>{/if}
						{#if target.budgetNotes}<span class="fd-pill">{target.budgetNotes}</span>{/if}
					</div>
					<div style="display:flex;gap:8px;">
						<a href={`/app/targets/${target.id}`} class="fd-ghost-btn" style="height:38px;font-size:13px;">编辑</a>
						<a href={`/app/meal-plans/new?targetId=${target.id}`} class="fd-primary-btn" style="height:38px;font-size:13px;">用这个安排饭 <ArrowRight class="size-4" /></a>
						<form method="post" action="?/delete" use:enhanceWithFeedback style="margin-left:auto;">
							<input type="hidden" name="id" value={target.id} />
							<button type="submit" class="fd-icon-del" style="width:38px;height:38px;font-size:16px;" aria-label={`删除偏好「${target.name}」`} data-confirm={`删除偏好「${target.name}」？已存在饭单不会删除。`} data-pending-label="删除中...">
								<Trash2 class="size-4" />
							</button>
						</form>
					</div>
				</article>
			{/each}
		</section>
	{/if}
</main>

<a href="/app/targets/new" class="fd-fab" aria-label="新增偏好"><Plus class="size-6" /></a>

<MobileBottomNav />
