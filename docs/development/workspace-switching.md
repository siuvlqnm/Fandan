# Multiple Workspace Creation And Switching

LES-103 adds safe multi-workspace use without making the common single-workspace experience feel like an admin console.

## Product Route

`/app/settings` is the workspace management surface.

- A user with one active membership sees only a compact `需要另一个家庭空间？` disclosure.
- A user with multiple active memberships sees `我的工作区`, the selected workspace, membership role and one-tap switch actions.
- Creating a workspace automatically selects it and shows explicit feedback.
- Switching reloads the current workspace settings; dashboard and business routes resolve the same persisted selection on their next request.

## API Routes

- `GET /api/workspaces`: list all active workspace memberships for the current user, with `isCurrent`.
- `POST /api/workspaces`: create an owner workspace and select it. JSON body: `{ "name": string }`.
- `POST /api/workspaces/:id/select`: select an existing active membership.

Existing singular `/api/workspace` endpoints continue to represent the currently selected workspace.

## Persistence And Authorization

Workspace creation writes the `spaces`, owner `space_members` and `user_preferences` records in one D1 batch. Selection goes through `requireSpaceMembership`; a signed-in non-member receives `403` and the stored preference is not changed.

Ordinary target, dish, meal-plan and shopping-list APIs do not accept the selected workspace from the browser. They call `requireUserSpace`, which reads the trusted preference, validates active membership and scopes every business query by the resolved `space_id`.

If the selected membership becomes `left` or `removed`, member lifecycle operations clear that preference. The next authenticated request chooses another active membership, preferring an owner workspace, and persists the repaired selection.

No schema migration is required for LES-103.
