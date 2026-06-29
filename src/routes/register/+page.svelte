<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, ChefHat, LockKeyhole, Mail, UserRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const signUpForm = $derived(form?.signUpForm ?? data.signUpForm);
	const loginHref = $derived(data.loginNext ? `/login?next=${encodeURIComponent(data.loginNext)}` : '/login');
</script>

<svelte:head>
	<title>创建饭单账号 / Fandan</title>
</svelte:head>

<main class="mx-auto grid min-h-[calc(100svh-5rem)] max-w-md content-center gap-5 px-4 py-6 md:max-w-5xl md:grid-cols-[0.92fr_1fr] md:px-6 md:py-12">
	<section class="app-soft-panel hidden flex-col justify-between gap-8 p-5 md:flex md:p-7">
		<div class="space-y-5">
			<span class="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><ChefHat class="size-7" /></span>
			<div class="space-y-3">
				<p class="app-chip bg-white text-primary">第一次使用</p>
				<h1 class="text-3xl font-semibold leading-tight md:text-4xl">先安排一顿饭，再慢慢认识其他功能。</h1>
				<p class="text-base leading-7 text-muted-foreground">注册只需要三项信息，完成后直接开始决定吃什么。</p>
			</div>
		</div>
		<div class="rounded-2xl bg-white p-4 text-sm leading-6 text-muted-foreground">不需要先理解复杂设置，先把下一顿安排好。</div>
	</section>

	<section class="app-panel p-5 md:p-7">
		<Button href={loginHref} variant="ghost" size="sm" class="mb-5 h-11 justify-start px-0 text-muted-foreground"><ArrowLeft class="size-4" />返回登录</Button>
		<div class="mb-6 flex items-center gap-3 md:hidden">
			<span class="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ChefHat class="size-6" /></span>
			<div><p class="font-semibold">饭单 Fandan</p><p class="text-xs text-muted-foreground">创建账号后安排第一顿饭</p></div>
		</div>
		<div class="mb-6 space-y-1">
			<h2 class="text-2xl font-semibold">创建账号</h2>
			<p class="text-sm text-muted-foreground">只填写名称、邮箱和密码。</p>
		</div>
		<form method="post" action="?/signUpEmail" use:enhanceWithFeedback={{ pendingLabel: '注册中...' }} class="space-y-4">
			<input type="hidden" name="next" value={data.next} />
			<div class="space-y-2">
				<Label for="signup-name" class="inline-flex items-center gap-1.5"><UserRound class="size-4" />名称</Label>
				<Input id="signup-name" name="name" autocomplete="name" required class="app-input" />
				{#if signUpForm?.errors.name}<p class="text-sm text-destructive">{signUpForm.errors.name[0]}</p>{/if}
			</div>
			<div class="space-y-2">
				<Label for="signup-email" class="inline-flex items-center gap-1.5"><Mail class="size-4" />邮箱</Label>
				<Input id="signup-email" name="email" type="email" autocomplete="email" required class="app-input" />
				{#if signUpForm?.errors.email}<p class="text-sm text-destructive">{signUpForm.errors.email[0]}</p>{/if}
			</div>
			<div class="space-y-2">
				<Label for="signup-password" class="inline-flex items-center gap-1.5"><LockKeyhole class="size-4" />密码</Label>
				<Input id="signup-password" name="password" type="password" autocomplete="new-password" required class="app-input" />
				<p class="text-xs text-muted-foreground">至少 8 位。</p>
				{#if signUpForm?.errors.password}<p class="text-sm text-destructive">{signUpForm.errors.password[0]}</p>{/if}
			</div>
			{#if signUpForm?.message}<p class="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{signUpForm.message}</p>{/if}
			<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="注册中...">创建账号并安排第一顿饭</Button>
		</form>
	</section>
</main>
