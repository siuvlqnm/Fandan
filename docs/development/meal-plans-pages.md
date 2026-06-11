# Meal Plan Pages

LES-90 adds creator-side pages for listing meal plans and creating the first draft. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/meal-plans`: list page with status/type/target filters and basic manage actions.
- `/app/meal-plans/new`: create page with target selection, quick target creation, date/type/meal-slot fields and optional first dish.
- `/app/meal-plans/:id`: placeholder detail page that confirms creation, status and item count until LES-91 replaces it with the full detail workspace.

## UX Boundaries

- New users can start from `/app` or `/app/meal-plans` and create their first meal plan.
- If no meal target exists, the new page supports quick target creation inside the flow.
- Existing target and dish entry links preserve context through `targetId` and `dishId` query parameters.
- Creating with a selected dish creates the first `meal_plan_items` row using the selected date and meal slot.
- The list page supports status, type and target filters.
- List actions support opening, duplicating, archiving and deleting a meal plan.

## Implementation Notes

- Page actions call `src/lib/server/meal-plans.ts` directly instead of calling JSON route handlers.
- Quick target creation reuses `src/lib/server/targets.ts`.
- Full meal-plan editing remains out of scope for LES-90 and belongs to LES-91.
- `/app/meal-plans/:id` intentionally remains a detail placeholder, but now reads through `getMealPlan` so it includes items and follows the LES-89 API behavior.
