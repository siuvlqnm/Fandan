<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, CalendarClock, Plus, Search, Utensils, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>家人偏好 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="app-scene-hero">
		<div class="app-scene-hero-media">
			<img src={avatarImage} alt="" />
		</div>
		<div class="app-scene-body -mt-14">
			<Button href="/app/settings" variant="ghost" size="sm" class="mb-1 h-11 justify-start rounded-2xl bg-white/85 px-3 text-muted-foreground">
				<ArrowLeft class="size-4" />
				返回家
			</Button>
			<div class="space-y-2">
				<p class="app-chip bg-white text-primary shadow-sm">家人偏好</p>
				<h1 class="text-3xl font-semibold leading-tight">记住家人的口味和忌口</h1>
				<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">
					记录人数、口味、忌口和预算备注。后续安排饭时会直接复用。
				</p>
			</div>
			{#if data.total > 0}<Button href="/app/targets/new" class="mt-2 h-12 rounded-2xl">
				<Plus class="size-4" />
				新建偏好
			</Button>{/if}
		</div>
	</section>

	{#if data.total > 0}
	<form method="get" class="app-panel space-y-3 p-3">
		<div class="flex gap-2">
			<div class="relative min-w-0 flex-1">
				<Search class="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
				<Input
					id="target-search"
					name="q"
					value={data.filters.q}
					placeholder="名称、口味、忌口或备注"
					class="app-input pl-9"
				/>
			</div>
				<Button type="submit" variant="outline" class="size-12 shrink-0 rounded-xl bg-white" aria-label="搜索偏好"><Search class="size-4" /></Button>
		</div>
		{#if data.total > 5}<details class="group rounded-xl bg-muted/50" open={data.filters.type !== 'all'}>
			<summary class="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">更多筛选 <span class="ml-auto group-open:hidden">按类型</span></summary>
		<div class="grid gap-3 border-t border-border/70 p-3 md:grid-cols-[1fr_auto] md:items-end">
			<div class="space-y-2">
				<Label for="target-type">类型</Label>
				<select id="target-type" name="type" class="app-input h-11 text-sm">
					{#each data.typeOptions as option}
						<option value={option.value} selected={data.filters.type === option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			<Button type="submit" variant="outline" class="h-11 rounded-xl bg-white">筛选</Button>
		</div>
		</details>{/if}
	</form>
	{/if}

	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="space-y-3">
		<div class="flex items-end justify-between gap-3">
			<div>
				<h2 class="text-xl font-semibold">偏好列表</h2>
				<p class="text-sm text-muted-foreground">{data.targets.length} 份偏好</p>
			</div>
		</div>

		{#if data.targets.length === 0}
			<div class="app-panel space-y-4 p-5 text-center">
				<UsersRound class="mx-auto size-8 text-primary" />
				<div class="space-y-1">
					<h3 class="text-xl font-semibold">{data.total === 0 ? '还没有偏好' : '没有匹配的偏好'}</h3>
					<p class="text-sm leading-6 text-muted-foreground">{data.total === 0 ? '需要记录特别的口味或忌口时，再创建一份档案。' : '换个关键词，或清除筛选后再看看。'}</p>
				</div>
				<Button href={data.total === 0 ? '/app/targets/new' : '/app/targets'} class="h-12 rounded-2xl">
					<Plus class="size-4" />
					{data.total === 0 ? '新建偏好' : '清除筛选'}
				</Button>
			</div>
		{:else}
			<div class="app-panel divide-y divide-border/70 overflow-hidden">
				{#each data.targets as target}
					<article class="space-y-4 p-4">
						<a href={`/app/targets/${target.id}`} class="flex items-start gap-3">
							<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
								<UsersRound class="size-5" />
							</span>
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate text-lg font-semibold">{target.name}</span>
								<span class="block text-sm text-muted-foreground">{target.typeLabel} · {target.peopleCount} 人 · {target.mealPlanCount} 份饭单</span>
							</span>
						</a>

						<div class="grid gap-2 text-sm md:grid-cols-2">
							<p class="rounded-2xl border border-border/80 bg-white p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<Utensils class="size-4" />
									口味
								</span>
								<span class="line-clamp-2">{target.tasteNotes || '暂无口味备注'}</span>
							</p>
							<p class="rounded-2xl border border-border/80 bg-white p-3">
								<span class="mb-1 flex items-center gap-1.5 text-muted-foreground">
									<CalendarClock class="size-4" />
									忌口
								</span>
								<span class="line-clamp-2">{target.dietaryRestrictions || '暂无忌口记录'}</span>
							</p>
						</div>

						<div class="grid grid-cols-[1fr_1fr_auto] gap-2">
							<Button href={`/app/targets/${target.id}`} variant="outline" size="sm" class="h-11 rounded-xl bg-white">编辑</Button>
							<Button href={`/app/meal-plans/new?targetId=${target.id}`} variant="ghost" size="sm" class="h-11 rounded-xl">安排一顿饭</Button>
							<form method="post" action="?/delete" use:enhanceWithFeedback>
								<input type="hidden" name="id" value={target.id} />
								<Button
									type="submit"
									variant="destructive"
									size="sm"
									class="h-11 rounded-xl"
									aria-label={`删除偏好「${target.name}」`}
									data-confirm={`删除偏好「${target.name}」？已存在饭单不会删除。`}
									data-pending-label="删除中..."
								>
									删除
								</Button>
							</form>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>

<MobileBottomNav />
