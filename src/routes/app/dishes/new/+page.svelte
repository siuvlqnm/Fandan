<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>新建菜品 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="space-y-2">
		<p class="text-sm text-muted-foreground">菜品库</p>
		<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">新建菜品</h1>
		<p class="max-w-2xl text-muted-foreground">只填菜名即可保存，食材、标签和做法可以之后再补。</p>
	</section>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title>菜品资料</Card.Title>
			<Card.Description>食材会用于后续生成购物清单。</Card.Description>
		</Card.Header>
		<Card.Content>
			<DishForm {values} {errors} submitLabel="创建菜品" />
		</Card.Content>
	</Card.Root>
</main>
