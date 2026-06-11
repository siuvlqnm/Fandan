# Dish Pages

LES-88 adds creator-side pages for maintaining reusable dishes and ingredients. Pages are protected and use the current authenticated `space.id`.

## Routes

- `/app/dishes`: dish library list with search, category filter, dish cards and delete action.
- `/app/dishes/new`: create dish page.
- `/app/dishes/:id`: edit dish page with ingredient summary and delete action.
- `/app/meal-plans/new?dishId=:id`: temporary placeholder entry that preserves selected dish context until LES-90/LES-91 replace the meal-plan flow.

## UX Boundaries

- Users can create a dish with only `name`.
- Optional fields: category, tags, simple instructions and ingredients.
- Tags are entered as comma-separated text and stored as a string array.
- Ingredient rows support name, quantity, unit, category and notes.
- Blank ingredient rows are ignored on submit.
- Search covers dish names, categories, tags and ingredient names through `src/lib/server/dishes.ts`.
- Category filtering is derived from current-space dish categories.

## Implementation Notes

- Page actions call `src/lib/server/dishes.ts` directly instead of calling JSON route handlers.
- Shared form component: `src/lib/components/dish-form.svelte`.
- Form submissions use `dishFormSchema`, `dishFormToCreateInput` and `dishFormToUpdateInput` so page behavior stays aligned with the LES-87 API contract.
- `PATCH /api/dishes/:id` replaces ingredients only when an ingredient array is provided; page edit forms always submit the full ingredient list.
