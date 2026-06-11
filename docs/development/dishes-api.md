# Dishes API

LES-87 adds protected creator-side JSON APIs for the dish library and dish ingredients. All endpoints require an authenticated user and operate inside the current `space.id`.

Linear uses `/dishes` notation for the product endpoint family; the implemented SvelteKit route prefix is `/api`.

## Response Shape

All endpoints use the shared API envelope from `docs/development/server.md`.

Dish payload:

```json
{
	"id": "dish-id",
	"name": "番茄炒蛋",
	"category": "家常菜",
	"instructions": "先炒蛋，再炒番茄。",
	"tags": ["快手", "下饭"],
	"visibility": "space",
	"ingredients": [
		{
			"id": "ingredient-id",
			"name": "鸡蛋",
			"quantity": "3",
			"unit": "个",
			"category": "蛋奶",
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

## List Dishes

`GET /api/dishes`

Optional query parameters:

- `q` or `search`: searches dish name, dish category, tags and ingredient names.

Response:

```json
{
	"ok": true,
	"data": {
		"dishes": []
	}
}
```

## Create Dish

`POST /api/dishes`

Only `name` is required. `tags` and `ingredients` default to empty arrays, and `visibility` defaults to `space`.

Request:

```json
{
	"name": "番茄炒蛋",
	"category": "家常菜",
	"instructions": "先炒蛋，再炒番茄。",
	"tags": ["快手", "下饭"],
	"ingredients": [
		{
			"name": "鸡蛋",
			"quantity": "3",
			"unit": "个",
			"category": "蛋奶",
			"notes": "常温蛋更好打散"
		}
	]
}
```

Response status: `201`.

## Get Dish

`GET /api/dishes/:id`

Returns `404 NOT_FOUND` when the dish does not exist in the current space.

## Update Dish

`PATCH /api/dishes/:id`

At least one field is required. Omitted fields are not changed.

If `ingredients` is omitted, existing ingredients are unchanged. If `ingredients` is provided, the ingredient list is replaced by the provided array. Passing `[]` clears ingredients.

Request:

```json
{
	"tags": ["家常", "儿童友好"],
	"ingredients": [
		{
			"name": "番茄",
			"quantity": "2",
			"unit": "个",
			"category": "蔬菜"
		}
	]
}
```

## Delete Dish

`DELETE /api/dishes/:id`

Deleting a dish also deletes its `dish_ingredients` through the database cascade.

Response:

```json
{
	"ok": true,
	"data": {
		"deleted": true,
		"id": "dish-id"
	}
}
```
