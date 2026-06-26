import { fail, redirect } from '@sveltejs/kit';
import {
	createDish,
	dishFormSchema,
	dishFormToCreateInput,
	type DishFormInput
} from '$lib/server/dishes';
import { requireUserSpace } from '$lib/server/context';
import {
	DISH_CATEGORY_OPTIONS,
	INGREDIENT_CATEGORY_OPTIONS,
	INGREDIENT_UNIT_OPTIONS,
	normalizeDishTags,
	normalizeOptionalOption
} from '$lib/domain/food-options';
import {
	createWorkersAiDishDraftProvider,
	DishDraftError,
	generateDishDraft
} from '$lib/server/ai/dish-drafts';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

const emptyValues = {
	name: '',
	category: '',
	instructions: '',
	baseServings: 1,
	tagsText: '',
	visibility: 'space',
	ingredients: []
};

const readList = (formData: FormData, name: string) => formData.getAll(name).map((value) => String(value ?? ''));

const dishDraftPromptSchema = z
	.string()
	.trim()
	.min(2, '请至少写下菜名')
	.max(500, '描述请控制在 500 字以内');

export const _readDishForm = async (request: Request) => {
	const formData = await request.formData();
	const names = readList(formData, 'ingredientName');
	const quantities = readList(formData, 'ingredientQuantity');
	const units = readList(formData, 'ingredientUnit');
	const categories = readList(formData, 'ingredientCategory');
	const notes = readList(formData, 'ingredientNotes');
	const sortOrders = readList(formData, 'ingredientSortOrder');

	const selectedTags = normalizeDishTags(formData.getAll('tags').map((value) => String(value ?? '')));

	const ingredients = names
		.map((name, index) => ({
			name,
			quantity: quantities[index] ?? '',
			unit: normalizeOptionalOption(units[index] ?? '', INGREDIENT_UNIT_OPTIONS) ?? '',
			category: normalizeOptionalOption(categories[index] ?? '', INGREDIENT_CATEGORY_OPTIONS) ?? '',
			notes: notes[index] ?? '',
			sortOrder: Number(sortOrders[index] ?? index)
		}))
		.filter((ingredient) =>
			[ingredient.name, ingredient.quantity, ingredient.unit, ingredient.category, ingredient.notes].some((value) =>
				value.trim()
			)
		);

	return {
		name: String(formData.get('name') ?? ''),
		category: normalizeOptionalOption(String(formData.get('category') ?? ''), DISH_CATEGORY_OPTIONS) ?? '',
		instructions: String(formData.get('instructions') ?? ''),
		baseServings: String(formData.get('baseServings') ?? '1'),
		tagsText: selectedTags.join(', '),
		tags: selectedTags,
		visibility: String(formData.get('visibility') ?? 'space'),
		ingredients,
		expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? '')
	};
};

export const _dishFieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	return {
		values: emptyValues,
		aiAvailable: Boolean((event.platform?.env as (Env & { AI?: Ai }) | undefined)?.AI)
	};
};

export const actions: Actions = {
	draft: async (event) => {
		await requireUserSpace(event);
		const formData = await event.request.formData();
		const prompt = String(formData.get('prompt') ?? '');
		const promptResult = dishDraftPromptSchema.safeParse(prompt);

		if (!promptResult.success) {
			return fail(400, {
				values: { ...emptyValues, name: prompt.trim().slice(0, 80) },
				ai: {
					status: 'error' as const,
					prompt,
					message: promptResult.error.issues[0]?.message ?? '请写下菜名或一句描述。',
					retryable: false
				}
			});
		}

		const env = event.platform?.env as (Env & { AI?: Ai; AI_DISH_MODEL?: string }) | undefined;
		const provider = createWorkersAiDishDraftProvider(env?.AI, env?.AI_DISH_MODEL);

		try {
			const result = await generateDishDraft(provider, promptResult.data);
			const { draft } = result;

			return {
				values: {
					name: draft.name,
					category: draft.category ?? '',
					instructions: draft.instructions ?? '',
					baseServings: draft.baseServings ?? 1,
					tagsText: draft.tags.join(', '),
					tags: draft.tags,
					visibility: 'space',
					ingredients: draft.ingredients.map((ingredient, index) => ({
						...ingredient,
						quantity: ingredient.quantity ?? '',
						unit: ingredient.unit ?? '',
						category: ingredient.category ?? '',
						notes: ingredient.notes ?? '',
						sortOrder: index
					}))
				},
				ai: {
					status: 'draft' as const,
					prompt: promptResult.data,
					uncertainFields: draft.uncertainFields,
					notes: draft.notes,
					attempts: result.attempts,
					model: result.model
				}
			};
		} catch (error) {
			const draftError =
				error instanceof DishDraftError
					? error
					: new DishDraftError('provider_error', 'AI 暂时没有生成草稿，请继续手动填写。');

			return fail(draftError.code === 'unavailable' ? 503 : 502, {
				values: { ...emptyValues, name: promptResult.data.slice(0, 80) },
				ai: {
					status: 'error' as const,
					prompt: promptResult.data,
					message: draftError.message,
					retryable: draftError.retryable
				}
			});
		}
	},
	create: async (event) => {
		const context = await requireUserSpace(event);
		const values = await _readDishForm(event.request);
		const result = dishFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, {
				values,
				errors: _dishFieldErrors(result.error)
			});
		}

		const dish = await createDish(context, dishFormToCreateInput(result.data as DishFormInput));

		return redirect(303, `/app/dishes/${dish.id}`);
	}
};
