# Dish Pages

LES-88 adds creator-side pages for maintaining reusable dishes and ingredients. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/dishes`: dish library list with adaptive search/filter density, dish cards and delete action.
- `/app/dishes/new`: create dish page with the optional AI dish-draft helper and the full manual form.
- `/app/dishes/:id`: edit dish page with ingredient summary and delete action.

## AI dish drafts

- The AI helper shares the same add-dish entry and form; there is no separate AI navigation or chat surface.
- `?/draft` accepts a short natural-language prompt and fills a structured, editable form draft.
- `?/create` is the only action that writes a dish to D1.
- Drafts are validated server-side and uncertainty is shown before save, especially for base servings and suggested ingredient quantities.
- See `docs/development/ai-dish-drafts.md` for provider, timeout, retry and failure behavior.

## Base servings

- Create and edit forms ask how many people the complete ingredient list serves.
- Migrated dishes display a warning until the user reviews and saves the safe `1`-serving default.
- The edit summary shows the active basis because shopping-list quantities depend on it.
- `/app/meal-plans/new?dishId=:id`: temporary placeholder entry that preserves selected dish context until LES-90/LES-91 replace the meal-plan flow.

## UX Boundaries

- Users can create a dish with only `name`.
- Optional fields: category, tags, simple instructions and ingredients.
- Tags are entered as comma-separated text and stored as a string array.
- Ingredient rows support name, quantity, unit, category and notes.
- Blank ingredient rows are ignored on submit.
- Search covers dish names, categories, tags and ingredient names through `src/lib/server/dishes.ts`.
- Category filtering is derived from current-space dish categories.
- Empty libraries hide search and category filters. Libraries with up to five dishes show one-line search only; larger libraries expose category filtering in a collapsed secondary control.
- The dish library is reached from `我的 -> 菜品库`; it is intentionally not a fixed bottom-navigation destination.

## Implementation Notes

- Page actions call `src/lib/server/dishes.ts` directly instead of calling JSON route handlers.
- Shared form component: `src/lib/components/dish-form.svelte`.
- Form submissions use `dishFormSchema`, `dishFormToCreateInput` and `dishFormToUpdateInput` so page behavior stays aligned with the LES-87 API contract.
- `PATCH /api/dishes/:id` replaces ingredients only when an ingredient array is provided; page edit forms always submit the full ingredient list.
