<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, ClipboardList } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>新建饭单 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-10">
	<Button href={data.dish ? '/app/dishes' : '/app/targets'} variant="ghost" size="sm" class="self-start px-0">
		<ArrowLeft class="size-4" />
		返回{data.dish ? '菜品库' : '对象列表'}
	</Button>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<ClipboardList class="size-5" />
				新建饭单
			</Card.Title>
			<Card.Description>
				饭单新建流程会在 LES-90 接入。当前入口先保留对象和菜品上下文，避免从卡片进入时丢失选择。
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if data.target}
				<div class="rounded-md border p-4">
					<p class="text-sm text-muted-foreground">已选择对象</p>
					<p class="text-lg font-semibold">{data.target.name}</p>
					<p class="text-sm text-muted-foreground">{data.target.peopleCount} 人 · {data.target.type}</p>
				</div>
			{/if}
			{#if data.dish}
				<div class="rounded-md border p-4">
					<p class="text-sm text-muted-foreground">已选择菜品</p>
					<p class="text-lg font-semibold">{data.dish.name}</p>
					<p class="text-sm text-muted-foreground">{data.dish.category || '未分类'} · {data.dish.ingredients.length} 种食材</p>
				</div>
			{/if}
			<Button href={data.dish ? '/app/dishes' : '/app/targets'} variant="outline">
				先返回管理{data.dish ? '菜品' : '对象'}
			</Button>
		</Card.Content>
	</Card.Root>
</main>
