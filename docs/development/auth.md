# Auth And Workspace

LES-84 establishes the creator login baseline for the MVP.

## Current Scope

- Auth provider: Better Auth.
- Login mode: email + password through Better Auth's email API.
- Session storage: Better Auth session cookie.
- Protected creator route: `/app`.
- Public routes: `/`, `/login`, `/register`, `/api/health`, `/share/**` and `/invite/**`.
- Workspace ownership: each creator gets a default `spaces` row, active owner membership and current-space preference on first successful sign up or sign in.

Better Auth also ships `email-otp` and `magic-link` plugins in the installed package. They are not enabled yet because the MVP does not have an email delivery provider configured. The switch point is `src/lib/server/auth.ts` and the `/login` page actions.

## Runtime Flow

1. `src/hooks.server.ts` creates `event.locals.auth` from the Cloudflare D1 binding.
2. Better Auth reads the session cookie and populates `event.locals.user` and `event.locals.session`.
3. `/login` calls `signInEmail`; `/register` calls `signUpEmail`. Each page has one primary task.
4. After a successful auth call, `ensureDefaultSpace(db, user)` creates the user's first workspace, owner membership and current-space preference when needed.
5. `requireUserSpace` validates the stored current workspace against an active membership, repairs stale preferences and returns both the selected space and membership role.
6. `/app` requires `locals.user` and `locals.session`; unauthenticated requests redirect to `/login?next=/app`.
7. Direct registration redirects to `/app/meal-plans/new`; a safe `?next=/path` overrides this for invitation and protected-route returns.
8. `/logout` calls `auth.api.signOut` and redirects to `/login`.

## Files

- `src/lib/server/auth.ts`: Better Auth config and Drizzle adapter.
- `src/hooks.server.ts`: per-request Better Auth instance and session hydration.
- `src/lib/server/workspace.ts`: default workspace helpers.
- `docs/development/workspaces.md`: LES-104 membership, invitation and current-space persistence model.
- `src/lib/server/context.ts`: membership-aware workspace selection plus member and owner authorization helpers.
- `src/routes/login/+page.server.ts`: Superforms action for email sign in.
- `src/routes/register/+page.server.ts`: Superforms action for email sign up and first-meal redirect.
- `src/routes/app/+page.server.ts`: protected creator workspace load.
- `src/routes/logout/+server.ts`: logout endpoint.

## Space Isolation Rule

Creator-side data must be queried through the current `space.id`. Use one of these helpers:

- Page loads/actions: require `locals.user`, then call `ensureDefaultSpace(db, locals.user)`.
- API routes: call `requireUserSpace(event)` and use the returned `space`.

Public share pages are the exception. They should resolve data by `share_links.token` and only return visitor-safe fields.

## 1.1 Authorization Boundary

Current-space selection is resolved through active `space_members` records. Owners and members may use ordinary space-scoped APIs; dangerous operations such as member management must require the owner role. A stale preference is repaired to another active membership, while users without membership receive `403`. Individual resource queries continue to include the selected `space_id`, so guessed cross-space IDs return `404`.

Public share pages remain separate: they resolve visitor-safe meal-plan data through `share_links.token` and do not grant workspace membership.

## Local Smoke Test

```bash
npm run db:setup:local
npm run dev
```

Then verify:

```bash
curl -i http://127.0.0.1:5173/app
```

Expected result when logged out: `302` redirect to `/login?next=%2Fapp`.

Create an account at `/register`. Direct registration should land on `/app/meal-plans/new`; invitation registration should return to the invitation preview before acceptance.
