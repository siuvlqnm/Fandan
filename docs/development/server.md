# Server Infrastructure

饭单 MVP 先使用 SvelteKit server routes/actions。后续如果需要独立 Worker、移动端公开 API 或更复杂的 API 网关，再考虑拆出 Hono。

## Route Boundaries

- `src/routes/api/**/+server.ts`: REST-style JSON API。
- `src/routes/**/+page.server.ts`: 页面 load/actions，只服务当前页面表单和页面数据。
- `src/lib/server/api/*`: API 响应、错误和校验基础设施。
- `src/lib/server/context.ts`: 当前请求的 D1、Drizzle、用户和 space 上下文。
- `src/lib/server/workspace.ts`: 默认 space 创建和查询 helper。
- `src/lib/server/db/*`: schema、relations、DB client。

页面 action 可以复用 `src/lib/server/context.ts`，但不要直接复用 API route handler。API route 返回统一 JSON；页面 action 返回 Superforms/SvelteKit action data。

## API Envelope

成功响应：

```json
{
	"ok": true,
	"data": {}
}
```

错误响应：

```json
{
	"ok": false,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Authentication is required"
	}
}
```

字段校验错误会返回 `issues`：

```json
{
	"ok": false,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Request validation failed",
		"issues": [
			{
				"path": "title",
				"message": "Required"
			}
		]
	}
}
```

## API Helpers

Use `apiRoute` for server routes:

```ts
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';

export const GET = apiRoute(async () => {
	return apiOk({ status: 'ready' });
});
```

Use `parseJsonBody` for JSON request validation:

```ts
import { parseJsonBody } from '$lib/server/api/validation';
import { z } from 'zod';

const schema = z.object({
	title: z.string().min(1)
});

const body = await parseJsonBody(event, schema);
```

## Request Context

Use `getRequestContext(event)` when an endpoint only needs D1/Drizzle:

```ts
const { db } = getRequestContext(event);
```

Use `requireUserSpace(event)` for protected creator-side APIs:

```ts
const { db, user, session, space } = await requireUserSpace(event);
```

This enforces:

- D1 binding is available.
- The request is authenticated.
- The user has a current `spaces` row; if missing, the default workspace is created.

Public share routes are the exception. They should resolve data through `share_links.token` and only return fields allowed for visitors.

## Current Reference Endpoints

- `GET /api/health`: public health check with D1 query status.
- `GET /api/me`: protected endpoint returning current user, session and space.
