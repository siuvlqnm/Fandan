# Fandan 1.0 Release Readiness

Version: `1.0.0`

## Product Closure

- A creator can register, create an object, create a dish with ingredients and create a meal plan.
- A meal plan can generate a shopping list in one action.
- The confirmation panel can create, copy, open and disable one current share link.
- Creating a share link moves draft meal plans to `pending_confirmation`.
- Visitors can submit item-level feedback and confirm the meal plan.
- Confirmed meal plans stop accepting duplicate confirmations and additional visitor feedback.
- Creator feedback keeps item notes attached to the relevant dish.
- Runtime pages render saved data or clear empty states; they do not display fabricated counts, dishes or participant progress.

## Release Verification

Run:

```bash
npm run release:verify
```

The command now also runs the isolated family-workspace collaboration and legacy-migration smoke added in LES-102. See `family-workspace-verification.md` for its coverage and cleanup guarantees.

Then complete an authenticated mobile browser smoke at `390 x 844`:

1. Register a temporary creator account.
2. Create one target with preference notes.
3. Create one dish with at least two ingredients.
4. Create one meal plan and verify the single existing target is selected automatically.
5. Generate the shopping list from the meal-plan summary action.
6. Toggle an item and add a manual item; verify the add form clears.
7. Create and copy a share link from the confirmation panel.
8. Open the public link, submit item feedback and confirm the meal plan.
9. Return to the creator page and verify the item note, global note and confirmation are visible.
10. Disable sharing and verify the public URL becomes unavailable.

## Production Rules

- Never run `scripts/db/seed.local.sql` against production.
- Set `BETTER_AUTH_SECRET` and `ORIGIN` in the production Worker environment.
- Apply new D1 migrations before deploying code that depends on them.
- Use `npm run deploy:dry-run` before a manual production deployment.
