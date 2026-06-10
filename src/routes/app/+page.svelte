<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { BookOpen, ChefHat, ClipboardList, UsersRound } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ label: '用餐对象', value: data.stats.targets, icon: UsersRound },
		{ label: '菜品', value: data.stats.dishes, icon: ChefHat },
		{ label: '饭单', value: data.stats.mealPlans, icon: ClipboardList }
	]);
</script>

<svelte:head>
	<title>饭单工作台 / Fandan</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">{data.user.email}</p>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">{data.space.name}</h1>
			<p class="max-w-2xl text-muted-foreground">
				这里是创建者的受保护工作台。后续用餐对象、菜品库、饭单和购物清单都会按当前 space 写入和查询。
			</p>
		</div>
		<form method="post" action="/logout">
			<Button type="submit" variant="outline">退出登录</Button>
		</form>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		{#each stats as item}
			{@const Icon = item.icon}
			<Card.Root class="rounded-lg">
				<Card.Header>
					<div class="flex items-center justify-between gap-3">
						<Card.Title class="text-base">{item.label}</Card.Title>
						<span class="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
							<Icon class="size-4" />
						</span>
					</div>
					<p class="text-3xl font-semibold">{item.value}</p>
				</Card.Header>
			</Card.Root>
		{/each}
	</section>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<BookOpen class="size-5" />
				下一步模块入口
			</Card.Title>
			<Card.Description>
				当前页先验证登录态、默认工作空间和 space 隔离。真正的对象、菜品、饭单管理会在后续 issue 中逐个替换这些占位入口。
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-3 md:grid-cols-3">
			<Button href="/app" variant="outline">用餐对象</Button>
			<Button href="/app" variant="outline">菜品库</Button>
			<Button href="/app" variant="outline">新建饭单</Button>
		</Card.Content>
	</Card.Root>
</main>
