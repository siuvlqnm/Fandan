<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import { ArrowLeft, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>新建家人偏好 / 饭单</title>
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
				<p class="app-chip bg-white text-primary shadow-sm">
					<UsersRound class="size-3.5" />
					家人偏好
				</p>
				<h1 class="text-3xl font-semibold leading-tight">新建偏好</h1>
				<p class="text-sm leading-6 text-muted-foreground md:max-w-2xl">只填名称即可保存，口味、忌口和预算备注可以之后再补。</p>
			</div>
		</div>
	</section>

	<section class="app-panel space-y-5 p-5">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">偏好内容</h2>
			<p class="text-sm text-muted-foreground">这些信息会在安排饭时作为默认参考。</p>
		</div>
		<TargetForm {values} {errors} submitLabel="创建偏好" />
	</section>
</main>
