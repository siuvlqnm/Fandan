<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import { Plus, Trash2 } from 'lucide-svelte';

	type IngredientFormValues = {
		name?: string | null;
		quantity?: string | null;
		unit?: string | null;
		category?: string | null;
		notes?: string | null;
		sortOrder?: number | string | null;
	};

	type DishFormValues = {
		name?: string | null;
		category?: string | null;
		instructions?: string | null;
		tags?: string[] | null;
		tagsText?: string | null;
		visibility?: string | null;
		ingredients?: IngredientFormValues[] | null;
	};

	type DishFormErrors = Partial<Record<string, string[]>>;

	let {
		values = {},
		errors = {},
		submitLabel = '保存',
		cancelHref = '/app/dishes',
		action,
		message
	}: {
		values?: DishFormValues;
		errors?: DishFormErrors;
		submitLabel?: string;
		cancelHref?: string;
		action?: string;
		message?: string;
	} = $props();

	const emptyIngredient = (): IngredientFormValues => ({
		name: '',
		quantity: '',
		unit: '',
		category: '',
		notes: ''
	});

	const normalizeIngredients = (ingredients: IngredientFormValues[] | null | undefined) =>
		ingredients && ingredients.length > 0 ? ingredients.map((ingredient) => ({ ...emptyIngredient(), ...ingredient })) : [emptyIngredient()];

	let ingredientRows = $state<IngredientFormValues[]>([emptyIngredient()]);
	let ingredientSignature = $state('');

	$effect(() => {
		const nextSignature = JSON.stringify(values.ingredients ?? []);

		if (nextSignature !== ingredientSignature) {
			ingredientRows = normalizeIngredients(values.ingredients);
			ingredientSignature = nextSignature;
		}
	});

	const addIngredient = () => {
		ingredientRows = [...ingredientRows, emptyIngredient()];
	};

	const removeIngredient = (index: number) => {
		ingredientRows = ingredientRows.filter((_, rowIndex) => rowIndex !== index);

		if (ingredientRows.length === 0) {
			ingredientRows = [emptyIngredient()];
		}
	};

	const textAreaClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive min-h-28 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-3 aria-invalid:ring-3 md:text-sm';
	const selectClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-3 md:text-sm';

	const tagsText = $derived(values.tagsText ?? values.tags?.join(', ') ?? '');
</script>

<form method="post" {action} class="space-y-6">
	<div class="grid gap-4 md:grid-cols-[1fr_180px_160px]">
		<div class="space-y-2">
			<Label for="dish-name">菜品名称</Label>
			<Input id="dish-name" name="name" value={values.name ?? ''} placeholder="例如：番茄炒蛋" required />
			{#if errors.name?.[0]}
				<p class="text-sm text-destructive">{errors.name[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="dish-category">分类</Label>
			<Input id="dish-category" name="category" value={values.category ?? ''} placeholder="家常菜" />
			{#if errors.category?.[0]}
				<p class="text-sm text-destructive">{errors.category[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="dish-visibility">可见性</Label>
			<select id="dish-visibility" name="visibility" class={selectClass}>
				<option value="space" selected={(values.visibility ?? 'space') === 'space'}>工作空间</option>
				<option value="private" selected={values.visibility === 'private'}>私有</option>
			</select>
			{#if errors.visibility?.[0]}
				<p class="text-sm text-destructive">{errors.visibility[0]}</p>
			{/if}
		</div>
	</div>

	<div class="space-y-2">
		<Label for="dish-tags">标签</Label>
		<Input id="dish-tags" name="tagsText" value={tagsText} placeholder="快手, 下饭, 儿童友好" />
		<p class="text-sm text-muted-foreground">用逗号分隔，列表页会展示并支持搜索。</p>
		{#if errors.tagsText?.[0]}
			<p class="text-sm text-destructive">{errors.tagsText[0]}</p>
		{/if}
	</div>

	<div class="space-y-2">
		<Label for="dish-instructions">简单做法</Label>
		<textarea
			id="dish-instructions"
			name="instructions"
			class={cn(textAreaClass)}
			placeholder="例如：先炒鸡蛋盛出，再炒番茄，最后混合调味。"
		>{values.instructions ?? ''}</textarea>
		{#if errors.instructions?.[0]}
			<p class="text-sm text-destructive">{errors.instructions[0]}</p>
		{/if}
	</div>

	<section class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-base font-medium">食材</h2>
				<p class="text-sm text-muted-foreground">食材可以稍后再补；空白行不会保存。</p>
			</div>
			<Button type="button" variant="outline" size="sm" onclick={addIngredient}>
				<Plus class="size-4" />
				添加食材
			</Button>
		</div>

		{#if errors.ingredients?.[0]}
			<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errors.ingredients[0]}</p>
		{/if}

		<div class="space-y-3">
			{#each ingredientRows as ingredient, index}
				<div class="rounded-md border p-3">
					<div class="mb-3 flex items-center justify-between gap-3">
						<p class="text-sm font-medium">食材 {index + 1}</p>
						<Button type="button" variant="ghost" size="sm" onclick={() => removeIngredient(index)} aria-label="删除食材">
							<Trash2 class="size-4" />
						</Button>
					</div>
					<input type="hidden" name="ingredientSortOrder" value={index} />
					<div class="grid gap-3 md:grid-cols-[1fr_120px_100px_140px]">
						<div class="space-y-2">
							<Label for={`ingredient-name-${index}`}>名称</Label>
							<Input
								id={`ingredient-name-${index}`}
								name="ingredientName"
								value={ingredient.name ?? ''}
								placeholder="鸡蛋"
							/>
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-quantity-${index}`}>数量</Label>
							<Input
								id={`ingredient-quantity-${index}`}
								name="ingredientQuantity"
								value={ingredient.quantity ?? ''}
								placeholder="3"
							/>
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-unit-${index}`}>单位</Label>
							<Input id={`ingredient-unit-${index}`} name="ingredientUnit" value={ingredient.unit ?? ''} placeholder="个" />
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-category-${index}`}>分类</Label>
							<Input
								id={`ingredient-category-${index}`}
								name="ingredientCategory"
								value={ingredient.category ?? ''}
								placeholder="蛋奶"
							/>
						</div>
					</div>
					<div class="mt-3 space-y-2">
						<Label for={`ingredient-notes-${index}`}>备注</Label>
						<Input
							id={`ingredient-notes-${index}`}
							name="ingredientNotes"
							value={ingredient.notes ?? ''}
							placeholder="例如：常温蛋更好打散"
						/>
					</div>
				</div>
			{/each}
		</div>
	</section>

	{#if message}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{message}</p>
	{/if}

	<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
		<Button href={cancelHref} variant="outline">取消</Button>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
