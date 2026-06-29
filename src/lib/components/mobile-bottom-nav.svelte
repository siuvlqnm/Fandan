<script lang="ts">
	import { page } from '$app/state';
	import { CookingPot, Home, ShoppingBag, Soup } from 'lucide-svelte';

	const navItems = [
		{ label: '今天', href: '/app', icon: Soup, match: (path: string) => path === '/app' || path.startsWith('/app/meal-plans') },
		{
			label: '常做菜',
			href: '/app/dishes',
			icon: CookingPot,
			match: (path: string) => path.startsWith('/app/dishes')
		},
		{ label: '买菜', href: '/app/shopping-lists', icon: ShoppingBag, match: (path: string) => path.startsWith('/app/shopping-lists') },
		{
			label: '家',
			href: '/app/settings',
			icon: Home,
			match: (path: string) =>
				path.startsWith('/app/settings') ||
				path.startsWith('/app/invitations') ||
				path.startsWith('/app/targets')
		}
	];
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/92 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_26px_oklch(0.28_0.035_150_/_10%)] backdrop-blur-xl md:hidden"
	aria-label="移动端主导航"
>
	<div class="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.4rem] border border-border/70 bg-muted/55 p-1">
		{#each navItems as item}
			{@const Icon = item.icon}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition {active
					? 'bg-white text-primary shadow-sm'
					: 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
			>
				<Icon class="size-5" />
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
