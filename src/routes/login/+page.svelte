<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const signInForm = $derived(form?.signInForm ?? data.signInForm);
	const signUpForm = $derived(form?.signUpForm ?? data.signUpForm);
</script>

<svelte:head>
	<title>登录饭单 / Fandan</title>
</svelte:head>

<main class="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-2 md:py-12">
	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title>登录饭单</Card.Title>
			<Card.Description>创建者登录后管理用餐对象、饭单和购物清单。</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="post" action="?/signInEmail" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="signin-email">邮箱</Label>
					<Input id="signin-email" name="email" type="email" autocomplete="email" required />
					{#if signInForm?.errors.email}
						<p class="text-sm text-destructive">{signInForm.errors.email[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="signin-password">密码</Label>
					<Input id="signin-password" name="password" type="password" autocomplete="current-password" required />
					{#if signInForm?.errors.password}
						<p class="text-sm text-destructive">{signInForm.errors.password[0]}</p>
					{/if}
				</div>
				{#if signInForm?.message}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{signInForm.message}</p>
				{/if}
				<Button type="submit" class="w-full">登录</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="rounded-lg">
		<Card.Header>
			<Card.Title>创建账号</Card.Title>
			<Card.Description>第一版使用 Better Auth 邮箱密码能力，后续可切换 magic link。</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="post" action="?/signUpEmail" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="signup-name">名称</Label>
					<Input id="signup-name" name="name" autocomplete="name" required />
					{#if signUpForm?.errors.name}
						<p class="text-sm text-destructive">{signUpForm.errors.name[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="signup-email">邮箱</Label>
					<Input id="signup-email" name="email" type="email" autocomplete="email" required />
					{#if signUpForm?.errors.email}
						<p class="text-sm text-destructive">{signUpForm.errors.email[0]}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label for="signup-password">密码</Label>
					<Input id="signup-password" name="password" type="password" autocomplete="new-password" required />
					{#if signUpForm?.errors.password}
						<p class="text-sm text-destructive">{signUpForm.errors.password[0]}</p>
					{/if}
				</div>
				{#if signUpForm?.message}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{signUpForm.message}</p>
				{/if}
				<Button type="submit" variant="outline" class="w-full">注册</Button>
			</form>
		</Card.Content>
	</Card.Root>
</main>
