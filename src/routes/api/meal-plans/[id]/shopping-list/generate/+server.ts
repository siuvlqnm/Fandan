import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { generateShoppingList } from '$lib/server/shopping-lists';
import { z } from 'zod';

const getMealPlanId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Meal plan id is required');
	}

	return id;
};

const generateShoppingListBodySchema = z.object({
	expectedMealPlanUpdatedAt: z.string().trim().min(1).nullable().optional(),
	expectedShoppingListUpdatedAt: z.string().trim().min(1).nullable().optional()
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const contentType = event.request.headers.get('content-type') ?? '';
	const body = contentType.includes('application/json')
		? generateShoppingListBodySchema.parse(await event.request.json())
		: {};
	const shoppingList = await generateShoppingList(context, getMealPlanId(event.params.id), body);

	return apiOk({ shoppingList }, { status: 201 });
});
