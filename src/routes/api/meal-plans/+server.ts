import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { createMealPlan, createMealPlanSchema, listMealPlans } from '$lib/server/meal-plans';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const mealPlans = await listMealPlans(context, {
		status: event.url.searchParams.get('status'),
		type: event.url.searchParams.get('type'),
		targetId: event.url.searchParams.get('targetId')
	});

	return apiOk({ mealPlans });
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createMealPlanSchema);
	const mealPlan = await createMealPlan(context, body);

	return apiOk({ mealPlan }, { status: 201 });
});
