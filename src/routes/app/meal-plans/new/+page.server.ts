import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { listDishes } from '$lib/server/dishes';
import { createMealPlan, mealPlanFormSchema, type MealPlanFormInput } from '$lib/server/meal-plans';
import { createTarget, createTargetSchema, listTargets } from '$lib/server/targets';
import type { Actions, PageServerLoad } from './$types';

const emptyValues = {
	title: '',
	targetId: '',
	quickTargetName: '',
	quickTargetType: 'home',
	type: 'single_meal',
	startDate: '',
	endDate: '',
	mealSlot: '',
	dishId: '',
	servings: 1,
	notes: ''
};

const toPageError = (cause: unknown): never => {
	if (cause instanceof ApiError) {
		throw kitError(cause.status, cause.message);
	}

	throw cause;
};

const fieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

const readMealPlanForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		title: String(formData.get('title') ?? ''),
		targetId: String(formData.get('targetId') ?? '') || null,
		quickTargetName: String(formData.get('quickTargetName') ?? ''),
		quickTargetType: String(formData.get('quickTargetType') ?? 'home'),
		type: String(formData.get('type') ?? 'single_meal'),
		startDate: String(formData.get('startDate') ?? '') || null,
		endDate: String(formData.get('endDate') ?? '') || null,
		mealSlot: String(formData.get('mealSlot') ?? '') || null,
		dishId: String(formData.get('dishId') ?? '') || null,
		servings: Number(formData.get('servings') ?? 1),
		notes: String(formData.get('notes') ?? '') || null
	};
};

const buildCreateInput = (input: MealPlanFormInput, targetId: string | null) => ({
	title: input.title,
	targetId,
	type: input.type,
	status: 'draft' as const,
	startDate: input.startDate,
	endDate: input.endDate,
	notes: input.notes,
	items: input.dishId
		? [
				{
					dishId: input.dishId,
					mealSlot: input.mealSlot,
					plannedDate: input.startDate,
					servings: input.servings
				}
			]
		: []
});

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	const context = await requireUserSpace(event);
	const targetId = event.url.searchParams.get('targetId') ?? '';
	const dishId = event.url.searchParams.get('dishId') ?? '';
	const [targets, dishes] = await Promise.all([listTargets(context), listDishes(context)]);
	const defaultTargetId = targetId || (targets.length === 1 ? targets[0].id : '');
	const selectedTarget = defaultTargetId ? targets.find((target) => target.id === defaultTargetId) : null;
	const selectedDish = dishId ? dishes.find((dish) => dish.id === dishId) : null;
	const today = new Date().toISOString().slice(0, 10);

	return {
		values: {
			...emptyValues,
			title: selectedTarget ? `${selectedTarget.name} 饭单` : selectedDish ? `${selectedDish.name} 饭单` : '',
			targetId: defaultTargetId,
			dishId,
			startDate: today,
			mealSlot: '晚餐'
		},
		targets,
		dishes,
		selectedTarget: selectedTarget ?? null,
		selectedDish: selectedDish ?? null
	};
};

export const actions: Actions = {
	default: async (event) => {
		const context = await requireUserSpace(event);
		const values = await readMealPlanForm(event.request);
		const result = mealPlanFormSchema.safeParse(values);

		if (!result.success) {
			const [targets, dishes] = await Promise.all([listTargets(context), listDishes(context)]);

			return fail(400, {
				values,
				targets,
				dishes,
				errors: fieldErrors(result.error)
			});
		}

		try {
			let targetId = result.data.targetId ?? null;
			const quickTargetName = result.data.quickTargetName?.trim();

			if (quickTargetName) {
				const targetInput = createTargetSchema.parse({
					name: quickTargetName,
					type: result.data.quickTargetType,
					peopleCount: 1
				});
				const target = await createTarget(context, targetInput);
				targetId = target.id;
			}

			const mealPlan = await createMealPlan(context, buildCreateInput(result.data, targetId));

			return redirect(303, `/app/meal-plans/${mealPlan.id}`);
		} catch (cause) {
			toPageError(cause);
		}
	}
};
