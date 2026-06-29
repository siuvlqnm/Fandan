<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { cn } from '$lib/utils';

	type TargetFormValues = {
		name?: string | null;
		type?: string | null;
		peopleCount?: number | string | null;
		tasteNotes?: string | null;
		dietaryRestrictions?: string | null;
		budgetNotes?: string | null;
		contactNotes?: string | null;
	};

	type TargetFormErrors = Partial<Record<keyof TargetFormValues, string[]>>;

	let {
		values = {},
		errors = {},
		submitLabel = '保存',
		cancelHref = '/app/targets',
		action,
		message
	}: {
		values?: TargetFormValues;
		errors?: TargetFormErrors;
		submitLabel?: string;
		cancelHref?: string;
		action?: string;
		message?: string;
	} = $props();

	const typeOptions = [
		{ value: 'home', label: '家庭' },
		{ value: 'client', label: '特别照顾' },
		{ value: 'gathering', label: '聚餐' },
		{ value: 'other', label: '其他' }
	];

	const fieldClass =
		'app-input min-h-24 py-3 aria-invalid:ring-destructive/20 aria-invalid:border-destructive aria-invalid:ring-3';
	const selectClass = 'app-input h-12 text-sm aria-invalid:ring-destructive/20 aria-invalid:border-destructive aria-invalid:ring-3';
</script>

<form method="post" {action} use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-5">
	<div class="grid gap-4 md:grid-cols-[1fr_180px_160px]">
		<div class="space-y-2">
			<Label for="target-name">名称</Label>
			<Input id="target-name" name="name" value={values.name ?? ''} placeholder="例如：爸妈来吃饭" required class="app-input" />
			{#if errors.name?.[0]}
				<p class="text-sm text-destructive">{errors.name[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="target-type">类型</Label>
			<select id="target-type" name="type" class={selectClass}>
				{#each typeOptions as option}
					<option value={option.value} selected={(values.type ?? 'home') === option.value}>{option.label}</option>
				{/each}
			</select>
			{#if errors.type?.[0]}
				<p class="text-sm text-destructive">{errors.type[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="target-people-count">人数</Label>
			<Input
				id="target-people-count"
				name="peopleCount"
				type="number"
				min="1"
				max="999"
				value={values.peopleCount ?? 1}
				class="app-input"
			/>
			{#if errors.peopleCount?.[0]}
				<p class="text-sm text-destructive">{errors.peopleCount[0]}</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="target-taste-notes">口味偏好</Label>
			<textarea
				id="target-taste-notes"
				name="tasteNotes"
				class={cn(fieldClass)}
				placeholder="例如：偏清淡，孩子喜欢番茄和鸡蛋"
			>{values.tasteNotes ?? ''}</textarea>
			{#if errors.tasteNotes?.[0]}
				<p class="text-sm text-destructive">{errors.tasteNotes[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="target-dietary-restrictions">忌口和限制</Label>
			<textarea
				id="target-dietary-restrictions"
				name="dietaryRestrictions"
				class={cn(fieldClass)}
				placeholder="例如：老人少盐，不吃香菜"
			>{values.dietaryRestrictions ?? ''}</textarea>
			{#if errors.dietaryRestrictions?.[0]}
				<p class="text-sm text-destructive">{errors.dietaryRestrictions[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="target-budget-notes">预算备注</Label>
			<textarea
				id="target-budget-notes"
				name="budgetNotes"
				class={cn(fieldClass)}
				placeholder="例如：日常晚餐控制在 120 元以内"
			>{values.budgetNotes ?? ''}</textarea>
			{#if errors.budgetNotes?.[0]}
				<p class="text-sm text-destructive">{errors.budgetNotes[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="target-contact-notes">安排备注</Label>
			<textarea
				id="target-contact-notes"
				name="contactNotes"
				class={cn(fieldClass)}
				placeholder="例如：周末来吃，尽量提前一天买菜"
			>{values.contactNotes ?? ''}</textarea>
			{#if errors.contactNotes?.[0]}
				<p class="text-sm text-destructive">{errors.contactNotes[0]}</p>
			{/if}
		</div>
	</div>

	{#if message}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{message}</p>
	{/if}

	<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
		<Button href={cancelHref} variant="outline" class="h-12 rounded-2xl bg-white">取消</Button>
		<Button type="submit" class="h-12 rounded-2xl" data-pending-label="保存中...">{submitLabel}</Button>
	</div>
</form>
