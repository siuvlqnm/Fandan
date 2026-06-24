<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowRight, CalendarDays, ClipboardCopy, ClipboardList, Plus, Search, Trash2, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>饭单 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="flex items-start justify-between gap-4">
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">饭单</p>
			<h1 class="text-3xl font-semibold leading-tight">每一顿，都在这里</h1>
			<p class="text-sm leading-6 text-muted-foreground">先处理最近的安排，需要时再展开筛选和管理操作。</p>
		</div>
		{#if data.total > 0}
			<Button href="/app/meal-plans/new" class="size-12 shrink-0 rounded-2xl" aria-label="安排一顿饭">
				<Plus class="size-5" />
			</Button>
		{/if}
	</section>

	{#if data.total > 5}
	<details class="app-panel group overflow-hidden" open={data.filters.status !== 'all' || data.filters.type !== 'all' || Boolean(data.filters.targetId)}>
		<summary class="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
			<Search class="size-4 text-primary" />筛选饭单
			<span class="ml-auto text-xs text-muted-foreground group-open:hidden">按状态、类型或用餐档案</span>
		</summary>
	<form method="get" class="space-y-4 border-t border-border/70 p-4">
		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<Label for="meal-plan-status">状态</Label>
					<select id="meal-plan-status" name="status" class="app-input h-11 text-sm">
						{#each data.statusOptions as option}
							<option value={option.value} selected={data.filters.status === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-2">
					<Label for="meal-plan-type">类型</Label>
					<select id="meal-plan-type" name="type" class="app-input h-11 text-sm">
						{#each data.typeOptions as option}
							<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="space-y-2">
				<Label for="meal-plan-target">对象</Label>
				<select id="meal-plan-target" name="targetId" class="app-input h-11 text-sm">
					<option value="" selected={!data.filters.targetId}>全部对象</option>
					{#each data.targets as target}
						<option value={target.id} selected={data.filters.targetId === target.id}>{target.name}</option>
					{/each}
				</select>
			</div>
			<Button type="submit" variant="outline" class="h-11 rounded-2xl bg-white">应用筛选</Button>
		</div>
	</form>
	</details>
	{/if}

	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="app-panel divide-y divide-border/70 overflow-hidden">
		{#if data.mealPlans.length === 0}
			<div class="space-y-4 p-5">
				<div class="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
					<ClipboardList class="size-6" />
				</div>
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">{data.total === 0 ? '还没有饭单' : '没有匹配的饭单'}</h2>
					<p class="text-sm leading-6 text-muted-foreground">写下想吃的菜，就能开始安排并生成购物清单。</p>
				</div>
				<Button href="/app/meal-plans/new" class="h-12 rounded-2xl">
					<Plus class="size-4" />
					安排一顿饭
				</Button>
			</div>
		{:else}
			{#each data.mealPlans as mealPlan}
				<article class="p-4" data-testid={`meal-plan-card-${mealPlan.id}`}>
					<a href={`/app/meal-plans/${mealPlan.id}`} class="flex items-start gap-3">
						<span class="mt-1 h-16 w-1 shrink-0 rounded-full {mealPlan.status === 'pending_confirmation' ? 'bg-destructive' : mealPlan.status === 'confirmed' ? 'bg-primary' : mealPlan.status === 'archived' ? 'bg-muted-foreground/40' : 'bg-[oklch(0.76_0.16_72)]'}"></span>
						<span class="min-w-0 flex-1 space-y-2">
							<span class="flex items-center gap-2">
								<span class="truncate text-lg font-semibold">{mealPlan.title}</span>
								<span class="app-chip shrink-0 {mealPlan.status === 'pending_confirmation' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'}">
									{mealPlan.statusLabel}
								</span>
							</span>
							<span class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
								<span class="inline-flex items-center gap-1.5"><UsersRound class="size-4" />{mealPlan.targetName}</span>
								<span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" />{mealPlan.startDate || '未设置'}{mealPlan.endDate ? ` - ${mealPlan.endDate}` : ''}</span>
							</span>
							<span class="block text-sm text-muted-foreground">菜品 {mealPlan.items.length} 道 · {mealPlan.notes || mealPlan.typeLabel}</span>
						</span>
						<ArrowRight class="mt-7 size-5 shrink-0 text-muted-foreground" />
					</a>
					<div class="mt-3 flex items-center justify-end gap-2">
						<form method="post" action="?/duplicate" use:enhanceWithFeedback={{ pendingLabel: '复制中...' }}>
							<input type="hidden" name="id" value={mealPlan.id} />
							<Button type="submit" variant="ghost" size="sm" class="h-11" data-pending-label="复制中...">
								<ClipboardCopy class="size-4" />
								复制
							</Button>
						</form>
						{#if mealPlan.status !== 'archived'}
							<form method="post" action="?/archive" use:enhanceWithFeedback>
								<input type="hidden" name="id" value={mealPlan.id} />
								<Button
									type="submit"
									variant="ghost"
									size="sm"
									class="h-11"
									data-confirm={`归档饭单「${mealPlan.title}」？归档后详情页会保持只读。`}
									data-pending-label="归档中..."
								>
									归档
								</Button>
							</form>
						{/if}
						<form method="post" action="?/delete" use:enhanceWithFeedback>
							<input type="hidden" name="id" value={mealPlan.id} />
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								class="h-11"
								data-confirm={`删除饭单「${mealPlan.title}」？关联的饭单条目、购物清单和反馈会一并移除。`}
								data-pending-label="删除中..."
							>
								<Trash2 class="size-4" />
								删除
							</Button>
						</form>
					</div>
				</article>
			{/each}
		{/if}
	</section>
</main>

<MobileBottomNav />
