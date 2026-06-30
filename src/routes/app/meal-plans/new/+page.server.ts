import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { createMealPlan, findMealPlanByDateAndSlot, getMealPlan, updateMealPlan } from '$lib/server/meal-plans';
import { listTargets } from '$lib/server/targets';
import {
	createWorkersAiMealDraftProvider,
	generateMealDraft,
	mealDraftSuggestedDishSchema,
	MealDraftError,
	type MealDraft
} from '$lib/server/ai/meal-drafts';
import { getMealDraftModel, getWorkersAiBinding } from '$lib/server/ai/config';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const nullableText = (maxLength: number) =>
	z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().optional());
const arrangeMealSchema = z
	.object({
		dishIds: z.array(z.string().trim().min(1)).max(20),
		dishNamesText: z.string().trim().max(800),
		servings: z.coerce.number().int().min(1, '至少为 1 人份').max(999),
		title: nullableText(120),
		plannedDate: nullableText(20),
		mealSlot: nullableText(40),
		targetId: nullableText(120),
		notes: nullableText(2000),
		suggestedDishDraftsJson: z.string().trim().max(30_000).optional()
	})
	.refine((value) => value.dishIds.length > 0 || value.dishNamesText.length > 0, {
		message: '请选择已有菜品，或输入这顿想吃的菜',
		path: ['dishNamesText']
	});

const mealDraftPromptSchema = z
	.string()
	.trim()
	.min(2, '请写下人数、时间或想吃的方向')
	.max(500, '描述请控制在 500 字以内');

const parseDishNames = (value: string) =>
	Array.from(
		new Set(
			value
				.split(/[,，、\n]/)
				.map((name) => name.trim())
				.filter(Boolean)
		)
	);

const fieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

const toPageError = (cause: unknown): never => {
	if (cause instanceof ApiError) throw kitError(cause.status, cause.message);
	throw cause;
};

const defaults = (dishId = '', targetId = '') => ({
	dishIds: dishId ? [dishId] : [],
	dishNamesText: '',
	servings: 2,
	title: '',
	plannedDate: new Date().toISOString().slice(0, 10),
	mealSlot: '晚餐',
	targetId,
	notes: '',
	suggestedDishDraftsJson: ''
});

const toDishContext = (dish: Awaited<ReturnType<typeof listDishes>>[number]) => ({
	id: dish.id,
	name: dish.name,
	category: dish.category,
	tags: dish.tags,
	baseServings: dish.baseServings
});

const toTargetContext = (target: Awaited<ReturnType<typeof listTargets>>[number]) => ({
	id: target.id,
	name: target.name,
	tasteNotes: target.tasteNotes,
	dietaryRestrictions: target.dietaryRestrictions
});

const draftToValues = (draft: MealDraft, fallback = defaults()) => ({
	dishIds: draft.existingDishIds,
	dishNamesText: draft.suggestedDishes.map((dish) => dish.name).join('、'),
	servings: draft.servings ?? fallback.servings,
	title: draft.title ?? fallback.title,
	plannedDate: draft.plannedDate ?? fallback.plannedDate,
	mealSlot: draft.mealSlot ?? fallback.mealSlot,
	targetId: draft.targetId ?? fallback.targetId,
	notes: draft.notes ?? fallback.notes,
	suggestedDishDraftsJson: JSON.stringify(draft.suggestedDishes)
});

const readValuesFromFormData = (formData: FormData) => {
	return {
		dishIds: formData.getAll('dishIds').map(String),
		dishNamesText: String(formData.get('dishNamesText') ?? ''),
		servings: String(formData.get('servings') ?? '2'),
		title: String(formData.get('title') ?? ''),
		plannedDate: String(formData.get('plannedDate') ?? ''),
		mealSlot: String(formData.get('mealSlot') ?? ''),
		targetId: String(formData.get('targetId') ?? ''),
		notes: String(formData.get('notes') ?? ''),
		suggestedDishDraftsJson: String(formData.get('suggestedDishDraftsJson') ?? '')
	};
};

const readForm = async (request: Request) => readValuesFromFormData(await request.formData());

const parseSuggestedDishDrafts = (value: string | null | undefined) => {
	if (!value?.trim()) return [];

	try {
		return z.array(mealDraftSuggestedDishSchema).max(10).parse(JSON.parse(value));
	} catch {
		return [];
	}
};

const createMealAction = async (event: RequestEvent) => {
	const context = await requireUserSpace(event);
	const values = await readForm(event.request);
	const result = arrangeMealSchema.safeParse(values);
	const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);

	if (!result.success) return fail(400, { values, dishes, targets, errors: fieldErrors(result.error) });
	const dishNames = parseDishNames(result.data.dishNamesText);
	if (dishNames.length > 10 || dishNames.some((name) => name.length > 80)) {
		return fail(400, {
			values,
			dishes,
			targets,
			errors: { dishNamesText: ['最多输入 10 道菜，每个菜名不超过 80 字'] }
		});
	}

	try {
		const existingDishesByName = new Map(dishes.map((dish) => [dish.name.trim(), dish.id]));
		const suggestedDraftsByName = new Map(
			parseSuggestedDishDrafts(values.suggestedDishDraftsJson).map((dish) => [dish.name.trim(), dish])
		);
		const inlineDishIds = [];
		for (const name of dishNames) {
			const existingDishId = existingDishesByName.get(name);
			if (existingDishId) {
				inlineDishIds.push(existingDishId);
				continue;
			}

			const draft = suggestedDraftsByName.get(name);
			const dish = await createDish(
				context,
				createDishSchema.parse(
					draft
						? {
								name: draft.name,
								category: draft.category,
								instructions: draft.instructions,
								baseServings: draft.baseServings,
								tags: draft.tags,
								ingredients: draft.ingredients
							}
						: { name, baseServings: result.data.servings }
				)
			);
			existingDishesByName.set(dish.name.trim(), dish.id);
			inlineDishIds.push(dish.id);
		}
		const dishIds = Array.from(new Set([...result.data.dishIds, ...inlineDishIds]));
		const title = result.data.title || `${result.data.plannedDate || '今晚'} ${result.data.mealSlot || '用餐'}`;
		const existingMealPlan = await findMealPlanByDateAndSlot(context, {
			plannedDate: result.data.plannedDate,
			mealSlot: result.data.mealSlot
		});

		if (existingMealPlan) {
			const existing = await getMealPlan(context, existingMealPlan.id);
			const existingDishIds = new Set(existing.items.map((item) => item.dishId).filter(Boolean));
			const items = existing.items
				.sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt))
				.map((item, index) => ({
					dishId: item.dishId,
					mealSlot: item.mealSlot,
					plannedDate: item.plannedDate,
					servings: item.servings,
					recommendationRating: item.recommendationRating,
					notes: item.notes,
					sortOrder: index
				}));

			for (const dishId of dishIds) {
				if (existingDishIds.has(dishId)) continue;
				items.push({
					dishId,
					mealSlot: result.data.mealSlot ?? null,
					plannedDate: result.data.plannedDate ?? null,
					servings: result.data.servings,
					recommendationRating: null,
					notes: null,
					sortOrder: items.length
				});
			}

			if (items.length !== existing.items.length) {
				await updateMealPlan(context, existing.id, { items });
			}

			return redirect(303, `/app/meal-plans/${existing.id}`);
		}

		const mealPlan = await createMealPlan(context, {
			title,
			targetId: result.data.targetId,
			type: 'single_meal',
			status: 'pending_confirmation',
			startDate: result.data.plannedDate,
			endDate: result.data.plannedDate,
			notes: result.data.notes,
			items: dishIds.map((dishId, index) => ({
				dishId,
				mealSlot: result.data.mealSlot ?? null,
				plannedDate: result.data.plannedDate ?? null,
				servings: result.data.servings,
				recommendationRating: null,
				sortOrder: index
			}))
		});
		return redirect(303, `/app/meal-plans/${mealPlan.id}`);
	} catch (cause) {
		toPageError(cause);
	}
};

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	const context = await requireUserSpace(event);
	const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);
	return {
		values: defaults(event.url.searchParams.get('dishId') ?? '', event.url.searchParams.get('targetId') ?? ''),
		dishes,
		targets,
		aiAvailable: Boolean((event.platform?.env as (Env & { AI?: Ai }) | undefined)?.AI)
	};
};

export const actions: Actions = {
	draft: async (event) => {
		const context = await requireUserSpace(event);
		const formData = await event.request.formData();
		const prompt = String(formData.get('prompt') ?? '');
		const promptResult = mealDraftPromptSchema.safeParse(prompt);
		const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);

		if (!promptResult.success) {
			return fail(400, {
				values: defaults(),
				dishes,
				targets,
				mealAi: {
					status: 'error' as const,
					prompt,
					message: promptResult.error.issues[0]?.message ?? '请写下这顿饭的要求。',
					retryable: false
				}
			});
		}

		const env = event.platform?.env;
		const provider = createWorkersAiMealDraftProvider(getWorkersAiBinding(env), getMealDraftModel(env));

		try {
			const result = await generateMealDraft(provider, {
				prompt: promptResult.data,
				today: new Date().toISOString().slice(0, 10),
				dishes: dishes.map(toDishContext),
				targets: targets.map(toTargetContext)
			});

			return {
				values: draftToValues(result.draft, defaults()),
				dishes,
				targets,
				mealAi: {
					status: 'draft' as const,
					prompt: promptResult.data,
					assumptions: result.draft.assumptions,
					constraints: result.draft.constraints,
					uncertainFields: result.draft.uncertainFields,
					suggestedDishes: result.draft.suggestedDishes,
					existingDishIds: result.draft.existingDishIds,
					attempts: result.attempts,
					model: result.model
				}
			};
		} catch (error) {
			const draftError = error instanceof MealDraftError ? error : new MealDraftError('provider_error', 'AI 暂时没有生成饭单草稿，请继续手动安排。');
			return fail(draftError.code === 'unavailable' ? 503 : 502, {
				values: defaults(),
				dishes,
				targets,
				mealAi: {
					status: 'error' as const,
					prompt: promptResult.data,
					message: draftError.message,
					retryable: draftError.retryable
				}
			});
		}
	},
	replaceDish: async (event) => {
		const context = await requireUserSpace(event);
		const formData = await event.request.formData();
		const values = readValuesFromFormData(formData);
		const replaceDishName = String(formData.get('replaceDishName') ?? '').trim();
		const prompt = String(formData.get('draftPrompt') ?? '') || `替换 ${replaceDishName}`;
		const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);
		const currentNames = parseDishNames(values.dishNamesText);
		const remainingNames = currentNames.filter((name) => name !== replaceDishName);
		const remainingDrafts = parseSuggestedDishDrafts(values.suggestedDishDraftsJson).filter((dish) =>
			remainingNames.includes(dish.name)
		);
		const env = event.platform?.env;
		const provider = createWorkersAiMealDraftProvider(getWorkersAiBinding(env), getMealDraftModel(env));

		try {
			const result = await generateMealDraft(provider, {
				prompt: `${prompt}\n请只建议一道替换菜，避免这些菜：${[...remainingNames, replaceDishName].join('、')}`,
				today: new Date().toISOString().slice(0, 10),
				dishes: dishes.map(toDishContext),
				targets: targets.map(toTargetContext),
				mode: 'replace',
				excludeDishNames: [...remainingNames, replaceDishName]
			});
			const replacement = result.draft.suggestedDishes.find((dish) => !remainingNames.includes(dish.name) && dish.name !== replaceDishName);

			if (!replacement) throw new MealDraftError('invalid_response', 'AI 没有给出可替换的菜，请手动调整或再试一次。');
			const nextDrafts = [...remainingDrafts, replacement];
			const nextNames = [...remainingNames, replacement.name];

			return {
				values: { ...values, dishNamesText: nextNames.join('、'), suggestedDishDraftsJson: JSON.stringify(nextDrafts) },
				dishes,
				targets,
				mealAi: {
					status: 'draft' as const,
					prompt,
					assumptions: result.draft.assumptions,
					constraints: result.draft.constraints,
					uncertainFields: result.draft.uncertainFields,
					suggestedDishes: nextDrafts,
					existingDishIds: [],
					attempts: result.attempts,
					model: result.model
				}
			};
		} catch (error) {
			const draftError = error instanceof MealDraftError ? error : new MealDraftError('provider_error', 'AI 暂时没有替换成功，请手动调整。');
			return fail(502, { values, dishes, targets, mealAi: { status: 'error' as const, prompt, message: draftError.message, retryable: draftError.retryable } });
		}
	},
	removeDish: async (event) => {
		const context = await requireUserSpace(event);
		const formData = await event.request.formData();
		const values = readValuesFromFormData(formData);
		const removeDishName = String(formData.get('removeDishName') ?? '').trim();
		const remainingNames = parseDishNames(values.dishNamesText).filter((name) => name !== removeDishName);
		const remainingDrafts = parseSuggestedDishDrafts(values.suggestedDishDraftsJson).filter((dish) =>
			remainingNames.includes(dish.name)
		);
		const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);

		return {
			values: {
				...values,
				dishNamesText: remainingNames.join('、'),
				suggestedDishDraftsJson: JSON.stringify(remainingDrafts)
			},
			dishes,
			targets,
			mealAi: {
				status: 'draft' as const,
				prompt: String(formData.get('draftPrompt') ?? ''),
				assumptions: [],
				constraints: [],
				uncertainFields: [],
				suggestedDishes: remainingDrafts,
				existingDishIds: values.dishIds,
				attempts: 0,
				model: 'manual-edit'
			}
		};
	},
	create: createMealAction
};
