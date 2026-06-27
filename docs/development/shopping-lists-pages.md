# Shopping List Pages

LES-93 adds the creator-side shopping-list page for buying preparation and in-store checking. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/shopping-lists`: shopping-list center for the current workspace, defaulting to unfinished lists with filters for history, date, source meal plan and search.
- `/app/shopping-lists/:id`: shopping-list workspace with meal-plan context, category groups, checked state, item editing and regeneration.
- `/app/meal-plans/:id`: meal-plan detail side panel can generate the default shopping list or open the latest generated list.

## UX Boundaries

- The shopping-list page shows the source meal plan and links back to it.
- Items are grouped by category and show group-level purchased counts.
- Each item can be toggled purchased/unpurchased with a large touch target.
- Each item can edit name, quantity, unit, category and notes.
- Unit and category editing use the same fixed ingredient option sets as dish ingredients.
- The page explains the deterministic base-serving formula; each generated item shows its calculation or confirmation warning in notes.
- Text quantities, missing quantities and unit conflicts stay editable and visibly unresolved instead of being guessed.
- Users can add custom shopping items without editing the source dish.
- Users can delete shopping items without editing the source dish.
- The regenerate button explicitly replaces the current shopping-list items from the meal-plan ingredients.
- Empty shopping lists show a clear path to return to the meal plan or add a manual item.
- Mobile layout keeps the main checking action visible and uses stacked controls for one-handed buying.
- Lists opened from the first-meal flow show a completion card before the items, with meal review and owner invitation follow-ups.
- The center page separates current shopping from history: completed lists are those explicitly completed or those with all items checked.
- The center page shows source meal plan, progress, pending count and the latest family actor so users can resume current shopping without finding the meal plan first.
- The mobile bottom navigation includes `清单`, and the dashboard has a direct `当前采购` entry.

## Implementation Notes

- Page actions call `src/lib/server/shopping-lists.ts` directly instead of calling JSON route handlers.
- Meal-plan detail uses `getMealPlanShoppingList` to decide whether to show open or generate actions.
- Regeneration uses the LES-92 default-list behavior: reuse the latest list for the meal plan and replace items only after the explicit action.
- `listShoppingLists` joins `shopping_lists` through `meal_plans.space_id`, so the center page stays scoped to the authenticated current workspace.
