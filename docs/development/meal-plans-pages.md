# Meal Plan Pages

LES-90 adds creator-side pages for listing meal plans and creating the first draft. LES-91 replaces the detail placeholder with the creator-side meal-plan workspace. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/meal-plans`: list page with status/type/target filters and basic manage actions.
- `/app/meal-plans/new`: secondary “安排一顿饭” editor with AI draft, existing dish selection, servings and optional settings.
- `/app/meal-plans/:id`: detail workspace with base information editing, target context, dish adding, quick dish creation, item removal, item ordering and status actions.

## UX Boundaries

- New users start from `/app` and can create their first meal plan from the dashboard quick start.
- A new account can create its first meal without creating a target or leaving the flow.
- The dashboard owns the fast date-and-meal-slot picker: today, tomorrow or a custom date, then breakfast, lunch, dinner or late-night meal.
- For today, dashboard meal slots that have already passed are disabled based on the current Asia/Shanghai time. For example, at night the user cannot start a breakfast or lunch plan for today.
- Choosing an available dashboard meal slot creates a pending-confirmation meal plan immediately and opens the meal detail. The system adds deterministic starting recommendations for that date and slot.
- Built-in dashboard meal-slot recommendations are a starting point, not AI output. They should be reusable dishes in the user's current family space and remain fully editable after creation.
- On the new-meal page, the manual freeform `这顿想吃什么？` input lives under more settings with date, time, title, saved meal context and notes.
- Inline dish names are saved as reusable dishes whose base servings match this meal.
- Optional AI meal drafts fill the same editable form from one natural-language prompt.
- AI drafts clearly separate saved existing dishes from new suggested dishes; new suggestions can be removed or replaced before saving.
- Existing target and dish entry links preserve context through `targetId` and `dishId` query parameters.
- Submitting the manual form creates a pending-confirmation single meal, generates its deterministic shopping list and opens that list with first-use guidance.
- The list page hides filters when empty and collapses status, type and target filters behind a secondary control once more than five plans exist.
- The list page leads with the next household action: arrange, send for confirmation, continue feedback, buy or review. Raw status remains secondary.
- List actions support opening, duplicating, archiving and deleting a meal plan.
- The detail page can update title, target, type, date range and notes.
- The detail page shows the selected target's people count, taste notes, dietary restrictions and budget notes.
- The detail page can add an existing dish with date, meal slot, servings, recommendation rating and item notes.
- The detail page can quickly create a name-only dish and add it to the current meal plan in one action.
- The detail page can update a selected item's recommendation rating without removing and re-adding the dish.
- Meal-plan items are grouped by planned date and meal slot, then ordered by `sortOrder`.
- Item move and remove actions auto-save the meal plan by replacing the full item list through `updateMealPlan`.
- Detail status actions support draft, pending confirmation, confirmed, completed and archived.
- Archived meal plans are shown read-only in the detail workspace.
- The detail page can generate or open the meal plan's default shopping list.
- The detail first screen keeps the next household action as the single primary action. Use `发给家人确认` before a share exists, `继续确认` while feedback is open, and `去买菜` once the shopping list is ready.
- The detail page may still expose draft/pending/confirmed/completed/archived transitions, but those controls should be visually secondary to menu, confirmation and shopping-list progress.

## Implementation Notes

- Page actions call `src/lib/server/meal-plans.ts` directly instead of calling JSON route handlers.
- Inline dish creation reuses `src/lib/server/dishes.ts`; existing targets remain optional for compatibility.
- AI meal drafts use `src/lib/server/ai/meal-drafts.ts`; the provider only returns a draft and never writes meal data.
- Quick dish creation on the detail page reuses `src/lib/server/dishes.ts`.
- Shopping-list generation on the detail page reuses `src/lib/server/shopping-lists.ts`.
- Detail item actions keep the LES-89 API contract: item changes are persisted as a complete replacement list on the parent meal plan.
- The item list uses current item IDs only to compute remove and move actions; saved replacement rows receive fresh IDs from the service layer.
- Recommendation rating updates are the exception: they update the existing `meal_plan_items` row directly so item IDs and existing dish-level feedback remain stable.
- `meal_plan_items.recommendation_rating` belongs to the selected meal item, not the reusable dish, so recommendation strength can vary per meal plan and is safe to expose on public share pages.
