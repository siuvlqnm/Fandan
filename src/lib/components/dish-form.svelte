<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		DISH_CATEGORY_OPTIONS,
		DISH_TAG_OPTIONS,
		INGREDIENT_CATEGORY_OPTIONS,
		INGREDIENT_UNIT_OPTIONS
	} from '$lib/domain/food-options';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
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
		baseServings?: number | string | null;
		servingBasisConfirmed?: boolean | null;
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
		message,
		aiUncertainFields = [],
		expectedUpdatedAt
	}: {
		values?: DishFormValues;
		errors?: DishFormErrors;
		submitLabel?: string;
		cancelHref?: string;
		action?: string;
		message?: string;
		aiUncertainFields?: string[];
		expectedUpdatedAt?: string | null;
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
		'app-input min-h-28 py-3 aria-invalid:ring-destructive/20 aria-invalid:border-destructive aria-invalid:ring-3';
	const selectClass = 'app-input h-12 text-sm';

	const tagsText = $derived(values.tagsText ?? values.tags?.join(', ') ?? '');
	const selectedTags = $derived(
		new Set(
			tagsText
				.split(/[,，]/)
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	);
	const selectedOption = (value: string | number | null | undefined, options: readonly string[], fallback = '') => {
		const normalized = String(value ?? '').trim();
		if (!normalized) return '';
		return options.includes(normalized) ? normalized : fallback;
	};
	const isAiUncertain = (field: string) =>
		aiUncertainFields.some((uncertainField) =>
			uncertainField === field || uncertainField.startsWith(`${field}.`)
		);
</script>

<form method="post" {action} use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-6">
	{#if expectedUpdatedAt}
		<input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
	{/if}
	<div class="grid gap-4 md:grid-cols-[1fr_180px_160px]">
		<div class="space-y-2">
			<Label for="dish-name">菜品名称</Label>
			<Input id="dish-name" name="name" value={values.name ?? ''} placeholder="例如：番茄炒蛋" required class="app-input" />
			{#if errors.name?.[0]}
				<p class="text-sm text-destructive">{errors.name[0]}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="dish-category">分类</Label>
			<select id="dish-category" name="category" class={selectClass}>
				<option value="" selected={!values.category}>选择分类</option>
				{#each DISH_CATEGORY_OPTIONS as category}
					<option value={category} selected={selectedOption(values.category, DISH_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
				{/each}
			</select>
			{#if isAiUncertain('category')}<p class="text-sm text-amber-800">AI 建议，保存前请核对。</p>{/if}
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
		<Label for="dish-base-servings">食材基准份数</Label>
		<Input
			id="dish-base-servings"
			name="baseServings"
			type="number"
			min="1"
			max="999"
			value={values.baseServings ?? 1}
			required
			class="app-input"
		/>
		<p class="text-sm text-muted-foreground">下方全部食材共同对应几人份。购物清单会按“饭单份数 ÷ 基准份数”缩放。</p>
		{#if isAiUncertain('baseServings')}
			<p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">原描述没有明确人数，当前显示 1 人份占位值。请修改为真实基准份数后再保存。</p>
		{/if}
		{#if values.servingBasisConfirmed === false}
			<p class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">这是旧菜品的安全默认值。请核对份数；保存后即视为确认。</p>
		{/if}
		{#if errors.baseServings?.[0]}
			<p class="text-sm text-destructive">{errors.baseServings[0]}</p>
		{/if}
	</div>

	<div class="space-y-2">
		<Label for="dish-tags">标签</Label>
		<div id="dish-tags" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each DISH_TAG_OPTIONS as tag}
				<label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border/80 bg-white px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
					<input type="checkbox" name="tags" value={tag} checked={selectedTags.has(tag)} class="size-4 rounded" />
					<span>{tag}</span>
				</label>
			{/each}
		</div>
		<p class="text-sm text-muted-foreground">选择常用标签，列表页会展示并支持搜索。</p>
		{#if isAiUncertain('tags')}<p class="text-sm text-amber-800">AI 建议，保存前请核对。</p>{/if}
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
		{#if isAiUncertain('instructions')}<p class="text-sm text-amber-800">AI 建议，保存前请核对步骤。</p>{/if}
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
			<Button type="button" variant="outline" size="sm" class="h-11 rounded-xl bg-white" onclick={addIngredient}>
				<Plus class="size-4" />
				添加食材
			</Button>
		</div>

		{#if errors.ingredients?.[0]}
			<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errors.ingredients[0]}</p>
		{/if}

		<div class="space-y-3">
			{#each ingredientRows as ingredient, index}
				<div class="rounded-2xl border border-border/80 bg-white p-3">
					<div class="mb-3 flex items-center justify-between gap-3">
						<div>
							<p class="text-sm font-medium">食材 {index + 1}</p>
							{#if isAiUncertain(`ingredients.${index}`)}<p class="text-xs text-amber-800">AI 建议，数量和单位请核对</p>{/if}
						</div>
						<Button type="button" variant="ghost" size="sm" class="size-11 p-0" onclick={() => removeIngredient(index)} aria-label="删除食材">
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
								class="app-input"
							/>
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-quantity-${index}`}>数量</Label>
							<Input
								id={`ingredient-quantity-${index}`}
								name="ingredientQuantity"
								value={ingredient.quantity ?? ''}
								placeholder="3"
								class="app-input"
							/>
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-unit-${index}`}>单位</Label>
							<select id={`ingredient-unit-${index}`} name="ingredientUnit" class={selectClass}>
								<option value="" selected={!ingredient.unit}>选择单位</option>
								{#each INGREDIENT_UNIT_OPTIONS as unit}
									<option value={unit} selected={selectedOption(ingredient.unit, INGREDIENT_UNIT_OPTIONS, '适量') === unit}>{unit}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-2">
							<Label for={`ingredient-category-${index}`}>分类</Label>
							<select id={`ingredient-category-${index}`} name="ingredientCategory" class={selectClass}>
								<option value="" selected={!ingredient.category}>选择分类</option>
								{#each INGREDIENT_CATEGORY_OPTIONS as category}
									<option value={category} selected={selectedOption(ingredient.category, INGREDIENT_CATEGORY_OPTIONS, '其他') === category}>{category}</option>
								{/each}
							</select>
						</div>
					</div>
					<div class="mt-3 space-y-2">
						<Label for={`ingredient-notes-${index}`}>备注</Label>
						<Input
							id={`ingredient-notes-${index}`}
							name="ingredientNotes"
							value={ingredient.notes ?? ''}
							placeholder="例如：常温蛋更好打散"
							class="app-input"
						/>
					</div>
				</div>
			{/each}
		</div>
	</section>

	{#if message}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{message}</p>
	{/if}

	<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
		<Button href={cancelHref} variant="outline" class="h-12 rounded-2xl bg-white">取消</Button>
		<Button type="submit" class="h-12 rounded-2xl" data-pending-label="保存中...">{submitLabel}</Button>
	</div>
</form>
