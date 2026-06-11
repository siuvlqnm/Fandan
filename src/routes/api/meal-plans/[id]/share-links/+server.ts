import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { createMealPlanShareLink, createShareLinkSchema } from '$lib/server/share-links';

const getMealPlanId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Meal plan id is required');
	}

	return id;
};

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createShareLinkSchema);
	const shareLink = await createMealPlanShareLink(context, getMealPlanId(event.params.id), body);

	return apiOk({ shareLink }, { status: 201 });
});
