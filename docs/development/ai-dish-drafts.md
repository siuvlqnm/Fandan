# AI Dish Drafts

LES-124 adds AI-assisted dish completion to the existing `/app/dishes/new` entry. The manual path remains the primary fallback and does not depend on AI availability.

## Product Contract

- Users can still create a dish by filling only the name and saving.
- The optional `一句话补全草稿` form accepts natural language such as `番茄炒蛋，3 人份，少油`.
- AI only fills the same editable dish form. It does not write to D1 until the user submits `确认并创建菜品`.
- The draft can include category, tags, base servings, ingredients and instructions.
- Unknown or suggested fields are returned in `uncertainFields` and surfaced as review warnings in the form.
- Allergy, dietary restriction, identity and family-member information are not inferred by the dish-draft prompt.

## Runtime Boundary

- Provider entry point: `src/lib/server/ai/dish-drafts.ts`.
- Current provider: Cloudflare Workers AI through the `AI` binding.
- Default model: `@cf/meta/llama-3.2-3b-instruct`.
- Cost and reliability limits: max 2 attempts, 12s per attempt and 1200 output tokens.
- `AI_DISH_MODEL` can override the model when exposed as an environment variable.
- The provider is isolated behind `DishDraftProvider`, so future AI Gateway or other model providers can be added without touching the page action.

## Validation And Recovery

- AI output is parsed as JSON and validated by `dishDraftSchema` before the form is populated.
- User-provided dish names may repair an otherwise valid draft with an empty `name`; other unsafe missing values stay nullable or fail validation.
- Invalid structure, timeout, provider failure and missing binding return understandable form errors and keep the manual form usable.
- The server logs attempt count, model, duration and token usage when available, without logging the user prompt.

## Verification Notes

- Use `wrangler dev` with the configured remote AI binding for local AI smoke tests; D1 can still be isolated with `--persist-to`.
- For visual checks, use the product mobile viewport when the local URL policy allows it. In this run the in-app browser blocked `127.0.0.1:4175`, so the AI flow was verified through authenticated HTTP actions and isolated D1 state.
