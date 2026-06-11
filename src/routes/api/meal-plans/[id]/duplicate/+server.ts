import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { duplicateMealPlan } from '$lib/server/meal-plans';

const getMealPlanId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Meal plan id is required');
	}

	return id;
};

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const mealPlan = await duplicateMealPlan(context, getMealPlanId(event.params.id));

	return apiOk({ mealPlan }, { status: 201 });
});
