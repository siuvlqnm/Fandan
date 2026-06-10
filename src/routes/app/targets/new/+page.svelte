<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>新建用餐对象 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="space-y-2">
		<p class="text-sm text-muted-foreground">用餐对象</p>
		<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">新建对象</h1>
		<p class="max-w-2xl text-muted-foreground">只填名称即可保存，口味、忌口和预算备注可以之后再补。</p>
	</section>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title>对象资料</Card.Title>
			<Card.Description>这些信息会在创建饭单时作为默认参考。</Card.Description>
		</Card.Header>
		<Card.Content>
			<TargetForm {values} {errors} submitLabel="创建对象" />
		</Card.Content>
	</Card.Root>
</main>
