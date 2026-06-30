<script lang="ts">
	import { CookingPot } from 'lucide-svelte';

	type Size = 'sm' | 'md' | 'lg' | 'hero';

	let {
		name,
		category = '',
		size = 'md',
		soft = false
	}: {
		name: string;
		category?: string | null;
		size?: Size;
		soft?: boolean;
	} = $props();

	const initial = $derived((name.trim()[0] ?? '菜').toUpperCase());
	const tone = $derived.by(() => {
		const value = `${category ?? ''} ${name}`.toLowerCase();
		if (/[汤羹汤粥饮]/.test(value)) return 'soup';
		if (/[鱼虾蟹海水产]/.test(value)) return 'fresh';
		if (/[蔬菜素青瓜豆]/.test(value)) return 'green';
		if (/[早餐点心甜面饭粥]/.test(value)) return 'warm';
		return 'home';
	});
</script>

<span class="fd-dish-visual {size} {tone} {soft ? 'soft' : ''}" aria-hidden="true">
	<CookingPot class="icon" strokeWidth={2.2} />
	<span>{initial}</span>
</span>
