import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { deleteMealPlan, getMealPlan, updateMealPlan, updateMealPlanSchema } from '$lib/server/meal-plans';

const getMealPlanId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Meal plan id is required');
	}

	return id;
};

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const mealPlan = await getMealPlan(context, getMealPlanId(event.params.id));

	return apiOk({ mealPlan });
});

export const PATCH = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, updateMealPlanSchema);
	const mealPlan = await updateMealPlan(context, getMealPlanId(event.params.id), body);

	return apiOk({ mealPlan });
});

export const DELETE = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const result = await deleteMealPlan(context, getMealPlanId(event.params.id));

	return apiOk(result);
});
