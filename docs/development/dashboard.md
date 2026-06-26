# Dashboard

`/app` is the creator dashboard after login. It is intentionally an operational first screen, not a marketing page.

## Data Loaded

The page requires an authenticated user and default space through `requireUserSpace(event)`.

It loads space-scoped:

- meal targets through `listTargets`
- dishes through `listDishes`
- meal plans through `listMealPlans`

The dashboard derives counts, recent records, pending confirmation plans, today's plans and the current week's plans in the page server load. Archived meal plans are excluded from active dashboard sections.

## First Screen Rules

The first actionable module on the dashboard is the date-and-meal-slot quick start. It lets the user choose today, tomorrow or a custom date, then breakfast, lunch, dinner or late night.

For today, already-passed slots are disabled based on Asia/Shanghai time. Choosing an available slot creates a pending-confirmation meal plan immediately, adds deterministic starting recommendations and opens the meal detail.

Dish and target management are not presented as prerequisites.

Existing users also see a priority panel below the quick start:

1. Pending-confirmation meal plans, when any exist.
2. Today's meal plans, when no pending-confirmation plans exist.
3. Recently updated meal plans as the fallback.

New users see only the first-meal panel beneath the greeting; later dashboard summaries stay hidden until the first meal exists. Existing users keep one primary action in the priority panel, while the lower shopping-list entry is secondary when a priority meal is already available.

The dashboard should read as a meal cockpit, not an admin overview. The first screen answers:

1. `下一顿安排了吗？`
2. `现在需要决定什么？`
3. `现在需要买什么？`

Priority actions use family-task language:

- `安排一顿饭` when there is no useful current meal.
- `发给家人确认` when a meal exists but no share link has been created.
- `继续确认` when feedback is open or pending.
- `去买菜` when a shopping list is ready.
- `查看这顿饭` when the meal is complete or there is no stronger next action.

System concepts such as targets, workspace ownership and meal-plan status remain available in secondary surfaces. They should not be required to understand the first screen.

## Sections

- Quick start: date selector and breakfast/lunch/dinner/late-night buttons for immediate meal creation.
- Priority meal: pending confirmation, today or recent meal plans, with one task-first action.
- Buying cue: direct access to the current meal's generated shopping list when available.
- This week: meal plans whose date range overlaps the current week.
- Recent meal plans: last updated active meal plans.
- Secondary tools: dish library, meal profiles, family invitations and workspace settings, linked from `我的` rather than the dashboard first screen.

## Handoff Notes

The dashboard date and quick-start slot logic uses Asia/Shanghai date keys. Meal-plan range checks still compare `YYYY-MM-DD` strings, which matches the existing meal-plan date inputs.
