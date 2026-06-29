<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ClipboardList, Plus } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const target = $derived(data.target as NonNullable<PageData['target']>);
	const mealPlans = $derived(data.mealPlans ?? []);
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const message = $derived(form?.message);
</script>

<svelte:head>
	<title>{target.name} / 家人偏好 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="app-scene-hero">
		<div class="app-scene-hero-media">
			<img src={avatarImage} alt="" />
		</div>
		<div class="app-scene-body -mt-14">
			<Button href="/app/targets" variant="ghost" size="sm" class="mb-1 h-11 justify-start rounded-2xl bg-white/85 px-3 text-muted-foreground">
				<ArrowLeft class="size-4" />
				返回偏好
			</Button>
			<div class="space-y-2">
				<p class="app-chip bg-white text-primary shadow-sm">编辑偏好</p>
				<h1 class="text-3xl font-semibold leading-tight">{target.name}</h1>
				<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">
					维护人数、口味、忌口和预算备注。后续安排饭时会自动带上。
				</p>
			</div>
			<Button href={`/app/meal-plans/new?targetId=${target.id}`} class="mt-2 h-12 rounded-2xl">
				<Plus class="size-4" />
				按这个口味安排
			</Button>
		</div>
	</section>

	<div class="grid gap-4 lg:grid-cols-[1fr_320px]">
		<section class="app-panel space-y-5 p-5">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">偏好内容</h2>
				<p class="text-sm text-muted-foreground">保存后会立即用于后续安排饭。</p>
			</div>
			<TargetForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
		</section>

		<div class="space-y-4">
			<section id="meal-plans" class="app-panel p-5">
				<div class="mb-4 space-y-1">
					<h2 class="flex items-center gap-2 text-xl font-semibold">
						<ClipboardList class="size-5" />
						吃过什么
					</h2>
					<p class="text-sm text-muted-foreground">{mealPlans.length} 次安排</p>
				</div>
				<div class="space-y-3">
					{#if mealPlans.length === 0}
						<p class="rounded-2xl border border-border/80 bg-white p-3 text-sm text-muted-foreground">还没有按这份偏好安排过。</p>
					{:else}
						{#each mealPlans as mealPlan}
							<a class="block rounded-2xl border border-border/80 bg-white p-3 hover:bg-muted" href={`/app/meal-plans/${mealPlan.id}`}>
								<p class="font-medium">{mealPlan.title}</p>
								<p class="text-sm text-muted-foreground">{mealPlan.status} · {mealPlan.startDate || '未设置日期'}</p>
							</a>
						{/each}
					{/if}
					<Button href={`/app/meal-plans/new?targetId=${target.id}`} variant="outline" class="h-12 w-full rounded-2xl bg-white">
						<Plus class="size-4" />
						按这个口味安排
					</Button>
				</div>
			</section>

			<section class="app-panel space-y-4 border-destructive/20 p-5">
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">不再使用</h2>
					<p class="text-sm text-muted-foreground">删除后不会影响已经安排过的饭。</p>
				</div>
				<form method="post" action="?/delete" use:enhanceWithFeedback>
					<Button
						type="submit"
						variant="destructive"
						class="h-12 w-full rounded-2xl"
						data-confirm={`删除偏好「${target.name}」？已存在饭单不会删除。`}
						data-pending-label="删除中..."
					>
						删除偏好
					</Button>
				</form>
			</section>
		</div>
	</div>
</main>
