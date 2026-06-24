<script lang="ts">
	import { page } from '$app/state';
	import { ClipboardList, Home, UserRound } from 'lucide-svelte';

	const navItems = [
		{ label: '首页', href: '/app', icon: Home, match: (path: string) => path === '/app' },
		{ label: '饭单', href: '/app/meal-plans', icon: ClipboardList, match: (path: string) => path.startsWith('/app/meal-plans') },
		{
			label: '我的',
			href: '/app/settings',
			icon: UserRound,
			match: (path: string) =>
				path.startsWith('/app/settings') ||
				path.startsWith('/app/invitations') ||
				path.startsWith('/app/dishes') ||
				path.startsWith('/app/targets')
		}
	];
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_oklch(0.3_0.04_155_/_8%)] backdrop-blur md:hidden"
	aria-label="移动端主导航"
>
	<div class="mx-auto grid max-w-md grid-cols-3 gap-2">
		{#each navItems as item}
			{@const Icon = item.icon}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition {active
					? 'bg-secondary text-primary'
					: 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
			>
				<Icon class="size-5" />
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
