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

New users see one prominent `安排一顿饭` action. Dish and target management are not presented as prerequisites.

Existing users see a priority panel:

1. Pending-confirmation meal plans, when any exist.
2. Today's meal plans, when no pending-confirmation plans exist.
3. Recently updated meal plans as the fallback.

New users see only the first-meal panel beneath the greeting; later dashboard summaries stay hidden until the first meal exists. Existing users keep one primary action in the priority panel, while the lower shopping-list entry is secondary when a priority meal is already available.

## Sections

- Stats: targets, dishes and meal plans, each linking to its management page.
- Priority: pending confirmation, today or recent meal plans.
- This week: meal plans whose date range overlaps the current week.
- Recent meal plans: last updated active meal plans.
- Recent targets: newest meal targets.
- Recent dishes: newest dishes.

## Handoff Notes

The current date logic compares `YYYY-MM-DD` strings. This matches the existing meal-plan date inputs. If later versions add timezone-aware scheduling or non-date datetime fields, move date range logic into a shared helper and cover it with unit tests.
