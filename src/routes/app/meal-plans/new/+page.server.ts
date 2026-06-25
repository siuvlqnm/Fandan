import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { createMealPlan } from '$lib/server/meal-plans';
import { generateShoppingList } from '$lib/server/shopping-lists';
import { listTargets } from '$lib/server/targets';
import {
	createWorkersAiMealDraftProvider,
	generateMealDraft,
	MealDraftError,
	type MealDraft
} from '$lib/server/ai/meal-drafts';
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
		notes: nullableText(2000)
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
	notes: ''
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
	notes: draft.notes ?? fallback.notes
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
		notes: String(formData.get('notes') ?? '')
	};
};

const readForm = async (request: Request) => readValuesFromFormData(await request.formData());

const createMealAction = async (event: Parameters<Actions['default']>[0]) => {
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
		const inlineDishIds = [];
		for (const name of dishNames) {
			const existingDishId = existingDishesByName.get(name);
			if (existingDishId) {
				inlineDishIds.push(existingDishId);
				continue;
			}

			const dish = await createDish(context, createDishSchema.parse({ name, baseServings: result.data.servings }));
			existingDishesByName.set(dish.name.trim(), dish.id);
			inlineDishIds.push(dish.id);
		}
		const dishIds = Array.from(new Set([...result.data.dishIds, ...inlineDishIds]));
		const title = result.data.title || `${result.data.plannedDate || '今晚'} ${result.data.mealSlot || '用餐'}`;
		const mealPlan = await createMealPlan(context, {
			title,
			targetId: result.data.targetId,
			type: 'single_meal',
			status: 'confirmed',
			startDate: result.data.plannedDate,
			endDate: result.data.plannedDate,
			notes: result.data.notes,
			items: dishIds.map((dishId, index) => ({
				dishId,
				mealSlot: result.data.mealSlot,
				plannedDate: result.data.plannedDate,
				servings: result.data.servings,
				sortOrder: index
			}))
		});
		const shoppingList = await generateShoppingList(context, mealPlan.id);
		return redirect(303, `/app/shopping-lists/${shoppingList.id}?first=1`);
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

		const env = event.platform?.env as (Env & { AI?: Ai; AI_MEAL_MODEL?: string }) | undefined;
		const provider = createWorkersAiMealDraftProvider(env?.AI, env?.AI_MEAL_MODEL);

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
		const env = event.platform?.env as (Env & { AI?: Ai; AI_MEAL_MODEL?: string }) | undefined;
		const provider = createWorkersAiMealDraftProvider(env?.AI, env?.AI_MEAL_MODEL);

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

			return {
				values: { ...values, dishNamesText: [...remainingNames, replacement.name].join('、') },
				dishes,
				targets,
				mealAi: {
					status: 'draft' as const,
					prompt,
					assumptions: result.draft.assumptions,
					constraints: result.draft.constraints,
					uncertainFields: result.draft.uncertainFields,
					suggestedDishes: [{ name: replacement.name, reason: replacement.reason }],
					existingDishIds: values.dishIds,
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
		const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);

		return {
			values: { ...values, dishNamesText: remainingNames.join('、') },
			dishes,
			targets,
			mealAi: {
				status: 'draft' as const,
				prompt: String(formData.get('draftPrompt') ?? ''),
				assumptions: [],
				constraints: [],
				uncertainFields: [],
				suggestedDishes: remainingNames.map((name) => ({ name, reason: null })),
				existingDishIds: values.dishIds,
				attempts: 0,
				model: 'manual-edit'
			}
		};
	},
	create: createMealAction
};
