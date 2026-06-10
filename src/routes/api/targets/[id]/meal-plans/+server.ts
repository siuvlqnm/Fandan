import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { listTargetMealPlans } from '$lib/server/targets';

const getTargetId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Target id is required');
	}

	return id;
};

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const mealPlans = await listTargetMealPlans(context, getTargetId(event.params.id));

	return apiOk({ mealPlans });
});
