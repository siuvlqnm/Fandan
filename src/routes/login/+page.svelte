<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowRight, ChefHat, LockKeyhole, Mail } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const signInForm = $derived(form?.signInForm ?? data.signInForm);
	const registerHref = $derived(data.registerNext ? `/register?next=${encodeURIComponent(data.registerNext)}` : '/register');
</script>

<svelte:head>
	<title>登录饭单 / Fandan</title>
</svelte:head>

<main class="mx-auto grid min-h-[calc(100svh-5rem)] max-w-md content-center gap-5 px-4 py-6 md:max-w-5xl md:grid-cols-[0.92fr_1fr] md:px-6 md:py-12">
	<section class="app-soft-panel hidden flex-col justify-between gap-8 p-5 md:flex md:p-7">
		<div class="space-y-5">
			<span class="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
				<ChefHat class="size-7" />
			</span>
			<div class="space-y-3">
				<p class="app-chip bg-white text-primary">饭单 App</p>
				<h1 class="text-3xl font-semibold leading-tight md:text-4xl">把菜单确认和采购准备放在一个地方。</h1>
				<p class="text-base leading-7 text-muted-foreground">
					登录后继续安排下一顿、确认菜单和整理买菜清单。
				</p>
			</div>
		</div>
		<div class="grid grid-cols-3 gap-2 text-center text-sm">
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">饭单</span>可复用</p>
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">忌口</span>可确认</p>
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">清单</span>可勾选</p>
		</div>
	</section>

	<section class="app-panel p-5 md:p-7">
		<div class="mb-6 flex items-center gap-3 md:hidden">
			<span class="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ChefHat class="size-6" /></span>
			<div><p class="font-semibold">饭单 Fandan</p><p class="text-xs text-muted-foreground">安排一顿饭，从这里继续</p></div>
		</div>
		<div class="mb-6 space-y-1">
			<h2 class="text-2xl font-semibold">登录饭单</h2>
			<p class="text-sm text-muted-foreground">回到你的家庭饭单。</p>
		</div>
		<form method="post" action="?/signInEmail" use:enhanceWithFeedback={{ pendingLabel: '登录中...' }} class="space-y-4">
			<input type="hidden" name="next" value={data.next} />
			<div class="space-y-2">
				<Label for="signin-email" class="inline-flex items-center gap-1.5"><Mail class="size-4" />邮箱</Label>
				<Input id="signin-email" name="email" type="email" autocomplete="email" required class="app-input" />
				{#if signInForm?.errors.email}
					<p class="text-sm text-destructive">{signInForm.errors.email[0]}</p>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="signin-password" class="inline-flex items-center gap-1.5"><LockKeyhole class="size-4" />密码</Label>
				<Input id="signin-password" name="password" type="password" autocomplete="current-password" required class="app-input" />
				{#if signInForm?.errors.password}
					<p class="text-sm text-destructive">{signInForm.errors.password[0]}</p>
				{/if}
			</div>
			{#if signInForm?.message}
				<p class="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{signInForm.message}</p>
			{/if}
			<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="登录中...">登录</Button>
		</form>
		<div class="mt-6 border-t border-border/70 pt-5 text-center">
			<p class="text-sm text-muted-foreground">第一次使用饭单？</p>
			<Button href={registerHref} variant="ghost" class="mt-2 h-11 w-full rounded-2xl">创建账号并安排第一顿饭 <ArrowRight class="size-4" /></Button>
		</div>
	</section>
</main>
