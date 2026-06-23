# Auth And Workspace

LES-84 establishes the creator login baseline for the MVP.

## Current Scope

- Auth provider: Better Auth.
- Login mode: email + password through Better Auth's email API.
- Session storage: Better Auth session cookie.
- Protected creator route: `/app`.
- Public routes: `/`, `/login`, `/api/health`, future `/share/**`.
- Workspace ownership: each creator gets a default `spaces` row, active owner membership and current-space preference on first successful sign up or sign in.

Better Auth also ships `email-otp` and `magic-link` plugins in the installed package. They are not enabled yet because the MVP does not have an email delivery provider configured. The switch point is `src/lib/server/auth.ts` and the `/login` page actions.

## Runtime Flow

1. `src/hooks.server.ts` creates `event.locals.auth` from the Cloudflare D1 binding.
2. Better Auth reads the session cookie and populates `event.locals.user` and `event.locals.session`.
3. `/login` actions call `signInEmail` or `signUpEmail`.
4. After a successful auth call, `ensureDefaultSpace(db, user)` creates the user's first workspace, owner membership and current-space preference when needed.
5. `/app` requires `locals.user` and `locals.session`; unauthenticated requests redirect to `/login?next=/app`.
6. `/logout` calls `auth.api.signOut` and redirects to `/login`.

## Files

- `src/lib/server/auth.ts`: Better Auth config and Drizzle adapter.
- `src/hooks.server.ts`: per-request Better Auth instance and session hydration.
- `src/lib/server/workspace.ts`: default workspace helpers.
- `docs/development/workspaces.md`: LES-104 membership, invitation and current-space persistence model.
- `src/lib/server/context.ts`: API context helper; `requireUserSpace` now also guarantees a workspace exists.
- `src/routes/login/+page.server.ts`: Superforms actions for email sign in/sign up.
- `src/routes/app/+page.server.ts`: protected creator workspace load.
- `src/routes/logout/+server.ts`: logout endpoint.

## Space Isolation Rule

Creator-side data must be queried through the current `space.id`. Use one of these helpers:

- Page loads/actions: require `locals.user`, then call `ensureDefaultSpace(db, locals.user)`.
- API routes: call `requireUserSpace(event)` and use the returned `space`.

Public share pages are the exception. They should resolve data by `share_links.token` and only return visitor-safe fields.

## 1.1 Transition Boundary

LES-104 adds and backfills `space_members`, `space_invitations` and `user_preferences`, but `getCurrentSpace` still resolves the legacy owner workspace. LES-105 is responsible for switching authorization and current-space selection to active membership records. Keeping this boundary explicit lets the schema migration ship without breaking 1.0 access.

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

Create an account at `/login`, then visit `/app`. The dashboard should show the default workspace name and space-scoped counts.
