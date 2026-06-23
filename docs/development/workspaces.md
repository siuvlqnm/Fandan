# Family Workspace Data Model

LES-104 establishes the persistence layer for turning the original owner-only `space` into a family workspace. It does not yet change request authorization; LES-105 will make the runtime context membership-aware.

## Tables

### `spaces`

`spaces.owner_user_id` remains the compatibility anchor for existing 1.0 data. New and existing owners also receive an active `space_members` row with role `owner`.

### `space_members`

- One row per user and workspace, enforced by `space_members_space_user_unique`.
- Roles are `owner` and `member`.
- Statuses are `active`, `left` and `removed`.
- A partial unique index permits only one `owner` role per workspace.
- Deleting a workspace or user cascades its membership rows.

The first collaboration release uses only active owners and members. `left` and `removed` retain enough state for later leave, removal and rejoin flows without creating duplicate membership rows.

### `space_invitations`

- Tokens are globally unique.
- Roles are stored as `owner` or `member`, but LES-100 should only create member invitations; owner transfer needs a separate explicit flow.
- Statuses are `pending`, `accepted` and `revoked`.
- Expiration is computed from the UTC ISO-8601 `expires_at` value instead of adding an `expired` status.
- `accepted_at`, `revoked_at` and `accepted_by_user_id` preserve invitation outcome details.
- Deleting a workspace cascades invitations. Deleting an inviter or accepting user clears the corresponding audit reference.

### `user_preferences`

Stores the user's selected `current_space_id` outside Better Auth's generated user and session schema. Deleting the selected workspace sets the preference to `NULL`.

The foreign key proves that the space exists, but it cannot prove that the user is a member. LES-105 must validate membership before accepting or using the stored current workspace.

## Default Workspace Creation

`ensureDefaultSpace` now creates the following records together through a D1 batch:

1. The default `spaces` row.
2. An active owner `space_members` row.
3. A `user_preferences` row selecting that workspace.

For an existing owner space, the helper repairs missing membership or preference records without duplicating them.

## Migration

`drizzle/0002_rainy_mindworm.sql` creates the three new tables and then:

- joins existing `spaces.owner_user_id` values to real Better Auth users;
- backfills one active owner membership for each valid owned space;
- selects the earliest owned space as each existing owner's initial current workspace.

The migration intentionally keeps `spaces.owner_user_id` so 1.0 authorization continues working until LES-105 switches reads to `space_members`.

## Security Invariants

- Business records remain isolated by `space_id`.
- A user-space pair is unique.
- A workspace has at most one owner role.
- Role and status values are protected by database checks, not only TypeScript types.
- Invitation tokens must be high entropy when LES-100 adds creation APIs.
- Public meal-plan share tokens remain separate from workspace invitations and member authorization.

## Verification

LES-104 verification covers:

- migration over existing owner spaces;
- duplicate member and second-owner rejection;
- invalid member/invitation status rejection;
- invitation token uniqueness;
- workspace cascade behavior and current preference clearing;
- new-account creation producing the space, owner membership and preference together;
- local seed compatibility.
