# MVP Deployment

LES-99 covers the first production deployment and real-user trial setup.

## Current Production Deployment

The production D1 database has been created through the Cloudflare API connector:

- Database name: `fandan`
- Database id: `a6dfa36e-47ca-4d6a-ae9b-20297ea7c90a`
- Migration status: `drizzle/0000_panoramic_carnage.sql`, `drizzle/0001_groovy_wilson_fisk.sql`, `drizzle/0002_rainy_mindworm.sql` and `drizzle/0003_worried_luminals.sql` have been applied to production D1 and recorded in `d1_migrations`.
- Production URL: `https://fandan.siuvlqnm.workers.dev/`
- Deployment path: Cloudflare dashboard is authorized to read the GitHub project and automatically deploy updates from GitHub.

The first production Worker deployment is live. Local Wrangler authentication or a deploy-scoped API token is still useful for manual deploys, `wrangler tail`, and remote D1 commands:

```bash
npx wrangler whoami
npx wrangler d1 list
```

Both commands require a valid Wrangler login or `CLOUDFLARE_API_TOKEN`, but routine deploys are now handled through Cloudflare's GitHub integration.

## Required Production Values

Set or verify these in Cloudflare before relying on production:

- `CLOUDFLARE_API_TOKEN`: Wrangler API token with permission to deploy Workers and manage D1 for this account.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account id.
- `CLOUDFLARE_DATABASE_ID`: `a6dfa36e-47ca-4d6a-ae9b-20297ea7c90a`.
- `ORIGIN`: deployed Worker URL, currently `https://fandan.siuvlqnm.workers.dev/`, or the future custom domain.
- `BETTER_AUTH_SECRET`: high-entropy production secret, different from local development.
- `AI` binding: Workers AI binding configured by `wrangler.jsonc` for AI dish and meal drafts.
- `AI_DISH_MODEL` and `AI_MEAL_MODEL`: optional non-secret model override variables.

Use Wrangler secrets or dashboard variables for production secrets. Do not commit real values.

## Production D1 Setup

1. Use Cloudflare dashboard deployment for normal GitHub-driven updates.
2. Authenticate Wrangler only when manual remote commands are needed.
3. Confirm the production D1 database named `fandan` is reachable.
4. Generate bindings after config changes:

```bash
npm run gen
```

Remote migrations for the current schema have already been applied. When future migration files are added, apply them through the Cloudflare dashboard/connector path or use `npm run db:migrate:remote` after Wrangler authentication is available.

`0002_rainy_mindworm.sql` was applied on 2026-06-23. The pre-migration Time Travel bookmark is `00000018-00000000-00005093-e0309fb1ba77a32e14180e79e91b1f81`. Post-migration verification found 3 users, 3 spaces, 3 owner memberships, 3 current-space preferences and no spaces missing an active owner membership.

2026-06-25 production sync verification after LES-126:

- `npm run db:migrate:remote` returned `No migrations to apply!`.
- `origin/main` pointed to `16ba17a922a1df6aebeb5ab762ef118e82bf6cdf`.
- `https://fandan.siuvlqnm.workers.dev/api/health` returned `ok: true` and `database.queryOk: true`.

The local demo seed file deletes and recreates demo data for local development. Do not run `scripts/db/seed.local.sql` against production.

## Deploy Commands

Manual dry run:

```bash
npm run deploy:dry-run
```

Manual deploy:

```bash
npm run deploy
```

These commands build the SvelteKit Cloudflare worker output before calling Wrangler. Routine production updates are expected to deploy automatically after GitHub updates are picked up by Cloudflare.

## Trial Data

Prepare first-trial data through the production UI after signing in with a test creator account:

- 用餐对象：我家、张女士家、周末朋友聚餐
- 菜品：番茄炒蛋、清蒸鲈鱼、莲藕排骨汤 and 2-3 other common dishes
- 饭单：one pending-confirmation client dinner and one reusable family meal plan
- 购物清单：generated from the pending-confirmation dinner
- 分享链接：one active link for the pending-confirmation dinner

Keep this data owned by the test creator account's default space so it exercises normal auth and space isolation.

## Production Smoke Checklist

After deploy:

- Open `https://fandan.siuvlqnm.workers.dev/api/health` and confirm D1 is available with `queryOk: true`.
- Sign up or sign in with the test creator account.
- Create a meal target, dish, meal plan and shopping list.
- Create a share link and open `/share/:token` without login.
- Submit visitor feedback and confirmation from the share page.
- Return to the creator meal-plan detail page and confirm feedback aggregation renders.
- Check mobile width around 390px for dashboard, meal-plan list, shopping list and share page.

## Logging

Use Wrangler tail while testing production:

```bash
npx wrangler tail fandan
```

Record any deploy URL, custom domain, production D1 id and trial account notes in `docs/development/progress.md` after the first successful deployment.
