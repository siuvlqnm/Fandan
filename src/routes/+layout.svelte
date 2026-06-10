<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ChefHat } from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-svh bg-background text-foreground">
	<header class="border-b bg-background/95">
		<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
			<a href="/" class="flex items-center gap-2 text-sm font-semibold">
				<span class="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
					<ChefHat class="size-4" />
				</span>
				<span>饭单</span>
			</a>
			<nav class="flex items-center gap-2 text-sm text-muted-foreground">
				<a class="rounded-md px-2 py-1 hover:bg-muted hover:text-foreground" href="/login">登录</a>
				<a class="rounded-md px-2 py-1 hover:bg-muted hover:text-foreground" href="/api/health">健康检查</a>
			</nav>
		</div>
	</header>
	{@render children()}
</div>
