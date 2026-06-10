<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowRight, ClipboardCheck, ShoppingBasket, UsersRound } from 'lucide-svelte';

	const steps = [
		{ label: '新建饭单', value: '选择对象、日期和餐别' },
		{ label: '添加菜品', value: '从菜品库复用或顺手新建' },
		{ label: '分享确认', value: '收集忌口、偏好和备注' },
		{ label: '生成清单', value: '按食材汇总可勾选购物项' }
	];

	const modules = [
		{ icon: UsersRound, title: '用餐对象', detail: '家庭、客户、聚餐对象和忌口沉淀' },
		{ icon: ClipboardCheck, title: '饭单工作台', detail: '草稿、待确认、已确认、已完成、归档' },
		{ icon: ShoppingBasket, title: '购物清单', detail: '从菜品食材生成并允许手动调整' }
	];
</script>

<svelte:head>
	<title>饭单 / Fandan</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-12">
	<section class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
		<div class="space-y-6">
			<div class="space-y-3">
				<p class="text-sm font-medium text-muted-foreground">Fandan MVP</p>
				<h1 class="max-w-3xl text-4xl font-semibold tracking-normal text-balance md:text-5xl">
					给家人和客户安排菜单、确认忌口、生成购物清单。
				</h1>
				<p class="max-w-2xl text-base leading-7 text-muted-foreground">
					饭单面向上门做饭、私厨、做饭阿姨和家庭组织者，第一版先跑通从新建饭单到分享确认再到采购清单的核心闭环。
				</p>
			</div>
			<div class="flex flex-wrap gap-3">
				<Button href="/app" size="lg">
					进入饭单工作台
					<ArrowRight class="size-4" />
				</Button>
				<Button href="/api/health" variant="outline" size="lg">查看 API 健康检查</Button>
			</div>
		</div>

		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title>第一版核心闭环</Card.Title>
				<Card.Description>LES-80 初始化后，后续 issue 会沿这个流程逐步补齐。</Card.Description>
			</Card.Header>
			<Card.Content>
				<ol class="space-y-3">
					{#each steps as step, index}
						<li class="flex gap-3 rounded-md border p-3">
							<span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
								{index + 1}
							</span>
							<div>
								<p class="font-medium">{step.label}</p>
								<p class="text-sm text-muted-foreground">{step.value}</p>
							</div>
						</li>
					{/each}
				</ol>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		{#each modules as module}
			{@const Icon = module.icon}
			<Card.Root class="rounded-lg">
				<Card.Header>
					<div class="mb-2 flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
						<Icon class="size-4" />
					</div>
					<Card.Title>{module.title}</Card.Title>
					<Card.Description>{module.detail}</Card.Description>
				</Card.Header>
			</Card.Root>
		{/each}
	</section>
</main>
