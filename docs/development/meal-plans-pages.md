# Meal Plan Pages

LES-90 adds creator-side pages for listing meal plans and creating the first draft. LES-91 replaces the detail placeholder with the creator-side meal-plan workspace. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/meal-plans`: list page with status/type/target filters and basic manage actions.
- `/app/meal-plans/new`: task-first “安排一顿饭” flow with inline dish names, existing dish selection, servings and optional settings.
- `/app/meal-plans/:id`: detail workspace with base information editing, target context, dish adding, quick dish creation, item removal, item ordering and status actions.

## UX Boundaries

- New users can start from `/app` or `/app/meal-plans` and create their first meal plan.
- A new account can create its first meal without creating a target or leaving the flow.
- The only primary inputs are dishes and servings; date, time, title, saved meal context and notes live under more settings.
- Inline dish names are saved as reusable dishes whose base servings match this meal.
- Optional AI meal drafts fill the same editable form from one natural-language prompt.
- AI drafts clearly separate saved existing dishes from new suggested dishes; new suggestions can be removed or replaced before saving.
- Existing target and dish entry links preserve context through `targetId` and `dishId` query parameters.
- Submitting creates a confirmed single meal, generates its deterministic shopping list and opens that list with first-use guidance.
- The list page hides filters when empty and collapses status, type and target filters behind a secondary control once more than five plans exist.
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
- The detail first screen keeps shopping-list generation/opening as the single primary action; feedback remains a secondary action.

## Implementation Notes

- Page actions call `src/lib/server/meal-plans.ts` directly instead of calling JSON route handlers.
- Inline dish creation reuses `src/lib/server/dishes.ts`; existing targets remain optional for compatibility.
- AI meal drafts use `src/lib/server/ai/meal-drafts.ts`; the provider only returns a draft and never writes meal data.
- Quick dish creation on the detail page reuses `src/lib/server/dishes.ts`.
- Shopping-list generation on the detail page reuses `src/lib/server/shopping-lists.ts`.
- Detail item actions keep the LES-89 API contract: item changes are persisted as a complete replacement list on the parent meal plan.
- The item list uses current item IDs only to compute remove and move actions; saved replacement rows receive fresh IDs from the service layer.
