import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const query = event.url.searchParams.get('q') ?? event.url.searchParams.get('search');
	const dishes = await listDishes(context, { query });

	return apiOk({ dishes });
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createDishSchema);
	const dish = await createDish(context, body);

	return apiOk({ dish }, { status: 201 });
});
