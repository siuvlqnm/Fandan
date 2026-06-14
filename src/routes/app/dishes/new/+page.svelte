<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, ChefHat } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>新建菜品 / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href="/app/dishes" variant="ghost" size="sm" class="h-9 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回菜品库
		</Button>
		<div class="space-y-2">
			<p class="app-chip bg-secondary text-primary">
				<ChefHat class="size-3.5" />
				菜品库
			</p>
			<h1 class="text-3xl font-semibold leading-tight">新建菜品</h1>
			<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">只填菜名即可保存，食材、标签和做法可以之后再补。</p>
		</div>
	</section>

	<section class="app-panel space-y-5 p-5">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">菜品资料</h2>
			<p class="text-sm text-muted-foreground">食材会用于后续生成购物清单。</p>
		</div>
		<DishForm {values} {errors} submitLabel="创建菜品" />
	</section>
</main>
