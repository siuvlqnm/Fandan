<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import participantGrid from '$lib/assets/avatars/participant-grid-small.png';
	import {
		ArrowRight,
		ChefHat,
		ClipboardCheck,
		MessageCircle,
		ShoppingBag
	} from 'lucide-svelte';

	const flow = [
		{ label: '安排菜品', detail: '按日期和餐别组织饭单', icon: ChefHat },
		{ label: '分享确认', detail: '收集忌口、偏好和意见', icon: MessageCircle },
		{ label: '生成清单', detail: '按菜品食材整理采购项', icon: ShoppingBag }
	];
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
						给家人或聚餐安排菜单，把忌口偏好收齐，再按常做菜食材生成买菜清单。
					</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<Button href="/app" size="lg" class="h-12 rounded-2xl px-5 text-base shadow-[0_14px_28px_oklch(0.53_0.145_151_/_20%)]">
					今天吃什么
					<ArrowRight class="size-4" />
				</Button>
				<Button href="/login" variant="outline" size="lg" class="h-12 rounded-2xl bg-white px-5 text-base">
					登录 / 创建账号
				</Button>
			</div>
		</div>

		<section class="app-panel overflow-hidden">
			<div class="space-y-4 border-b border-border/70 bg-secondary/55 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="space-y-1">
						<p class="app-chip bg-white text-primary">饭单工作流</p>
						<h2 class="text-2xl font-semibold leading-tight">从菜单确认到采购准备</h2>
					</div>
					<img src={participantGrid} alt="家人参与菜单确认" class="size-16 rounded-2xl object-cover shadow-sm" />
				</div>
				<p class="text-sm leading-6 text-muted-foreground">菜品、反馈和购物项始终围绕同一份饭单更新，方便下次继续复用。</p>
			</div>

			<div class="divide-y divide-border/70 bg-white">
				{#each flow as step}
					{@const Icon = step.icon}
					<div class="flex items-center gap-3 px-4 py-4">
						<span class="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
							<Icon class="size-5" />
						</span>
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-semibold">{step.label}</span>
							<span class="block text-sm text-muted-foreground">{step.detail}</span>
						</span>
						<ClipboardCheck class="size-5 text-primary" />
					</div>
				{/each}
			</div>
		</section>
	</section>
</main>
