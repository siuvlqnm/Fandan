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

- Shows feedback in the dedicated confirmation workspace.
- Shows totals for `喜欢`, `不喜欢`, `想替换` and `确认`.
- Shows global dietary notes and freeform visitor notes.
- Shows per-dish counts and text notes with the dish name, date and meal slot so feedback cannot lose its context.
- Shows the latest confirmation next to the current meal-plan status.

## Deferred

Directly applying feedback to adjust the meal plan is intentionally deferred. LES-96 keeps aggregation read-only so it does not blur the current full-list replacement editing model in `updateMealPlan`.
