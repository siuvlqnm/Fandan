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

<nav class="fd-tabbar" aria-label="底部导航">
	{#each navItems as item}
		{@const Icon = item.icon}
		{@const active = item.match(page.url.pathname)}
		<a href={item.href} class="fd-tab {active ? 'active' : ''}" aria-current={active ? 'page' : undefined}>
			<Icon strokeWidth={1.8} />
			<span>{item.label}</span>
		</a>
	{/each}
</nav>
