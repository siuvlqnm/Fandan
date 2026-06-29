<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { Button } from '$lib/components/ui/button';
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
	<title>{target.name} / 偏好档案 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href="/app/targets" variant="ghost" size="sm" class="h-9 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回偏好列表
		</Button>
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">编辑偏好</p>
			<h1 class="text-3xl font-semibold leading-tight">{target.name}</h1>
			<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">
				维护人数、口味、忌口和预算备注。后续饭单会从这里读取偏好。
			</p>
		</div>
		<Button href={`/app/meal-plans/new?targetId=${target.id}`} class="h-12 rounded-2xl">
			<Plus class="size-4" />
			新建饭单
		</Button>
	</section>

	<div class="grid gap-4 lg:grid-cols-[1fr_320px]">
		<section class="app-panel space-y-5 p-5">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">偏好资料</h2>
				<p class="text-sm text-muted-foreground">保存后会立即用于后续创建饭单。</p>
			</div>
			<TargetForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
		</section>

		<div class="space-y-4">
			<section id="meal-plans" class="app-panel p-5">
				<div class="mb-4 space-y-1">
					<h2 class="flex items-center gap-2 text-xl font-semibold">
						<ClipboardList class="size-5" />
						历史饭单
					</h2>
					<p class="text-sm text-muted-foreground">{mealPlans.length} 份关联饭单</p>
				</div>
				<div class="space-y-3">
					{#if mealPlans.length === 0}
						<p class="rounded-2xl border border-border/80 bg-white p-3 text-sm text-muted-foreground">暂无历史饭单。</p>
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
						用这份偏好安排饭
					</Button>
				</div>
			</section>

			<section class="app-panel space-y-4 border-destructive/20 p-5">
				<div class="space-y-1">
					<h2 class="text-xl font-semibold">删除偏好</h2>
					<p class="text-sm text-muted-foreground">删除后不会删除已存在饭单。</p>
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
