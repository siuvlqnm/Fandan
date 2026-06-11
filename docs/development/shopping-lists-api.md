# Shopping Lists API

LES-92 adds protected creator-side JSON APIs for generating and editing shopping lists. All endpoints require an authenticated user and operate inside the current `space.id`.

Linear uses `/meal-plans` and `/shopping-lists` notation for the product endpoint family; the implemented SvelteKit route prefix is `/api`.

## Generation Rule

- `POST /api/meal-plans/:id/shopping-list/generate` reads every dish ingredient from the meal plan's items.
- Ingredients are grouped by normalized ingredient name and unit.
- Different units stay as separate shopping items.
- Missing ingredient categories become `其他`.
- Numeric quantities are multiplied by the meal-plan item servings and summed.
- Non-numeric quantities are preserved as text fragments.
- The first generation creates the meal plan's default shopping list.
- Later generations reuse the same default shopping list and replace its items only when this endpoint is called.
- Manual edits are not changed by meal-plan edits unless the user explicitly regenerates the list.

## Shopping List Payload

```json
{
	"id": "shopping-list-id",
	"mealPlanId": "meal-plan-id",
	"title": "周三晚餐 购物清单",
	"status": "active",
	"items": [
		{
			"id": "item-id",
			"shoppingListId": "shopping-list-id",
			"name": "鸡蛋",
			"quantity": "6",
			"unit": "个",
			"category": "蛋奶",
			"checked": false,
			"sourceDishId": "dish-id",
			"notes": "来自：番茄炒蛋 × 3",
			"sortOrder": 0,
			"createdAt": "2026-06-11 10:00:00",
			"updatedAt": "2026-06-11 10:00:00"
		}
	],
	"createdAt": "2026-06-11 10:00:00",
	"updatedAt": "2026-06-11 10:00:00"
}
```

## Generate Shopping List

`POST /api/meal-plans/:id/shopping-list/generate`

Response status: `201`.

Returns an empty `items` array when the meal plan has no dish ingredients.

## Get Shopping List

`GET /api/shopping-lists/:id`

Returns `404 NOT_FOUND` when the shopping list does not belong to the current space.

## Add Shopping List Item

`POST /api/shopping-lists/:id/items`

Request:

```json
{
	"name": "葱",
	"quantity": "1",
	"unit": "把",
	"category": "蔬菜",
	"checked": false,
	"notes": "临时补充"
}
```

`name` is required. Missing `category` is stored as `其他`.

Response status: `201`.

## Update Shopping List Item

`PATCH /api/shopping-lists/:id/items/:itemId`

At least one field is required. Omitted fields are not changed.

Useful examples:

```json
{ "checked": true }
```

```json
{ "quantity": "2", "unit": "袋", "notes": "换大包装" }
```

## Delete Shopping List Item

`DELETE /api/shopping-lists/:id/items/:itemId`

Deleting an item only affects the shopping list item. It does not change the source dish ingredient.
