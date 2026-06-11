import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { getShoppingList } from '$lib/server/shopping-lists';

const getShoppingListId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Shopping list id is required');
	}

	return id;
};

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const shoppingList = await getShoppingList(context, getShoppingListId(event.params.id));

	return apiOk({ shoppingList });
});
