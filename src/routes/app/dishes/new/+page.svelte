<script lang="ts">
	import DishForm from '$lib/components/dish-form.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import lunchImage from '$lib/assets/meal-ui/lunch.jpg';
	import { ArrowLeft, ChefHat, Sparkles } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const ai = $derived(form?.ai);
</script>

<svelte:head>
	<title>新建菜品 / 饭单</title>
</svelte:head>

<main class="fd-screen" data-testid="dish-new">
	<header class="fd-topbar with-back">
		<a href="/app/dishes" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>加一道常做菜</h1>
				<p>写一次，以后买菜自动带</p>
			</span>
		</a>
		<a href="/app/dishes" class="fd-ghost-btn">取消</a>
	</header>

	<!-- 封面 -->
	<section class="fd-hero-card" style="margin-top:14px;grid-template-columns:minmax(0,1fr) 110px;min-height:120px;">
		<div class="fd-hero-copy">
			<h3 style="font-size:18px;">菜的照片</h3>
			<p>有图一眼认得出，买菜时也好对。</p>
			<div class="mini">
				<span class="fd-pill muted">暂未上传</span>
			</div>
		</div>
		<div class="fd-hero-media" style="display:grid;place-items:center;background:rgba(46,138,45,.06);">
			<ChefHat class="size-10" style="color:var(--fd-green);opacity:.5;" />
		</div>
	</section>

	<!-- AI 草稿 -->
	<section class="fd-soft-card" style="margin-top:14px;display:grid;gap:12px;">
		<div style="display:flex;align-items:flex-start;gap:10px;">
			<span class="fd-round-btn" style="width:40px;height:40px;font-size:18px;background:var(--fd-green-soft);color:var(--fd-green-deep);border-color:transparent;"><Sparkles class="size-5" /></span>
			<div>
				<strong style="display:block;font-size:15px;font-weight:850;">一句话补全草稿</strong>
				<span style="display:block;margin-top:2px;color:var(--fd-muted);font-size:12px;line-height:1.4;">例如「番茄炒蛋，3 人份，少油」。AI 只填入下面的表单，不会自动保存。</span>
			</div>
		</div>
		<form method="post" action="?/draft" use:enhanceWithFeedback={{ pendingLabel: '正在整理草稿...' }} style="display:grid;gap:10px;">
			<label for="dish-draft-prompt" class="sr-only">菜品描述</label>
			<textarea id="dish-draft-prompt" name="prompt" maxlength="500" class="fd-textarea" style="min-height:80px;" placeholder="写下菜名、人数和口味偏好">{ai?.prompt ?? ''}</textarea>
			<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
				<span style="font-size:11px;color:var(--fd-muted);line-height:1.3;max-width:60%;">不推断过敏忌口；不确定内容会标成待核对。</span>
				<button type="submit" class="fd-ghost-btn" data-pending-label="正在整理草稿..." disabled={!data.aiAvailable}>
					<Sparkles class="size-4" /> AI 帮写
				</button>
			</div>
		</form>
		{#if !data.aiAvailable}
			<p style="margin:0;font-size:12px;color:var(--fd-muted);">AI 补全当前未配置；下面的手动表单仍可正常使用。</p>
		{:else if ai?.status === 'error'}
			<p class="fd-state-pill coral" style="justify-content:flex-start;" role="alert">{ai.message}</p>
		{:else if ai?.status === 'draft'}
			<div class="fd-soft-card" style="background:var(--fd-green-soft);border-color:transparent;" aria-live="polite">
				<strong style="display:block;font-size:13px;font-weight:850;color:var(--fd-green-deep);">草稿已填入，尚未保存</strong>
				<span style="display:block;margin-top:3px;font-size:12px;color:#4f6a4f;line-height:1.4;">请逐项编辑、删除或确认。点底部「保存常做菜」后才会写入。</span>
				{#if ai.notes.length > 0}
					<ul style="margin:8px 0 0;padding-left:18px;font-size:12px;color:#7a5b1e;line-height:1.5;">
						{#each ai.notes as note}<li>{note}</li>{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	<section class="fd-section-head">
		<div>
			<h3>怎么做这道菜</h3>
			<p>食材会用于后续生成买菜清单</p>
		</div>
	</section>

	<div class="fd-form-card">
		<DishForm
			{values}
			{errors}
			action="?/create"
			aiUncertainFields={ai?.status === 'draft' ? ai.uncertainFields : []}
			message={ai?.status === 'draft' ? '这是可编辑的 AI 草稿。核对所有待确认内容后再保存。' : undefined}
			submitLabel={ai?.status === 'draft' ? '确认并创建菜品' : '保存常做菜'}
		/>
	</div>
</main>
