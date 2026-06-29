# Next Meal Home Design

This document records the agreed direction for turning the Fandan home screen into a client-style PWA/app surface instead of an admin dashboard.

## Prototype

- Local prototype: `/Users/meat/Dev/ts/Fandan/prototypes/fandan-app-design/next-meal-room.html`
- Sibling prototype pages:
  - `/Users/meat/Dev/ts/Fandan/prototypes/fandan-app-design/dishes.html`
  - `/Users/meat/Dev/ts/Fandan/prototypes/fandan-app-design/shopping.html`
  - `/Users/meat/Dev/ts/Fandan/prototypes/fandan-app-design/home.html`
- Visual reference: `/Users/meat/Dev/ts/Fandan/prototypes/fandan-app-design/next-meal-room-reference.png`
- Preview URL while the local server is running: `http://127.0.0.1:8099/next-meal-room.html`
- Linear implementation issue: `LES-128` (`https://linear.app/less-lab/issue/LES-128/落地下一顿吃什么生活助理首页`)
- Linear sibling-pages issue: `LES-129` (`https://linear.app/less-lab/issue/LES-129/落地客户端底部导航其他页面`)

## Product Positioning

- The first screen is `安排饭`, centered on the daily question: `下一顿吃什么？`
- The product tone is warm household life assistant, not a batch-generated AI admin panel.
- The homepage should feel like a native app client: immediate, task-led, image-rich and easy to scan.
- Avoid backend terms on primary surfaces. Use meal and household language before data-object language.

## Home Screen Decisions

- Keep the top date selector and meal selector, but redesign them as app controls instead of dashboard filters.
- Date selection stays compact: `今天`, `明天`, `选日期`.
- Meal choices stay visible: `早餐`, `午餐`, `晚餐`, `宵夜`.
- Meal cards should not be static shortcuts. They carry context:
  - passed meals are softened and marked as passed
  - the current or next useful meal is visually recommended
  - later meals can be marked as preparation opportunities
  - snack should feel light and optional
- The status line near the top should explain the current judgment, for example `适合安排午餐`.
- The bottom module should be contextual. When there is an unfinished arrangement, continue it. Otherwise, show a useful suggestion for today.

## Navigation Language

Use app-facing labels:

- `今天`
- `常做菜`
- `买菜`
- `家`

Avoid exposing terms such as `后台`, `工作区`, `对象`, `系统状态` or raw workflow states on the first screen.

## Sibling Page Direction

The bottom navigation should feel like four native app areas, not four admin modules.

### 常做菜

- Purpose: choose from familiar dishes and reuse them in the next meal.
- Lead with useful dishes for the current meal instead of a generic database list.
- Search and categories are secondary controls; they should not dominate the first viewport.
- Dish rows should explain why the dish is useful now: time, taste, ingredients or family habit.

### 买菜

- Purpose: act on the current shopping list.
- Lead with the current list and remaining count, for example `午餐还缺 6 件`.
- Shopping items should be tappable checklist rows with quantity and source meal context.
- History and filters are secondary; the default view is what still needs buying.

### 家

- Purpose: household, preferences, invitations and account.
- Keep this as a calm secondary area, not the main operational surface.
- Use household language: `当前家庭`, `家庭成员`, `邀请家人`, `偏好`.
- Keep management-heavy settings lower on the page.

## Implementation Notes

- Implemented in Svelte on 2026-06-29.
- `/app` is the signed-in `今天` route and derives the recommended meal from the current time and existing quick-start slots.
- Existing meal-plan creation and quick-start behavior stays behind the primary CTA.
- Keep the page functional at a 390 x 844 mobile viewport with no horizontal overflow.
- Images should be treated as part of the interface, not pasted decorations. Crop, mask or blend them so they belong to the card.
- Do not add a separate AI tab. AI should stay inside the arrange-meal task flow.
- Route labels map as `/app` -> `今天`, `/app/dishes` -> `常做菜`, `/app/shopping-lists` -> `买菜`, `/app/settings` -> `家`.

## Implemented Surface

- `src/routes/app/+page.svelte`: client-style `今天` page led by `下一顿吃什么？`.
- `src/routes/app/dishes/+page.svelte`: `常做菜` page with familiar dishes and current-meal reuse.
- `src/routes/app/shopping-lists/+page.svelte`: `买菜` page led by the current pending list.
- `src/routes/app/settings/+page.svelte`: `家` page for household, preferences, invitations and account.
- `src/lib/components/mobile-bottom-nav.svelte`: bottom navigation labels updated to `今天`, `常做菜`, `买菜`, `家`.
- `src/lib/assets/meal-ui/`: production UI image assets adapted from the prototype.
- Secondary creator/share/invite pages had obvious backend wording removed so the flow does not snap back to admin language after the first screen.

## Full App Pass

Second implementation pass on 2026-06-29 removed the remaining admin-style page shells from secondary flows:

- `/app/meal-plans`: became an image-led `吃饭安排` surface with current meal actions and softer copy for copy/archive/delete actions.
- `/app/meal-plans/new`: became an `安排一顿饭` app task surface instead of a configuration form.
- `/app/meal-plans/[id]`: became a `这顿饭` page with menu, family confirmation, shopping and edit tabs.
- `/app/shopping-lists/[id]`: became a `买菜清单` checklist page with an image-led header and softer quantity-editing language.
- `/app/dishes/new` and `/app/dishes/[id]`: became `这道菜` task pages, with form language changed from data fields to cooking language.
- `/app/targets`, `/app/targets/new` and `/app/targets/[id]`: became `家人偏好` pages instead of object/profile management pages.
- `/app/invitations`, `/invite/[token]`, `/login`, `/register` and `/share/[token]`: now use the same app card, imagery and household language.

The shared app shell now uses softer glass panels, image-led scene heroes and rounded mobile controls so remaining pages do not fall back to the previous admin/dashboard look.

## 2026-06-29 .fd-* Design Vocabulary Pass

A third same-day pass replaced the remaining `.app-*` styling vocabulary on every `/app/*` page with a single `.fd-*` design language ported from the static HTML prototypes in `app-redesign/`. No page server, action, form field, route or data binding changed; this is a full CSS-vocabulary and markup replacement plus a shared flow-stepper component.

### Static prototypes

- `app-redesign/app.css` is the source-of-truth design system; it was ported into `src/routes/layout.css` as a parallel `.fd-*` component layer.
- `app-redesign/*.html` are the per-page prototypes (`today`, `meal-plans`, `meal-plan-detail`, `meal-plan-new`, `dishes`, `dish-detail`, `dish-new`, `shopping`, `shopping-detail`, `home`, `targets`). They are kept in the repository as design reference and are not part of the runtime bundle.
- `app-redesign/assets/reference` is a symlink to `../../prototypes/fandan-app-design/assets/reference`, which lives outside the repository. The prototype HTML references images as `assets/reference/*`, so images resolve on machines that also have the external `prototypes/` checkout but will be broken links in a fresh clone. **TODO (2026-06-29): fix the prototype asset path so the reference directory is self-contained.** Options: copy the meal-ui images into `app-redesign/assets/reference/` (duplicates ~164K), or rewrite the HTML image paths to point at `../../src/lib/assets/meal-ui/`. This only affects the design-reference directory, not the runtime app.

### Design vocabulary

- Warm cream page surface (`--fd-bg: #fbf7ef`) instead of the previous cool grey-green.
- Service green `--fd-green`, warm orange `--fd-orange` for confirm emphasis, coral `--fd-coral` for destructive and attention states, with soft variants for callout backgrounds.
- Component classes live in `src/routes/layout.css` under a `.fd-*` namespace: `fd-screen`, `fd-topbar`, `fd-brand`, `fd-back-btn`, `fd-hero-card`, `fd-detail-card`, `fd-soft-card`, `fd-form-card`, `fd-pill`, `fd-state-pill`, `fd-primary-btn`, `fd-ghost-btn`, `fd-danger-btn`, `fd-fab`, `fd-sticky-action`, `fd-segmented`, `fd-search-row`, `fd-section-head`, `fd-card-list`, `fd-list-card`, `fd-check-card`, `fd-profile-card`, `fd-tool-grid`, `fd-member-row`, `fd-setting-row`, `fd-field`, `fd-text-input`, `fd-textarea`, `fd-select`, `fd-chip`, `fd-ingredient-row`, `fd-slot-grid`, `fd-plan-item`, `fd-empty` and modifiers.

### Four-step flow stepper

- New shared component `src/lib/components/flow-steps.svelte` renders `安排 → 确认 → 买菜 → 完成` with the current step highlighted and completed steps checked.
- It reads `flow.step` from `src/lib/domain/meal-flow.ts` (`getMealFlowState`), so the stepper stays in sync with the existing flow state machine and does not add new data.
- Used on `/app` (today hero), `/app/meal-plans` (per-card), `/app/meal-plans/[id]` (detail hero) and target detail.

### Shared form engines

- `DishForm` (`src/lib/components/dish-form.svelte`) and `TargetForm` (`src/lib/components/target-form.svelte`) are shared form engines that keep their internal `.app-input` controls. They are wrapped in `.fd-form-card` chrome on the new/edit pages so the surrounding page matches the `.fd-*` system while the form internals stay unchanged and keep their server-side validation contract.

### Page coverage

- Rewrote `/app`, `/app/meal-plans`, `/app/meal-plans/new`, `/app/meal-plans/[id]`, `/app/dishes`, `/app/dishes/new`, `/app/dishes/[id]`, `/app/shopping-lists`, `/app/shopping-lists/[id]`, `/app/targets`, `/app/targets/new`, `/app/targets/[id]`, `/app/settings` and `/app/invitations` to the `.fd-*` vocabulary.
- `mobile-bottom-nav.svelte` was restyled to the new bottom bar (border-top, white/translucent, four equal tabs); href and active-match logic are unchanged.
- Non-`/app` surfaces (`/`, `/login`, `/register`, `/share/[token]`, `/invite/[token]`) were intentionally left on their current styles this pass.

### Flow boundary preserved

This pass did not touch any `+page.server.ts` or `+layout.server.ts` load or action, any `?/action` name, any form `name=` field, `enhanceWithFeedback` usage, `data-confirm` / `data-pending-label`, `src/lib/server/**`, routes, or the meal-flow state machine. Only `.svelte` markup/classes, `layout.css`, `mobile-bottom-nav.svelte` and the new `flow-steps.svelte` changed.

## QA Checklist

- First viewport clearly answers `下一顿吃什么？`
- The current meal recommendation is visible without opening another page.
- Text does not overflow inside date cards, meal cards, CTA buttons or bottom navigation.
- Bottom navigation does not cover the active bottom module.
- All primary controls have at least a 44px touch target.
- The screen does not read as a management console or database dashboard.

## Verification

- `npm run check` passed on 2026-06-29.
- `npm run build` passed on 2026-06-29.
- `npm run check` and `npm run build` passed again after the full app pass on 2026-06-29.
- `npm run check` passed again after the `.fd-*` pass on 2026-06-29 (0 errors, 0 warnings).
- Mobile browser smoke at 390 x 844:
  - `/` rendered without horizontal overflow.
  - `/login` rendered without horizontal overflow.
  - `/app` correctly redirected to `/login?next=%2Fapp` when unauthenticated.
- Mobile authenticated smoke at 390 x 844:
  - Registered a local test account and opened `/app`, `/app/meal-plans`, `/app/meal-plans/new`, `/app/dishes`, `/app/dishes/new`, `/app/shopping-lists`, `/app/settings`, `/app/targets`, `/app/targets/new` and `/app/invitations`.
  - Created a local test meal, then checked the generated shopping-list detail page and meal-plan detail page.
  - No horizontal overflow, broken images or removed backend terms were found in the checked pages.
- User-facing Svelte text scan found no remaining `工作台`, `系统状态`, `菜品库`, `家庭空间` or `工作区` strings.
- Build note: local Node is `22.9.0`; Vite recommends `20.19+` or `22.12+`. The build completed successfully despite that environment warning.

## 2026-06-29 .fd-* Pass End-to-End Verification

The `.fd-*` pass was verified end-to-end through the local dev server with real form submissions (not mocked APIs):

- Registered a fresh account through the real `/register?/signUpEmail` action and confirmed a `better-auth.session_token` cookie was set.
- All ten `/app/*` routes returned `200` and rendered the `.fd-*` shell (`fd-screen`, `fd-topbar`, per-page `data-testid`) with correct Chinese titles.
- Created a target through `POST /app/targets/new` (default action) and landed on the `.fd-*` detail page with the four-step flow stepper.
- Created a dish with two ingredients through `POST /app/dishes/new?/create` and confirmed the detail page rendered ingredients, instructions and servings.
- Created a meal plan through `POST /app/meal-plans/new?/create` and confirmed it auto-generated a shopping list and redirected to `?first=1` — verifying the `安排 → 看吃什么 → 知道买什么` line.
- Shopping-list detail showed correct serving-scaled quantities (e.g. `饭单 3 份 ÷ 基准 2 人份` → `鸡蛋 4.5 个`).
- Toggled a shopping item through `?/toggleItem` (`name=itemId`, `name=checked`); progress moved from `0/2` to `1/2` and the row gained the `is-done` class.
- Created an invitation through `POST /app/invitations?/create`; the invitations page then showed the pending record, 7-day expiry, copy button and the success pill.
- `git status` confirmed only the planned `.svelte` files, `layout.css`, `mobile-bottom-nav.svelte`, the new `flow-steps.svelte` and the `app-redesign/` prototype directory changed; no `+page.server.ts`, `+layout.server.ts` or `src/lib/server/**` file was touched.
- Limitation: pixel-level visual QA at 390 x 844 was not performed (no browser in this environment); functional and data-flow correctness was confirmed end-to-end.
