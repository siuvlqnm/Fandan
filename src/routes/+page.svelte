<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowRight,
		CalendarCheck2,
		CheckCircle2,
		ChefHat,
		MessageCircle,
		ShoppingBag,
		UsersRound
	} from 'lucide-svelte';

	const flow = [
		{ label: '菜品', detail: '搭配今晚菜单', icon: ChefHat },
		{ label: '确认', detail: '收集忌口偏好', icon: MessageCircle },
		{ label: '清单', detail: '采购准备就绪', icon: ShoppingBag }
	];

	const dinnerItems = ['蒜蓉粉丝蒸虾', '番茄炒鸡蛋', '清炒时蔬', '香菇鸡汤'];
</script>

<svelte:head>
	<title>饭单 / Fandan</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100svh-4rem)] max-w-md flex-col gap-6 px-4 py-6 md:max-w-6xl md:px-6 md:py-12">
	<section class="grid gap-8 md:grid-cols-[1fr_0.92fr] md:items-center">
		<div class="space-y-7">
			<div class="space-y-4">
				<p class="app-chip bg-secondary text-primary">移动端菜单协作工具</p>
				<div class="space-y-3">
					<h1 class="text-3xl font-semibold leading-tight tracking-normal text-balance sm:text-4xl md:text-6xl">
						先确认饭单，再生成购物清单。
					</h1>
					<p class="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
						给家人、客户或聚餐对象安排菜单，把忌口偏好收齐，再按菜品食材生成采购待办。
					</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<Button href="/app" size="lg" class="h-12 rounded-2xl px-5 text-base shadow-[0_14px_28px_oklch(0.53_0.145_151_/_20%)]">
					进入工作台
					<ArrowRight class="size-4" />
				</Button>
				<Button href="/login" variant="outline" size="lg" class="h-12 rounded-2xl bg-white px-5 text-base">
					登录 / 创建账号
				</Button>
			</div>
		</div>

		<section class="app-panel overflow-hidden">
			<div class="border-b border-border/70 bg-secondary/55 p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-2">
						<p class="app-chip bg-white text-destructive">待确认</p>
						<h2 class="text-2xl font-semibold leading-tight">周五家庭晚餐</h2>
						<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
							<span class="inline-flex items-center gap-1.5"><UsersRound class="size-4" /> 家人聚餐</span>
							<span class="inline-flex items-center gap-1.5"><CalendarCheck2 class="size-4" /> 今晚 18:00</span>
						</p>
					</div>
					<span class="rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-white">去确认</span>
				</div>
				<div class="mt-5 space-y-3">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">已确认 3/5</span>
						<span class="text-muted-foreground">2 人待反馈</span>
					</div>
					<div class="h-2 rounded-full bg-white">
						<div class="h-full w-3/5 rounded-full bg-destructive"></div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-3 border-b border-border/70 bg-white">
				{#each flow as step}
					{@const Icon = step.icon}
					<div class="flex flex-col items-center gap-2 border-r border-border/70 px-3 py-4 last:border-r-0">
						<span class="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
							<Icon class="size-5" />
						</span>
						<span class="text-sm font-semibold">{step.label}</span>
						<span class="text-center text-xs text-muted-foreground">{step.detail}</span>
					</div>
				{/each}
			</div>

			<div class="space-y-4 p-5">
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-semibold">今晚菜单</h3>
					<span class="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">共 4 道菜</span>
				</div>
				<div class="space-y-2">
					{#each dinnerItems as item, index}
						<div class="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-3 py-3">
							<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
								{index + 1}
							</span>
							<span class="min-w-0 flex-1 truncate font-medium">{item}</span>
							<CheckCircle2 class="size-4 text-primary" />
						</div>
					{/each}
				</div>
				<div class="app-soft-panel flex items-center justify-between gap-3 p-4">
					<div>
						<p class="font-semibold">食材准备就绪</p>
						<p class="text-sm text-muted-foreground">可生成 18 项采购清单</p>
					</div>
					<ShoppingBag class="size-6 text-primary" />
				</div>
			</div>
		</section>
	</section>
</main>
