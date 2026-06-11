import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { deleteDish, getDish, updateDish, updateDishSchema } from '$lib/server/dishes';

const getDishId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Dish id is required');
	}

	return id;
};

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const dish = await getDish(context, getDishId(event.params.id));

	return apiOk({ dish });
});

export const PATCH = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, updateDishSchema);
	const dish = await updateDish(context, getDishId(event.params.id), body);

	return apiOk({ dish });
});

export const DELETE = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const result = await deleteDish(context, getDishId(event.params.id));

	return apiOk(result);
});
