# Family Workspace Invitations

LES-100 provides the complete invitation and join path for family workspaces.

## Product Routes

- `/app/invitations`: owner-only mobile page for creating, copying and revoking invitation links.
- `/invite/:token`: public invitation preview and authenticated acceptance page.
- `/login?next=/invite/:token`: login/registration entry that preserves invitation context.

The public page shows only the workspace name, invitation expiry and lifecycle state. Shared business records become readable only after an active membership is created.

## API Routes

- `GET /api/workspace/invitations`: list invitations for the selected workspace; owner only.
- `POST /api/workspace/invitations`: create a member invitation; owner only. JSON accepts `expiresInDays` from 1 to 30 and defaults to 7.
- `DELETE /api/workspace/invitations/:id`: revoke a pending invitation in the selected workspace; owner only.
- `GET /api/invitations/:token`: public safe preview.
- `POST /api/invitations/:token/accept`: accept as the authenticated user and select the joined workspace.

## Lifecycle

Stored statuses are `pending`, `accepted` and `revoked`. Expiry is derived from `expires_at`, so an expired pending row is presented as `expired` without rewriting history.

Acceptance is idempotent for the user who already accepted the link. A different user receives a conflict after the invitation is accepted. Owners and active members cannot join again. A fresh invitation reactivates an existing `left` or `removed` membership row instead of creating a duplicate user-space pair.

## Security And Concurrency

- Creation uses 32 random bytes encoded as base64url.
- Owner authorization goes through `requireSpaceOwner`.
- Membership creation selects from a still-pending, unexpired invitation inside the D1 batch.
- Historical memberships are reactivated through the same guarded batch and keep the unique user-space row.
- The invitation update repeats the same status and expiry guards.
- The current-workspace preference changes only after the accepted invitation and membership are read back for the current user.
- Tokens never cross into meal-plan sharing or ordinary workspace authorization.
