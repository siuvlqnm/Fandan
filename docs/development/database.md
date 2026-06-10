# Database Development

饭单 MVP 使用 Cloudflare D1 + Drizzle。当前本地数据库绑定名是 `DB`，D1 数据库名是 `fandan`。

## Requirements

当前 Svelte/Vite 依赖要求 Node `^20.19 || ^22.12 || >=24`。

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:setup:local
npm run dev
```

`db:setup:local` 会先执行本地 D1 migration，再写入演示 seed 数据。

## Commands

```bash
npm run db:generate
npm run db:migrate:local
npm run db:seed:local
npm run db:setup:local
npm run db:studio
```

- `db:generate`: 根据 `src/lib/server/db/schema.ts` 生成 Drizzle migration。
- `db:migrate:local`: 将 `drizzle/` 下的 migration 应用到本地 D1。
- `db:seed:local`: 执行 `scripts/db/seed.local.sql`，写入演示空间、对象、菜品、饭单、购物清单和分享链接。
- `db:setup:local`: 本地 migration + seed 的一键入口。
- `db:studio`: 打开 Drizzle Studio。

## Health Check

启动开发服务器后访问：

```bash
curl http://127.0.0.1:5173/api/health
```

正常情况下会返回：

```json
{
	"ok": true,
	"service": "fandan",
	"runtime": "sveltekit-cloudflare",
	"database": {
		"binding": "DB",
		"available": true,
		"queryOk": true,
		"spaces": 1
	}
}
```

`queryOk: true` 表示 API 可以通过 Cloudflare D1 binding 查询数据库。

## Files

- `wrangler.jsonc`: Cloudflare Worker 和 D1 binding 配置。
- `drizzle.config.ts`: Drizzle Kit 配置。
- `src/lib/server/db/schema.ts`: 应用核心 schema。
- `src/lib/server/db/auth.schema.ts`: Better Auth 生成的认证 schema。
- `drizzle/0000_panoramic_carnage.sql`: 初始 migration。
- `scripts/db/seed.local.sql`: 本地演示数据。
- `docs/development/data-model.md`: MVP 数据模型和关系说明。

## Remote D1

当前 `wrangler.jsonc` 里的 `database_id` 是本地开发占位值。接入生产 D1 时：

1. 在 Cloudflare 创建 D1 数据库。
2. 将真实 `database_id` 写入 `wrangler.jsonc`。
3. 设置 `.env` 里的 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_DATABASE_ID`、`CLOUDFLARE_D1_TOKEN`。
4. 使用 `wrangler d1 migrations apply fandan --remote` 应用远端 migration。
