<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
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
	<title>{target.name} / 用餐对象 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<Button href="/app/targets" variant="ghost" size="sm" class="px-0">
				<ArrowLeft class="size-4" />
				返回对象列表
			</Button>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">{target.name}</h1>
			<p class="max-w-2xl text-muted-foreground">
				维护人数、口味、忌口和预算备注。后续饭单会从这里读取对象信息。
			</p>
		</div>
		<Button href={`/app/meal-plans/new?targetId=${target.id}`}>
			<Plus class="size-4" />
			新建饭单
		</Button>
	</section>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title>编辑对象</Card.Title>
				<Card.Description>保存后会立即用于后续创建饭单。</Card.Description>
			</Card.Header>
			<Card.Content>
				<TargetForm {values} {errors} {message} action="?/update" submitLabel="保存修改" />
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			<Card.Root id="meal-plans" class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ClipboardList class="size-5" />
						历史饭单
					</Card.Title>
					<Card.Description>{mealPlans.length} 份关联饭单</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if mealPlans.length === 0}
						<p class="rounded-md border p-3 text-sm text-muted-foreground">暂无历史饭单。</p>
					{:else}
						{#each mealPlans as mealPlan}
							<a class="block rounded-md border p-3 hover:bg-muted" href={`/app/meal-plans/${mealPlan.id}`}>
								<p class="font-medium">{mealPlan.title}</p>
								<p class="text-sm text-muted-foreground">{mealPlan.status} · {mealPlan.startDate || '未设置日期'}</p>
							</a>
						{/each}
					{/if}
					<Button href={`/app/meal-plans/new?targetId=${target.id}`} variant="outline" class="w-full">
						<Plus class="size-4" />
						从此对象新建饭单
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title>删除对象</Card.Title>
					<Card.Description>删除后不会删除已存在饭单，但饭单会失去对象关联。</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/delete" use:enhanceWithFeedback>
						<Button
							type="submit"
							variant="destructive"
							class="w-full"
							data-confirm={`删除对象「${target.name}」？已存在饭单不会删除，但会失去对象关联。`}
							data-pending-label="删除中..."
						>
							删除对象
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</main>
