# Targets Pages

LES-86 adds the creator-facing pages for managing meal targets.

## Routes

- `GET /app/targets`: target list with search and type filter.
- `POST /app/targets?/delete`: delete a target from the list.
- `GET /app/targets/new`: create form.
- `POST /app/targets/new`: create target.
- `GET /app/targets/:id`: edit form, meal-plan history and delete section.
- `POST /app/targets/:id`: update target.
- `POST /app/targets/:id?/delete`: delete target from the edit page.

Supporting placeholders:

- `GET /app/meal-plans/new?targetId=:id`: preserves the selected target until LES-90 implements meal-plan creation.
- `GET /app/meal-plans/:id`: protected placeholder for history links until LES-91 implements the detail workspace.

## Interaction Notes

- Search is server-side through query params and checks name, taste notes, dietary restrictions, budget notes and contact notes.
- Type filter supports all current target types: `home`, `client`, `gathering`, `other`.
- Target cards show type, people count, taste summary, dietary restriction summary and meal-plan count.
- Forms use the same `targetFormSchema` as server actions, so blank note fields become `null`.
- The list and edit pages both keep delete available, but deletion is a plain server action with a redirect back to `/app/targets`.

## Space Isolation

Every page load/action calls `requireUserSpace(event)`, and target operations reuse `src/lib/server/targets.ts`, which filters by current `space.id`.

## Files

- `src/lib/components/target-form.svelte`: shared target form component.
- `src/routes/app/targets/+page.server.ts`: list load and delete action.
- `src/routes/app/targets/+page.svelte`: list UI, search/filter and cards.
- `src/routes/app/targets/new/+page.server.ts`: create load/action.
- `src/routes/app/targets/new/+page.svelte`: create UI.
- `src/routes/app/targets/[id]/+page.server.ts`: edit load/update/delete.
- `src/routes/app/targets/[id]/+page.svelte`: edit UI and meal-plan history.
