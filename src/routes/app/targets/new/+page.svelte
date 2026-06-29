<script lang="ts">
	import TargetForm from '$lib/components/target-form.svelte';
	import { ArrowLeft, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>新建偏好 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="target-new">
	<header class="fd-topbar with-back">
		<a href="/app/targets" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>加一个偏好</h1>
				<p>存好人数和口味，安排饭时一键带入</p>
			</span>
		</a>
		<a href="/app/targets" class="fd-ghost-btn">取消</a>
	</header>

	<section class="fd-page-title">
		<span class="fd-eyebrow green"><UsersRound class="size-3.5" /> 家人偏好</span>
		<h2>新建偏好</h2>
		<p>只填名称即可保存，口味、忌口和预算备注可以之后再补。</p>
	</section>

	<section class="fd-section-head">
		<div>
			<h3>偏好内容</h3>
			<p>这些信息会在安排饭时作为默认参考</p>
		</div>
	</section>

	<div class="fd-form-card">
		<TargetForm {values} {errors} submitLabel="保存偏好" />
	</div>
</main>
