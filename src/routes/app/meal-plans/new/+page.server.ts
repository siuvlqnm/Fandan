import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { createMealPlan } from '$lib/server/meal-plans';
import { generateShoppingList } from '$lib/server/shopping-lists';
import { listTargets } from '$lib/server/targets';
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

const readForm = async (request: Request) => {
	const formData = await request.formData();
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

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	const context = await requireUserSpace(event);
	const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);
	return {
		values: defaults(event.url.searchParams.get('dishId') ?? '', event.url.searchParams.get('targetId') ?? ''),
		dishes,
		targets
	};
};

export const actions: Actions = {
	default: async (event) => {
		const context = await requireUserSpace(event);
		const values = await readForm(event.request);
		const result = arrangeMealSchema.safeParse(values);
		const [dishes, targets] = await Promise.all([listDishes(context), listTargets(context)]);

		if (!result.success) return fail(400, { values, dishes, targets, errors: fieldErrors(result.error) });
		const dishNames = parseDishNames(result.data.dishNamesText);
		if (dishNames.length > 10 || dishNames.some((name) => name.length > 80)) {
			return fail(400, { values, dishes, targets, errors: { dishNamesText: ['最多输入 10 道菜，每个菜名不超过 80 字'] } });
		}

		try {
			const createdDishes = [];
			for (const name of dishNames) {
				createdDishes.push(await createDish(context, createDishSchema.parse({ name, baseServings: result.data.servings })));
			}
			const dishIds = Array.from(new Set([...result.data.dishIds, ...createdDishes.map((dish) => dish.id)]));
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
	}
};
