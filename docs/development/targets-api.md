# Targets API

LES-85 adds the space-scoped API for meal targets, which represent families, clients, gatherings, or other groups the creator cooks for.

Linear lists the product endpoints as `/targets`. In this SvelteKit app, JSON server routes live under `/api`, so the implemented paths are:

- `GET /api/targets`
- `POST /api/targets`
- `GET /api/targets/:id`
- `PATCH /api/targets/:id`
- `DELETE /api/targets/:id`
- `GET /api/targets/:id/meal-plans`

All endpoints require an authenticated creator session. Public share routes remain separate and should not use these endpoints.

## Data Shape

Target responses use:

```json
{
	"id": "target_id",
	"name": "张女士家",
	"type": "client",
	"peopleCount": 3,
	"tasteNotes": "偏清淡",
	"dietaryRestrictions": "不吃香菜",
	"budgetNotes": "晚餐 120 元以内",
	"contactNotes": "每周一、三、五上门做饭",
	"createdAt": "2026-06-10 12:00:00",
	"updatedAt": "2026-06-10 12:00:00"
}
```

`type` can be one of:

- `home`
- `client`
- `gathering`
- `other`

## Create

Only `name` is required:

```bash
curl -X POST http://127.0.0.1:5173/api/targets \
	-H 'content-type: application/json' \
	-d '{"name":"我家"}'
```

Defaults:

- `type`: `home`
- `peopleCount`: `1`

Optional fields:

- `tasteNotes`
- `dietaryRestrictions`
- `budgetNotes`
- `contactNotes`

## Update

`PATCH /api/targets/:id` only changes fields present in the JSON body. Missing fields are not reset to defaults.

```json
{
	"type": "client",
	"peopleCount": 4,
	"dietaryRestrictions": "老人少盐，孩子不吃辣"
}
```

Pass `null` for notes fields to clear them.

## Space Isolation

The implementation calls `requireUserSpace(event)` for every target endpoint, then filters by `meal_targets.space_id = space.id`.

- Listing only returns targets in the current space.
- Detail, update and delete require both `id` and `space_id` to match.
- `GET /api/targets/:id/meal-plans` first verifies the target belongs to the current space, then lists meal plans with the same `space_id` and `target_id`.

## Files

- `src/lib/server/targets.ts`: validation schemas and space-scoped target operations.
- `src/routes/api/targets/+server.ts`: list and create.
- `src/routes/api/targets/[id]/+server.ts`: read, update and delete.
- `src/routes/api/targets/[id]/meal-plans/+server.ts`: target meal plan list.
