# Family Workspace Settings

LES-101 turns the mobile `我的` navigation item into a real family and account settings surface.

## Product Route

`/app/settings` is available to every active workspace member.

- Owners see workspace rename, active members, invitation controls and member removal.
- Members see the workspace and active member list plus their own leave action.
- Owner-only controls are not rendered for members.
- Destructive actions use an explicit confirmation, pending label and result feedback.
- `/app/invitations` remains available as the full invitation-history view.

## API Routes

- `GET /api/workspace`: return the current workspace and membership.
- `PATCH /api/workspace`: rename the current workspace; owner only.
- `GET /api/workspace/members`: list active members for the current workspace.
- `DELETE /api/workspace/members/:id`: mark a non-owner member as `removed`; owner only.
- `POST /api/workspace/leave`: mark the current non-owner membership as `left`.

Invitation endpoints remain documented in `invitations.md`.

## Permission And Lifecycle Rules

- `requireSpaceOwner` protects workspace rename, invitation management and member removal.
- Owners cannot remove themselves, remove another owner or leave before ownership transfer exists.
- Member removal and voluntary leave retain the historical membership row for audit and safe rejoin.
- If the affected workspace is currently selected, its preference is cleared in the same D1 batch.
- A later request falls back to another active membership; every registered user already has a personal owner workspace.
- Accepting a fresh invitation reactivates a `left` or `removed` member row rather than inserting a duplicate.

No schema migration is required for LES-101.
