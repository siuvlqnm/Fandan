# Development Progress

This file records completed implementation slices so other Codex threads can quickly resume work without reconstructing context from Git history or Linear.

## LES-90 - Meal Plan List And Create Flow

Status: implemented.

Commit: see Git history entry `Add meal plan list and create flow`.

What changed:

- Added `/app/meal-plans` list page with status, type and target filters.
- Added list actions to open, duplicate, archive and delete meal plans.
- Replaced `/app/meal-plans/new` placeholder with a real create flow.
- New meal-plan flow supports selecting an existing target, quickly creating a target, setting title/type/date/meal slot and optionally adding the first dish.
- Existing `targetId` and `dishId` entry links now prefill the create flow.
- Updated `/app/meal-plans/:id` placeholder to read through `getMealPlan` and show type/item count.
- Updated dashboard "新建饭单" entry to `/app/meal-plans/new`.
- Added `docs/development/meal-plans-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/meal-plans`, create first meal plan with quick target, create from existing target/dish context, verify detail placeholder, filter list, duplicate, archive and delete.
- Mobile viewport browser check for `/app/meal-plans` and `/app/meal-plans/new`.

Notes for next threads:

- Use `docs/development/meal-plans-pages.md` for LES-91 handoff.
- Detail editing is intentionally still placeholder-level and belongs to LES-91.
- New flow creates at most one initial dish item; the full item workspace starts in LES-91.

## LES-89 - Meal Plan CRUD API And Status Flow

Status: implemented.

Commit: see Git history entry `Add meal plan CRUD API`.

What changed:

- Added protected `/api/meal-plans` list and create endpoints.
- Added protected `/api/meal-plans/:id` detail, patch and delete endpoints.
- Added protected `/api/meal-plans/:id/duplicate` endpoint that copies a meal plan and items into a new draft.
- Added protected `/api/meal-plans/:id/archive` endpoint that marks a meal plan archived.
- Added `src/lib/server/meal-plans.ts` with Zod validation, serialization, space-scoped Drizzle operations, target/dish reference checks and archived edit protection.
- Meal-plan create supports `single_meal`, `day`, `week` and `gathering`, defaults status to `draft`, and accepts optional items for future detail-page reuse.
- `PATCH /api/meal-plans/:id` rejects archived meal plans with `409 CONFLICT`.
- Added `docs/development/meal-plans-api.md` and linked it from the README/server docs.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates single-meal, day, week and gathering meal plans, creates plan items with dishes, filters list, patches status, duplicates to draft, archives, verifies archived patch conflict, reads detail, and deletes test plans.
- Logged-out `GET /api/meal-plans` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/meal-plans-api.md` as the contract for LES-90 page work.
- Meal-plan item creation/update is currently full-list replacement through the parent payload; LES-91 can add narrower item actions if the detail workspace needs more granular autosave.
- Archived meal plans are immutable through `PATCH`; duplicate archived history before editing.

## LES-88 - Dish List And Edit Pages

Status: implemented.

Commit: see Git history entry `Add dish management pages`.

What changed:

- Added `/app/dishes` list page with search, category filter, dish cards, tags/ingredient summary and delete action.
- Added `/app/dishes/new` create page.
- Added `/app/dishes/:id` edit page with ingredient summary, add-to-meal-plan entry and delete action.
- Added shared `DishForm` component for create/edit forms with comma-separated tags and editable ingredient rows.
- Added page form helpers in `src/lib/server/dishes.ts` so page actions reuse LES-87 validation and serialization boundaries.
- Updated the dashboard dish entry to point to `/app/dishes`.
- Updated `/app/meal-plans/new?dishId=:id` placeholder to preserve selected dish context before LES-90/LES-91 replace the meal-plan flow.
- Added `docs/development/dishes-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/dishes`, create name-only dish, create dish with ingredients/tags, filter/search, edit, open meal-plan placeholder, delete dish.
- Mobile viewport browser check for `/app/dishes` and `/app/dishes/new`.

Notes for next threads:

- Use `docs/development/dishes-pages.md` for page behavior and route boundaries.
- Meal-plan placeholder routes are intentionally minimal and should be replaced by LES-90 and LES-91.
- Dish page actions reuse `src/lib/server/dishes.ts`; keep future page/API behavior aligned there.

## LES-87 - Dish And Ingredient CRUD API

Status: implemented.

Commit: see Git history entry `Add dish ingredient CRUD API`.

What changed:

- Added protected `/api/dishes` list and create endpoints.
- Added protected `/api/dishes/:id` detail, patch and delete endpoints.
- Added `src/lib/server/dishes.ts` with Zod validation, serialization, space-scoped Drizzle operations and ingredient replacement behavior.
- Dish create supports saving with only `name`; `tags`, `ingredients` and `visibility` receive MVP defaults.
- Dish create/update supports multiple ingredients with name, quantity, unit, category, notes and sort order.
- Dish list supports `q` or `search` query against dish name, category, tags and ingredient names.
- Added `docs/development/dishes-api.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates a name-only dish, creates a dish with multiple ingredients, searches by dish name, ingredient name and tag, patches fields and ingredients, reads detail, and deletes the dish.
- Logged-out `GET /api/dishes` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/dishes-api.md` as the contract for LES-88 page work.
- `PATCH /api/dishes/:id` keeps existing ingredients when `ingredients` is omitted and replaces the full list when `ingredients` is provided.
- Search currently runs in the service layer after loading current-space dishes and ingredients, which is acceptable for the MVP library size but can move into SQL if the dish library grows.

## LES-86 - Meal Target List And Edit Pages

Status: implemented.

Commit: see Git history entry `Add meal target management pages`.

What changed:

- Added `/app/targets` list page with search, type filter, target cards and delete action.
- Added `/app/targets/new` create page.
- Added `/app/targets/:id` edit page with historical meal-plan section and delete action.
- Added shared `TargetForm` component for create/edit forms.
- Added placeholder `/app/meal-plans/new?targetId=:id` and `/app/meal-plans/:id` routes so target card links are not broken before LES-90/LES-91.
- Updated `/app` dashboard target entry to point to `/app/targets`.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/targets`, create target, filter/search, edit, open meal-plan placeholder, delete target.
- Mobile viewport browser check for `/app/targets` and `/app/targets/new`.

Notes for next threads:

- Use `docs/development/targets-pages.md` for route and UX boundaries.
- Meal-plan placeholder routes are intentionally minimal and should be replaced by LES-90 and LES-91.
- Target page actions reuse `src/lib/server/targets.ts`; keep future page/API behavior aligned there.

## LES-85 - Meal Target CRUD API

Status: implemented.

Commit: see Git history entry `Add meal target CRUD API`.

What changed:

- Added space-scoped target API routes under `/api/targets`.
- Added create, list, detail, patch, delete and target meal-plan list endpoints.
- Added `src/lib/server/targets.ts` for Zod validation, serialization and Drizzle operations.
- `POST /api/targets` supports creating a target with only `name`; `type` defaults to `home` and `peopleCount` defaults to `1`.
- `PATCH /api/targets/:id` only changes explicitly provided fields and does not reset missing fields to defaults.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates, lists, reads, updates, lists meal plans for, and deletes a target.
- Logged-out `GET /api/targets` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/targets-api.md` as the contract for page work.
- The implemented route prefix is `/api`; Linear's `/targets` notation refers to the product endpoint family.
- All creator-side target queries filter by the current `space.id`.

## LES-84 - Better Auth Login And Default Workspace

Status: implemented.

Commit: see Git history entry `Implement auth workspace flow`.

What changed:

- Added protected creator workspace route `/app`.
- Added `/logout`.
- Login and registration now redirect to `/app` by default and honor a safe `?next=/path` value.
- Successful sign in/sign up creates a default `spaces` row when the user does not have one.
- `requireUserSpace(event)` now guarantees an authenticated user has a current workspace.
- Root layout exposes authenticated navigation and logout.

Verification checklist:

- `npm run check`
- `npm run build`
- Logged-out `/app` returns a redirect to `/login?next=%2Fapp`.
- `/api/health` remains public.
- `/api/me` returns unified 401 while logged out.

Notes for next threads:

- Current auth mode is email + password. Better Auth's `email-otp` and `magic-link` plugins exist in the installed package, but email delivery is not configured yet.
- Creator-side feature work should start from `/app` and use `space.id` for every business query.
- Future `/share/**` pages should remain public and resolve by `share_links.token`.
