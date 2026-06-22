<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ChefHat, LockKeyhole, Mail, UserRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const signInForm = $derived(form?.signInForm ?? data.signInForm);
	const signUpForm = $derived(form?.signUpForm ?? data.signUpForm);
</script>

<svelte:head>
	<title>登录饭单 / Fandan</title>
</svelte:head>

<main class="mx-auto grid max-w-md gap-5 px-4 py-6 md:max-w-5xl md:grid-cols-[0.92fr_1fr] md:px-6 md:py-12">
	<section class="app-soft-panel flex flex-col justify-between gap-8 p-5 md:p-7">
		<div class="space-y-5">
			<span class="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
				<ChefHat class="size-7" />
			</span>
			<div class="space-y-3">
				<p class="app-chip bg-white text-primary">移动端工作台</p>
				<h1 class="text-3xl font-semibold leading-tight md:text-4xl">把菜单确认和采购准备放在一个地方。</h1>
				<p class="text-base leading-7 text-muted-foreground">
					登录后继续管理用餐对象、饭单、分享确认和购物清单。
				</p>
			</div>
		</div>
		<div class="grid grid-cols-3 gap-2 text-center text-sm">
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">饭单</span>可复用</p>
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">忌口</span>可确认</p>
			<p class="rounded-2xl bg-white p-3"><span class="block text-lg font-semibold text-primary">清单</span>可勾选</p>
		</div>
	</section>

	<section class="space-y-4">
		<div class="app-panel p-5">
			<div class="mb-5 space-y-1">
				<h2 class="text-2xl font-semibold">登录饭单</h2>
				<p class="text-sm text-muted-foreground">回到你的菜单协作工作台。</p>
			</div>
			<form method="post" action="?/signInEmail" use:enhance class="space-y-4">
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
				<Button type="submit" class="h-12 w-full rounded-2xl text-base">登录</Button>
			</form>
		</div>

		<div class="app-panel p-5">
			<div class="mb-5 space-y-1">
				<h2 class="text-xl font-semibold">创建账号</h2>
				<p class="text-sm text-muted-foreground">使用邮箱和密码创建你的饭单账号。</p>
			</div>
			<form method="post" action="?/signUpEmail" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="signup-name" class="inline-flex items-center gap-1.5"><UserRound class="size-4" />名称</Label>
					<Input id="signup-name" name="name" autocomplete="name" required class="app-input" />
					{#if signUpForm?.errors.name}
						<p class="text-sm text-destructive">{signUpForm.errors.name[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="signup-email">邮箱</Label>
					<Input id="signup-email" name="email" type="email" autocomplete="email" required class="app-input" />
					{#if signUpForm?.errors.email}
						<p class="text-sm text-destructive">{signUpForm.errors.email[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="signup-password">密码</Label>
					<Input id="signup-password" name="password" type="password" autocomplete="new-password" required class="app-input" />
					{#if signUpForm?.errors.password}
						<p class="text-sm text-destructive">{signUpForm.errors.password[0]}</p>
					{/if}
				</div>
				{#if signUpForm?.message}
					<p class="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{signUpForm.message}</p>
				{/if}
				<Button type="submit" variant="outline" class="h-12 w-full rounded-2xl bg-white text-base">注册</Button>
			</form>
		</div>
	</section>
</main>
