# Meal Plan Pages

LES-90 adds creator-side pages for listing meal plans and creating the first draft. LES-91 replaces the detail placeholder with the creator-side meal-plan workspace. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/meal-plans`: list page with status/type/target filters and basic manage actions.
- `/app/meal-plans/new`: create page with target selection, quick target creation, date/type/meal-slot fields and optional first dish.
- `/app/meal-plans/:id`: detail workspace with base information editing, target context, dish adding, quick dish creation, item removal, item ordering and status actions.

## UX Boundaries

- New users can start from `/app` or `/app/meal-plans` and create their first meal plan.
- If no meal target exists, the new page supports quick target creation inside the flow.
- Existing target and dish entry links preserve context through `targetId` and `dishId` query parameters.
- Creating with a selected dish creates the first `meal_plan_items` row using the selected date and meal slot.
- The list page supports status, type and target filters.
- List actions support opening, duplicating, archiving and deleting a meal plan.
- The detail page can update title, target, type, date range and notes.
- The detail page shows the selected target's people count, taste notes, dietary restrictions and budget notes.
- The detail page can add an existing dish with date, meal slot, servings and item notes.
- The detail page can quickly create a name-only dish and add it to the current meal plan in one action.
- Meal-plan items are grouped by planned date and meal slot, then ordered by `sortOrder`.
- Item move and remove actions auto-save the meal plan by replacing the full item list through `updateMealPlan`.
- Detail status actions support draft, pending confirmation, confirmed, completed and archived.
- Archived meal plans are shown read-only in the detail workspace.
- The detail page can generate or open the meal plan's default shopping list.

## Implementation Notes

- Page actions call `src/lib/server/meal-plans.ts` directly instead of calling JSON route handlers.
- Quick target creation reuses `src/lib/server/targets.ts`.
- Quick dish creation on the detail page reuses `src/lib/server/dishes.ts`.
- Shopping-list generation on the detail page reuses `src/lib/server/shopping-lists.ts`.
- Detail item actions keep the LES-89 API contract: item changes are persisted as a complete replacement list on the parent meal plan.
- The item list uses current item IDs only to compute remove and move actions; saved replacement rows receive fresh IDs from the service layer.
