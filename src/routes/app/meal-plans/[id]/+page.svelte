<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, ClipboardList } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.mealPlan.title} / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-10">
	<Button href="/app/meal-plans" variant="ghost" size="sm" class="self-start px-0">
		<ArrowLeft class="size-4" />
		返回饭单列表
	</Button>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<ClipboardList class="size-5" />
				{data.mealPlan.title}
			</Card.Title>
			<Card.Description>
				饭单详情工作台会在 LES-91 接入。当前页面先用于确认新建流程、状态和 space 隔离。
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-3 text-sm md:grid-cols-2">
			<p class="rounded-md border p-3">
				<span class="block text-muted-foreground">状态</span>
				{data.mealPlan.status}
			</p>
			<p class="rounded-md border p-3">
				<span class="block text-muted-foreground">类型</span>
				{data.mealPlan.type}
			</p>
			<p class="rounded-md border p-3">
				<span class="block text-muted-foreground">日期</span>
				{data.mealPlan.startDate || '未设置'}
			</p>
			<p class="rounded-md border p-3">
				<span class="block text-muted-foreground">菜品数量</span>
				{data.mealPlan.items.length} 道
			</p>
		</Card.Content>
	</Card.Root>
</main>
