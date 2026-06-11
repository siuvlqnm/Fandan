# MVP Deployment

LES-99 covers the first production deployment and real-user trial setup.

## Current Blocker

This checkout is not currently authenticated with Cloudflare Wrangler:

```bash
npx wrangler whoami
npx wrangler d1 list
```

Both commands require a valid Wrangler login or `CLOUDFLARE_API_TOKEN`. Do not deploy while `wrangler.jsonc` still contains the placeholder D1 `database_id`.

## Required Production Values

Set these before deploying:

- `CLOUDFLARE_API_TOKEN`: Wrangler API token with permission to deploy Workers and manage D1 for this account.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account id.
- `CLOUDFLARE_DATABASE_ID`: real production D1 database id.
- `ORIGIN`: deployed Worker URL or custom domain, for example `https://fandan.example.com`.
- `BETTER_AUTH_SECRET`: high-entropy production secret, different from local development.

Use Wrangler secrets or dashboard variables for production secrets. Do not commit real values.

## Production D1 Setup

1. Authenticate Wrangler.
2. Create or identify the production D1 database named `fandan`.
3. Replace the placeholder `database_id` in `wrangler.jsonc`.
4. Generate bindings after config changes:

```bash
npm run gen
```

5. Apply remote migrations:

```bash
npm run db:migrate:remote
```

The local demo seed file deletes and recreates demo data for local development. Do not run `scripts/db/seed.local.sql` against production.

## Deploy Commands

Dry run:

```bash
npm run deploy:dry-run
```

Deploy:

```bash
npm run deploy
```

These commands build the SvelteKit Cloudflare worker output before calling Wrangler.

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

- Open `/api/health` and confirm D1 is available with `queryOk: true`.
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
