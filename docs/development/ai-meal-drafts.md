# AI Meal Drafts

LES-126 adds AI-assisted meal-plan drafts to the existing `/app/meal-plans/new` flow. The manual path stays complete when AI is unavailable.

## Product Contract

- The AI helper accepts natural language such as `今晚 3 人，清淡，半小时能做好`.
- AI only fills the same editable meal form used by the manual `安排一顿饭` path.
- Nothing is written to D1 until the user submits `安排好并查看购物清单`.
- Existing saved dishes and AI-suggested new dishes are shown separately.
- Suggested new dishes can be removed from the draft or replaced one at a time without resetting the rest of the form.
- When the prompt matches a saved meal target, confirmed target dietary restrictions stay higher priority than the prompt.
- AI assumptions and constraints are visible before save.

## Runtime Boundary

- Provider entry point: `src/lib/server/ai/meal-drafts.ts`.
- Page entry point: `src/routes/app/meal-plans/new/+page.server.ts`.
- Current provider: Cloudflare Workers AI through the `AI` binding.
- Default model: `@cf/meta/llama-3.1-8b-instruct-fast`.
- Cost and reliability limits: max 2 attempts, 12s per attempt and 1000 output tokens.
- `AI_MEAL_MODEL` can override the model when exposed as an environment variable.
- The provider is isolated behind `MealDraftProvider`, matching the LES-124 dish draft boundary.

## Validation And Recovery

- AI output is parsed as JSON and validated by `mealDraftSchema` before the form is populated.
- `existingDishIds` and `targetId` are normalized against the current workspace's allowed dishes and targets.
- Replacement mode excludes the dish being replaced and the remaining draft names.
- Invalid structure, timeout, provider failure and missing binding return form errors and keep manual creation usable.
- The final save path reuses the same schema, permission context, dish creation, meal-plan creation and shopping-list generation logic as manual creation.

## Verification Notes

- Use `wrangler dev` with the configured remote AI binding for end-to-end AI smoke tests.
- Use the product mobile viewport for visual checks because this entry is part of the first-use path.
