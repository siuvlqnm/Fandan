# 饭单 / Fandan

饭单是一个菜单协作工具，面向家庭和家庭餐饮服务者，帮助负责安排吃什么的人创建菜单、分享确认忌口与偏好，并生成可编辑的购物清单。

## MVP 闭环

1. 新建饭单
2. 添加菜品
3. 分享给家人或客户确认
4. 收集忌口、偏好和备注
5. 生成购物清单
6. 存档并复用历史饭单

## 第一版目标用户

- 上门做饭、私厨、做饭阿姨
- 普通家庭
- 家宴或朋友聚餐组织者

## 第一版范围

- 登录和默认工作空间
- 用餐对象管理
- 菜品和食材管理
- 饭单创建、编辑、状态流转、复制复用
- 购物清单生成和勾选
- 分享确认链接和访客反馈
- 首页、移动端体验和上线准备

## 推荐技术栈

- SvelteKit + Svelte 5
- Tailwind CSS
- shadcn-svelte
- Better Auth
- Superforms + Zod
- Cloudflare D1 + Drizzle
- SvelteKit server routes/actions

## 当前骨架

- 首页：`/`
- 登录/注册占位：`/login`
- 健康检查：`/api/health`
- 数据库 schema：`src/lib/server/db/schema.ts`
- Better Auth schema：`src/lib/server/db/auth.schema.ts`
- Drizzle migration：`drizzle/`
- Cloudflare Worker/D1 配置：`wrangler.jsonc`

## 本地开发

当前 Svelte/Vite 依赖要求 Node `^20.19 || ^22.12 || >=24`。

```bash
npm install
cp .env.example .env
npm run auth:schema
npm run db:generate
npm run db:setup:local
npm run dev
```

打开 `http://127.0.0.1:5173/`。

数据库本地开发说明见 [docs/development/database.md](docs/development/database.md)。

## 验证

```bash
npm run check
npm run build
```

`npm run check` 会先生成 `worker-configuration.d.ts`，再执行 Svelte typecheck。

## 暂不做

菜谱社区、AI 自动推荐、精确营养计算、PDF/图片导出、实时多人协作、库存管理、支付订单、上门服务交易撮合、医疗级营养建议、小饭桌合规留样。
