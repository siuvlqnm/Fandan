# 饭单 / Fandan

饭单是一个菜单协作工具，面向家庭和家庭餐饮服务者，帮助负责安排吃什么的人创建菜单、分享确认忌口与偏好，并生成可编辑的购物清单。

当前发布版本：`1.0.0`。

## 1.0 闭环

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

## 1.0 范围

- 主移动端体验，桌面端仅提供基本功能展示
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
- 登录/注册：`/login`
- 创建者工作台：`/app`
- 退出登录：`POST /logout`
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
核心数据模型说明见 [docs/development/data-model.md](docs/development/data-model.md)。
服务端 API 约定见 [docs/development/server.md](docs/development/server.md)。
登录和默认工作空间说明见 [docs/development/auth.md](docs/development/auth.md)。
家庭工作区数据模型说明见 [docs/development/workspaces.md](docs/development/workspaces.md)。
用餐对象 API 说明见 [docs/development/targets-api.md](docs/development/targets-api.md)。
用餐对象页面说明见 [docs/development/targets-pages.md](docs/development/targets-pages.md)。
菜品与食材 API 说明见 [docs/development/dishes-api.md](docs/development/dishes-api.md)。
菜品库页面说明见 [docs/development/dishes-pages.md](docs/development/dishes-pages.md)。
饭单 API 说明见 [docs/development/meal-plans-api.md](docs/development/meal-plans-api.md)。
饭单页面说明见 [docs/development/meal-plans-pages.md](docs/development/meal-plans-pages.md)。
购物清单 API 说明见 [docs/development/shopping-lists-api.md](docs/development/shopping-lists-api.md)。
购物清单页面说明见 [docs/development/shopping-lists-pages.md](docs/development/shopping-lists-pages.md)。
分享链接和访客反馈 API 说明见 [docs/development/share-links-api.md](docs/development/share-links-api.md)。
访客分享确认页面说明见 [docs/development/share-pages.md](docs/development/share-pages.md)。
反馈聚合说明见 [docs/development/feedback-aggregation.md](docs/development/feedback-aggregation.md)。
首页工作台说明见 [docs/development/dashboard.md](docs/development/dashboard.md)。
移动端打磨和表单交互说明见 [docs/development/mobile-polish.md](docs/development/mobile-polish.md)。
移动端重设计方向见 [docs/development/mobile-redesign.md](docs/development/mobile-redesign.md)。
MVP 部署说明见 [docs/development/deployment.md](docs/development/deployment.md)。
1.0 发布检查见 [docs/development/release-1.0.md](docs/development/release-1.0.md)。
1.1 家庭协作开发计划见 [outputs/饭单-1.1家庭协作开发计划.md](outputs/饭单-1.1家庭协作开发计划.md)。
每轮交接记录见 [docs/development/progress.md](docs/development/progress.md)。

## 验证

```bash
npm run check
npm run build
npm run release:verify
```

`npm run check` 会先生成 `worker-configuration.d.ts`，再执行 Svelte typecheck。

## 暂不做

菜谱社区、AI 自动推荐、精确营养计算、PDF/图片导出、实时多人协作、库存管理、支付订单、上门服务交易撮合、医疗级营养建议、小饭桌合规留样。
