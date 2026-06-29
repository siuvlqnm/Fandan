<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { ChefHat, HeartHandshake } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
	const isAppRoute = $derived(page.url.pathname.startsWith('/app'));
	const isShareRoute = $derived(page.url.pathname.startsWith('/share/'));

	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content={isAppRoute ? '#f7faf4' : '#ffffff'} />
</svelte:head>

<div class="min-h-svh bg-background text-foreground {isAppRoute ? 'app-shell' : ''}">
	{#if !isAppRoute && !isShareRoute}
		<header class="sticky top-0 z-30 border-b border-border/70 bg-white/90 backdrop-blur">
			<div class="mx-auto flex h-16 max-w-md items-center justify-between px-4 md:max-w-6xl">
				<a href="/" class="flex items-center gap-3 text-sm font-semibold">
					<span class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
						<ChefHat class="size-5" />
					</span>
					<span class="leading-tight">
						<span class="block text-base">饭单</span>
						<span class="block text-xs font-normal text-muted-foreground">Fandan</span>
					</span>
				</a>
				<nav class="flex items-center gap-1 text-sm text-muted-foreground">
					<a class="hidden rounded-xl px-3 py-2 hover:bg-muted hover:text-foreground sm:inline-flex" href="/app">工作台</a>
					{#if data.user}
						<form method="post" action="/logout">
							<button class="rounded-xl px-3 py-2 hover:bg-muted hover:text-foreground" type="submit">退出</button>
						</form>
					{:else}
						<a class="rounded-xl px-3 py-2 hover:bg-muted hover:text-foreground" href="/login">登录</a>
					{/if}
					<a class="hidden items-center gap-1 rounded-xl px-3 py-2 hover:bg-muted hover:text-foreground sm:inline-flex" href="/api/health">
						<HeartHandshake class="size-4" />
						健康检查
					</a>
				</nav>
			</div>
		</header>
	{/if}
	{@render children()}
</div>
