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
			<h1 class="text-3xl font-semibold leading-tight">确认、复用和归档</h1>
			<p class="text-sm leading-6 text-muted-foreground">按状态查看饭单，把待确认和采购准备优先处理。</p>
		</div>
		<Button href="/app/meal-plans/new" class="size-12 shrink-0 rounded-2xl" aria-label="新建饭单">
			<Plus class="size-5" />
		</Button>
	</section>

	<form method="get" class="app-panel space-y-4 p-4">
		<div class="flex items-center gap-2 text-sm font-semibold">
			<Search class="size-4 text-primary" />
			筛选饭单
		</div>
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
					<h2 class="text-xl font-semibold">还没有匹配的饭单</h2>
					<p class="text-sm leading-6 text-muted-foreground">先创建一份饭单，后续对象、菜品和清单都会围绕它展开。</p>
				</div>
				<Button href="/app/meal-plans/new" class="h-12 rounded-2xl">
					<Plus class="size-4" />
					新建饭单
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
							<Button type="submit" variant="ghost" size="sm" data-pending-label="复制中...">
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
