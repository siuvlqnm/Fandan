<script lang="ts">
	import { Check } from 'lucide-svelte';

	type MealFlowStep = 'arrange' | 'confirm' | 'shop' | 'done' | 'archived';

	type Props = {
		step: MealFlowStep;
		archived?: boolean;
		class?: string;
	};

	let { step, archived = false, class: klass = '' }: Props = $props();

	const STEPS = [
		{ key: 'arrange', label: '安排' },
		{ key: 'confirm', label: '确认' },
		{ key: 'shop', label: '买菜' },
		{ key: 'done', label: '完成' }
	] as const;

	const order: Record<MealFlowStep, number> = {
		arrange: 0,
		confirm: 1,
		shop: 2,
		done: 3,
		archived: 3
	};

	const currentIndex = $derived(order[step]);

	function stateFor(index: number): 'done' | 'current' | 'todo' {
		if (archived) return 'todo';
		if (index < currentIndex) return 'done';
		if (index === currentIndex) return 'current';
		return 'todo';
	}
</script>

<div class="fd-flow-steps {klass}" aria-label="饭单流程">
	{#each STEPS as s, i}
		{@const state = stateFor(i)}
		<div
			class="fd-flow-step {state === 'done'
				? 'is-done'
				: state === 'current'
					? 'is-current'
					: ''} {archived ? 'is-archived' : ''}"
		>
			<span class="n">
				{#if state === 'done'}<Check class="size-3.5" strokeWidth={3} />{:else}{i + 1}{/if}
			</span>
			<span class="label">{s.label}</span>
		</div>
	{/each}
</div>
