# Feedback Aggregation

LES-96 adds creator-side feedback aggregation to `/app/meal-plans/:id`.

The page reads rows written by the public share flow and shows them in the protected creator workspace. This keeps visitor feedback visible where the creator already edits the meal plan.

## Service Boundary

`src/lib/server/feedback.ts`

- `getMealPlanFeedbackSummary(context, mealPlanId)` checks the meal plan belongs to the current `space.id`.
- It joins `feedback -> share_links -> meal_plans` so rows are always scoped through the creator's space.
- It returns total reaction counts, item-level counts, global notes, dietary notes and confirmation rows.
- `emptyItemFeedback(mealPlanItemId)` keeps page rendering stable for dishes without feedback.

## Detail Page Behavior

`/app/meal-plans/:id`

- Shows a `访客反馈` card below the dish workspace.
- Shows totals for `喜欢`, `不喜欢`, `想替换` and `确认`.
- Shows global dietary notes and freeform visitor notes.
- Shows per-dish counts and text notes without changing the dish editing controls.
- Shows a compact sidebar summary for confirmation state and latest feedback.

## Deferred

Directly applying feedback to adjust the meal plan is intentionally deferred. LES-96 keeps aggregation read-only so it does not blur the current full-list replacement editing model in `updateMealPlan`.
