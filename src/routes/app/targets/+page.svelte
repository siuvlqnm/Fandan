<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { CalendarClock, Plus, Search, Utensils, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>用餐对象 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">用餐对象</p>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">管理家庭、客户和聚餐对象</h1>
			<p class="max-w-2xl text-muted-foreground">
				记录人数、口味、忌口和预算备注。后续新建饭单时会直接复用这些信息。
			</p>
		</div>
		<Button href="/app/targets/new">
			<Plus class="size-4" />
			新建对象
		</Button>
	</section>

	<Card.Root class="rounded-lg">
		<Card.Content class="pt-6">
			<form method="get" class="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
				<div class="space-y-2">
					<Label for="target-search">搜索</Label>
					<div class="relative">
						<Search class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
						<Input
							id="target-search"
							name="q"
							value={data.filters.q}
							placeholder="名称、口味、忌口或备注"
							class="pl-8"
						/>
					</div>
				</div>
				<div class="space-y-2">
					<Label for="target-type">类型</Label>
					<select
						id="target-type"
						name="type"
						class="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none focus-visible:ring-3 md:text-sm"
					>
						{#each data.typeOptions as option}
							<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
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
		{#if data.targets.length === 0}
			<Card.Root class="rounded-lg lg:col-span-2">
				<Card.Header>
					<Card.Title>还没有匹配的对象</Card.Title>
					<Card.Description>可以新建第一个家庭、客户或聚餐对象，也可以调整搜索条件。</Card.Description>
				</Card.Header>
				<Card.Content>
					<Button href="/app/targets/new">
						<Plus class="size-4" />
						新建对象
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each data.targets as target}
				<Card.Root class="rounded-lg">
					<Card.Header>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<Card.Title class="truncate">{target.name}</Card.Title>
								<Card.Description>{target.typeLabel} · {target.peopleCount} 人</Card.Description>
							</div>
							<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
								<UsersRound class="size-4" />
							</span>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid gap-3 text-sm md:grid-cols-2">
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<Utensils class="size-4" />
									口味
								</span>
								<span>{target.tasteNotes || '暂无口味备注'}</span>
							</p>
							<p class="rounded-md border p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<CalendarClock class="size-4" />
									历史饭单
								</span>
								<span>{target.mealPlanCount} 份</span>
							</p>
						</div>
						<p class="text-sm text-muted-foreground">
							忌口：{target.dietaryRestrictions || '暂无忌口记录'}
						</p>
						<div class="flex flex-wrap gap-2">
							<Button href={`/app/targets/${target.id}`} variant="outline" size="sm">编辑</Button>
							<Button href={`/app/targets/${target.id}#meal-plans`} variant="ghost" size="sm">历史饭单</Button>
							<Button href={`/app/meal-plans/new?targetId=${target.id}`} variant="ghost" size="sm">新建饭单</Button>
							<form method="post" action="?/delete" use:enhanceWithFeedback class="ml-auto">
								<input type="hidden" name="id" value={target.id} />
								<Button
									type="submit"
									variant="destructive"
									size="sm"
									data-confirm={`删除对象「${target.name}」？已存在饭单不会删除，但会失去对象关联。`}
									data-pending-label="删除中..."
								>
									删除
								</Button>
							</form>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</section>
</main>
