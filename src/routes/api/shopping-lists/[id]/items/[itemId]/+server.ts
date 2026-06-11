import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { deleteShoppingListItem, updateShoppingListItem, updateShoppingListItemSchema } from '$lib/server/shopping-lists';

const getShoppingListId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Shopping list id is required');
	}

	return id;
};

const getShoppingListItemId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Shopping list item id is required');
	}

	return id;
};

export const PATCH = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, updateShoppingListItemSchema);
	const shoppingList = await updateShoppingListItem(
		context,
		getShoppingListId(event.params.id),
		getShoppingListItemId(event.params.itemId),
		body
	);

	return apiOk({ shoppingList });
});

export const DELETE = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const result = await deleteShoppingListItem(
		context,
		getShoppingListId(event.params.id),
		getShoppingListItemId(event.params.itemId)
	);

	return apiOk(result);
});
