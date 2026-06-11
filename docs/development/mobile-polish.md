# Mobile Polish And Safer Form Actions

LES-98 adds a light interaction layer for MVP trial readiness. The goal is to make core mobile workflows feel safe and responsive without changing server contracts.

## Enhanced Form Behavior

`src/lib/forms/enhance.ts` exports `enhanceWithFeedback`, a small Svelte action built on SvelteKit `enhance`.

It provides:

- submit-button disabling while a form action is pending
- optional pending labels through `data-pending-label`
- optional browser confirmation through `data-confirm`
- graceful reset when an action returns validation errors instead of redirecting

The helper keeps normal SvelteKit form behavior, including progressive enhancement fallback when JavaScript is unavailable.

## Covered Workflows

The enhanced behavior is wired into:

- dish create/edit forms and dish delete actions
- meal target create/edit forms and target delete actions
- meal-plan list duplicate, archive and delete actions
- meal-plan create flow
- meal-plan detail metadata save, status update, item removal, shopping-list generation and dish insertion actions
- shopping-list toggle, save, add, delete and regenerate actions
- public share feedback and confirmation forms

## Confirmation Rules

Confirm before actions that can remove, archive or overwrite user work:

- deleting dishes, targets, meal plans or shopping-list items
- archiving meal plans
- removing a dish from a meal plan
- regenerating an existing shopping list

Fast reversible actions such as shopping-list toggles keep only the pending state.

## Handoff Notes

Future UI work should prefer `enhanceWithFeedback` for new SvelteKit form actions unless the flow needs a custom optimistic update or modal confirmation. Keep destructive confirmations specific to the affected record name when it is available.
