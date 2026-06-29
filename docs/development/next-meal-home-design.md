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
- Mobile browser smoke at 390 x 844:
  - `/` rendered without horizontal overflow.
  - `/login` rendered without horizontal overflow.
  - `/app` correctly redirected to `/login?next=%2Fapp` when unauthenticated.
- User-facing Svelte text scan found no remaining `工作台`, `系统状态`, `菜品库`, `家庭空间` or `工作区` strings.
- Build note: local Node is `22.9.0`; Vite recommends `20.19+` or `22.12+`. The build completed successfully despite that environment warning.
