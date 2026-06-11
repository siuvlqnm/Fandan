<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { CalendarDays, ClipboardCopy, ClipboardList, Plus, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>饭单 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">饭单</p>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">管理饭单和创建计划</h1>
			<p class="max-w-2xl text-muted-foreground">
				按对象、类型和状态查找饭单。新饭单创建后会进入详情页继续添加菜品和调整内容。
			</p>
		</div>
		<Button href="/app/meal-plans/new">
			<Plus class="size-4" />
			新建饭单
		</Button>
	</section>

	<Card.Root class="rounded-lg">
		<Card.Content class="pt-6">
			<form method="get" class="grid gap-3 md:grid-cols-[160px_160px_1fr_auto] md:items-end">
				<div class="space-y-2">
					<Label for="meal-plan-status">状态</Label>
					<select
						id="meal-plan-status"
						name="status"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-3 md:text-sm"
					>
						{#each data.statusOptions as option}
							<option value={option.value} selected={data.filters.status === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-2">
					<Label for="meal-plan-type">类型</Label>
					<select
						id="meal-plan-type"
						name="type"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-3 md:text-sm"
					>
						{#each data.typeOptions as option}
							<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-2">
					<Label for="meal-plan-target">对象</Label>
					<select
						id="meal-plan-target"
						name="targetId"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-3 md:text-sm"
					>
						<option value="" selected={!data.filters.targetId}>全部对象</option>
						{#each data.targets as target}
							<option value={target.id} selected={data.filters.targetId === target.id}>{target.name}</option>
						{/each}
					</select>
				</div>
				<Button type="submit" variant="outline">筛选</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if form?.message}
		<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="grid gap-4 lg:grid-cols-2">
		{#if data.mealPlans.length === 0}
			<Card.Root class="rounded-lg lg:col-span-2">
				<Card.Header>
					<Card.Title>还没有匹配的饭单</Card.Title>
					<Card.Description>新用户也可以直接从这里创建第一份饭单；没有对象时可在创建流程里快速新建。</Card.Description>
				</Card.Header>
				<Card.Content>
					<Button href="/app/meal-plans/new">
						<Plus class="size-4" />
						新建饭单
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each data.mealPlans as mealPlan}
				<Card.Root class="rounded-lg" data-testid={`meal-plan-card-${mealPlan.id}`}>
					<Card.Header>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<Card.Title class="truncate">{mealPlan.title}</Card.Title>
								<Card.Description>{mealPlan.typeLabel} · {mealPlan.statusLabel}</Card.Description>
							</div>
							<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
								<ClipboardList class="size-4" />
							</span>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid gap-3 text-sm md:grid-cols-2">
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<UsersRound class="size-4" />
									对象
								</span>
								<span>{mealPlan.targetName}</span>
							</p>
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<CalendarDays class="size-4" />
									日期
								</span>
								<span>{mealPlan.startDate || '未设置'}{mealPlan.endDate ? ` - ${mealPlan.endDate}` : ''}</span>
							</p>
						</div>
						<p class="text-sm text-muted-foreground">
							菜品：{mealPlan.items.length} 道 · {mealPlan.notes || '暂无备注'}
						</p>
						<div class="flex flex-wrap gap-2">
							<Button href={`/app/meal-plans/${mealPlan.id}`} variant="outline" size="sm">打开</Button>
							<form method="post" action="?/duplicate">
								<input type="hidden" name="id" value={mealPlan.id} />
								<Button type="submit" variant="ghost" size="sm">
									<ClipboardCopy class="size-4" />
									复制
								</Button>
							</form>
							{#if mealPlan.status !== 'archived'}
								<form method="post" action="?/archive">
									<input type="hidden" name="id" value={mealPlan.id} />
									<Button type="submit" variant="ghost" size="sm">归档</Button>
								</form>
							{/if}
							<form method="post" action="?/delete" class="ml-auto">
								<input type="hidden" name="id" value={mealPlan.id} />
								<Button type="submit" variant="destructive" size="sm">删除</Button>
							</form>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</section>
</main>
