# Family Workspace Release Verification

LES-102 closes the Phase 9 family-workspace foundation with a repeatable collaboration and migration gate.

## Commands

Run the focused smoke after a production build:

```bash
npm run build
npm run verify:family-workspace
```

Run the complete release gate:

```bash
npm run release:verify
```

`release:verify` runs type checking, the Cloudflare production build and the family-workspace smoke in that order.

## Isolation

`scripts/verify-family-workspace.mjs` creates a temporary Wrangler D1 persistence directory under the operating-system temp directory. It never reads or writes the ordinary `.wrangler/state` database and never contacts production D1.

The script applies migrations `0000` and `0001`, inserts a real credential-based legacy user plus 1.0 business data, then applies every later migration currently needed by the Worker. The temporary Worker uses that same database. The Worker and temporary directory are stopped and removed in `finally`, including on failed assertions.

The test requires `.svelte-kit/cloudflare/_worker.js`; run `npm run build` first when invoking the focused smoke directly.

## Covered Flow

- A pre-1.1 owner logs in after migration and retains the original workspace, target, dish, meal plan and shopping list.
- Owner membership and current-workspace preference are backfilled.
- An anonymous invitation preview exposes the workspace name without business records.
- A second account accepts the invitation; repeating acceptance is idempotent.
- The member creates a dish and meal plan, generates a shopping list and checks an item; the owner sees each shared change.
- Phase 10 ownership columns remain migration-safe for legacy rows while new dish, meal-plan and shopping-list writes record the acting member.
- Versioned edits reject stale dish updates, stale meal-plan updates and stale shopping-list regeneration with `409` instead of silently overwriting another member's work.
- The owner dashboard renders real family pending tasks and activity from the shared workspace, including a member-created meal/shopping task and member activity.
- A resource in the member's personal workspace returns `404` to the owner.
- Selecting an unrelated workspace and using owner-only invitation APIs return `403`.
- Revoked, expired and already-consumed invitations reject acceptance with `409`.
- Both independent authenticated sessions render protected application pages.

Mobile browser verification remains a release-review step at `390 x 844` until LES-113 adds broader automated browser coverage.
