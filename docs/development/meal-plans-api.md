# Meal Plans API

LES-89 adds protected creator-side JSON APIs for meal-plan CRUD, duplication and archiving. All endpoints require an authenticated user and operate inside the current `space.id`.

Linear uses `/meal-plans` notation for the product endpoint family; the implemented SvelteKit route prefix is `/api`.

## Statuses

- `draft`
- `pending_confirmation`
- `confirmed`
- `completed`
- `archived`

Archived meal plans cannot be edited directly with `PATCH /api/meal-plans/:id`. Duplicate an archived meal plan to create a new editable draft.

## Types

- `single_meal`
- `day`
- `week`
- `gathering`

## Meal Plan Payload

```json
{
	"id": "meal-plan-id",
	"targetId": "target-id",
	"title": "周三晚餐",
	"type": "single_meal",
	"status": "draft",
	"startDate": "2026-06-11",
	"endDate": null,
	"notes": "少油少盐",
	"items": [
		{
			"id": "item-id",
			"mealPlanId": "meal-plan-id",
			"dishId": "dish-id",
			"mealSlot": "晚餐",
			"plannedDate": "2026-06-11",
			"servings": 3,
			"notes": null,
			"sortOrder": 0,
			"createdAt": "2026-06-11 10:00:00",
			"updatedAt": "2026-06-11 10:00:00"
		}
	],
	"createdAt": "2026-06-11 10:00:00",
	"updatedAt": "2026-06-11 10:00:00"
}
```

## List Meal Plans

`GET /api/meal-plans`

Optional query parameters:

- `status`: one of the statuses above, or `all`.
- `type`: one of the types above, or `all`.
- `targetId`: filters to one meal target after checking it belongs to the current space.

Response:

```json
{
	"ok": true,
	"data": {
		"mealPlans": []
	}
}
```

## Create Meal Plan

`POST /api/meal-plans`

Only `title` is required. `type` defaults to `single_meal`, `status` defaults to `draft`, and `items` defaults to an empty array.

Request:

```json
{
	"title": "周三晚餐",
	"type": "single_meal",
	"targetId": "target-id",
	"startDate": "2026-06-11",
	"items": [
		{
			"dishId": "dish-id",
			"mealSlot": "晚餐",
			"plannedDate": "2026-06-11",
			"servings": 3,
			"notes": "孩子少辣"
		}
	]
}
```

`targetId` and item `dishId` values must belong to the current space.

Response status: `201`.

## Get Meal Plan

`GET /api/meal-plans/:id`

Returns `404 NOT_FOUND` when the meal plan does not exist in the current space.

## Update Meal Plan

`PATCH /api/meal-plans/:id`

At least one field is required. Omitted fields are not changed.

If `items` is omitted, existing items are unchanged. If `items` is provided, the item list is replaced by the provided array. Passing `[]` clears items.

Returns `409 CONFLICT` when the meal plan is archived.

## Delete Meal Plan

`DELETE /api/meal-plans/:id`

Deleting a meal plan cascades its items and future child resources through database relations.

## Duplicate Meal Plan

`POST /api/meal-plans/:id/duplicate`

Creates a new `draft` meal plan that copies the source target, dates, notes and items.

Response status: `201`.

## Archive Meal Plan

`POST /api/meal-plans/:id/archive`

Sets status to `archived`.
