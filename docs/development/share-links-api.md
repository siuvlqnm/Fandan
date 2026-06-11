# Share Links API

LES-94 adds the public sharing API used by the later guest confirmation page. Creator-side share-link creation remains protected by login and current `space.id`; visitor routes resolve data only through `share_links.token`.

Linear uses `/meal-plans/:id/share-links` and `/share/:token` notation for the product endpoint family. The implemented SvelteKit route prefix is `/api`.

## Create Share Link

`POST /api/meal-plans/:id/share-links`

Requires authentication. The meal plan must belong to the current user space.

Request:

```json
{
	"canView": true,
	"canFeedback": true,
	"canConfirm": true,
	"expiresAt": "2026-06-18T12:00:00.000Z"
}
```

All permission fields default to `true`. `expiresAt` is optional and may be `null`.

Response status: `201`.

```json
{
	"ok": true,
	"data": {
		"shareLink": {
			"id": "share-link-id",
			"mealPlanId": "meal-plan-id",
			"token": "token",
			"path": "/share/token",
			"apiPath": "/api/share/token",
			"canView": true,
			"canFeedback": true,
			"canConfirm": true,
			"expiresAt": null,
			"createdAt": "2026-06-11 10:00:00",
			"updatedAt": "2026-06-11 10:00:00"
		}
	}
}
```

## Get Public Share

`GET /api/share/:token`

Does not require login. Returns `404 NOT_FOUND` for unknown tokens and `403 FORBIDDEN` for expired links or links without view permission.

Response:

```json
{
	"ok": true,
	"data": {
		"share": {
			"shareLink": {
				"token": "token",
				"canFeedback": true,
				"canConfirm": true
			},
			"mealPlan": {
				"id": "meal-plan-id",
				"title": "周末聚餐",
				"type": "gathering",
				"status": "pending_confirmation",
				"startDate": "2026-06-13",
				"endDate": null,
				"notes": "少油",
				"target": {
					"id": "target-id",
					"name": "张女士家",
					"type": "client",
					"peopleCount": 4,
					"tasteNotes": "清淡",
					"dietaryRestrictions": "不吃香菜",
					"budgetNotes": null
				},
				"items": []
			}
		}
	}
}
```

The public payload intentionally omits `space_id`, user/session data and creator-only fields.

## Submit Feedback

`POST /api/share/:token/feedback`

Does not require login. The link must be unexpired and allow feedback.

Single feedback entry:

```json
{
	"guestName": "张女士",
	"mealPlanItemId": "meal-plan-item-id",
	"reaction": "replace",
	"note": "这道想换成不辣的",
	"dietaryNote": "老人不吃辣"
}
```

Batch item feedback plus a global dietary note:

```json
{
	"guestName": "张女士",
	"dietaryNote": "老人不吃辣",
	"items": [
		{
			"mealPlanItemId": "meal-plan-item-id",
			"reaction": "like",
			"note": "这道保留"
		}
	]
}
```

`reaction` supports `like`, `dislike`, `replace` and `note`. Every provided `mealPlanItemId` must belong to the shared meal plan.

Response status: `201`.

## Confirm Share

`POST /api/share/:token/confirm`

Does not require login. The link must be unexpired and allow confirmation.

Request:

```json
{
	"guestName": "张女士",
	"note": "按这个菜单准备",
	"dietaryNote": "老人不吃辣"
}
```

Confirmation writes a `confirm` feedback row and moves the meal plan to `confirmed` when its current status is `draft` or `pending_confirmation`. Archived or completed meal plans are not moved backward.

Response status: `201`.
