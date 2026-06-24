# 核心体验与 AI 优化交接

更新日期：2026-06-24

## 新对话从这里开始

直接执行 [LES-121](https://linear.app/less-lab/issue/LES-121)：修正菜品基准份数与购物清单数量规则。

不要重新做产品规划。先阅读本文件和 LES-121 的验收标准，检查当前实现与数据迁移影响，然后完成代码、文档、验证、提交和 Linear 回填。LES-121 完成后继续下一个已解除阻塞的任务。

建议的新对话首句：

> 先阅读 `docs/development/core-experience-ai-handoff.md`，然后从 LES-121 开始实现。验证、更新文档并提交后，继续下一个已解除阻塞的任务。

## 已确认的产品方向

- 第一目标用户是普通家庭；专业做饭服务能力保留，但不占据家庭首用主路径。
- 核心任务是“安排一顿饭 -> 决定吃什么 -> 知道买什么”。
- 家庭用户不需要先区分工作区和对象：工作区是多人共享与权限边界；对象是一次用餐服务的家庭、客户或聚餐档案。当前家庭默认成为用餐上下文，对象仅在专业场景按需出现。
- 注册和登录拆开；注册成功后直接进入“安排第一顿饭”。
- 页面一个主任务、一个主按钮；零数据隐藏筛选，少量数据只显示紧凑搜索，高级能力按需展开。
- 移动端是主要产品面，验收基准视口为 `390 × 844`。

## AI 边界

- 不做独立 AI 首页或导航，AI 只嵌入添加菜品、安排饭单、整理购物项等具体任务。
- 手动和 AI 共用同一份可编辑草稿、schema 校验、权限和保存路径。
- AI 只生成草稿，用户确认后才写入正式数据；AI 不可用时手动流程必须完整可用。
- 菜品补全优先生成分类、标签、基准份数、食材和步骤；不确定项必须标记。
- 饭单生成优先复用已有菜品，新建议需明确区分，并支持单道替换。
- 购物数量由确定性规则计算。AI 只能分类、合并建议、给出替代项或异常提醒。
- 过敏、忌口、权限和身份不得被 AI 静默推断或覆盖。

## Linear 执行队列

里程碑：[Phase 9.5 首次使用与 AI 基础](https://linear.app/less-lab/project/饭单-11-家庭协作-e38e53b6ad2a)

总任务：[LES-120 重构首次使用与核心用餐流程](https://linear.app/less-lab/issue/LES-120)

| 顺序 | 任务 | 目的 | 主要依赖 |
|---|---|---|---|
| 1 | [LES-121](https://linear.app/less-lab/issue/LES-121) | 基准份数与可信购物数量 | 无 |
| 2 | [LES-122](https://linear.app/less-lab/issue/LES-122) | 拆分登录注册与首用引导 | 无 |
| 3 | [LES-123](https://linear.app/less-lab/issue/LES-123) | 重构手动安排一顿饭 | LES-121、LES-122 |
| 4 | [LES-125](https://linear.app/less-lab/issue/LES-125) | 精简导航、列表首屏和设置 | LES-123 |
| 5 | [LES-124](https://linear.app/less-lab/issue/LES-124) | AI 菜品草稿补全 | LES-121、LES-123 |
| 6 | [LES-126](https://linear.app/less-lab/issue/LES-126) | AI 饭单草稿生成 | LES-123、LES-124 |
| 7 | [LES-127](https://linear.app/less-lab/issue/LES-127) | 后续 AI 机会评估 | LES-124、LES-126 |

LES-106 至 LES-109 暂由 LES-120 阻塞。先把核心流程做得愿意用，再恢复协作增强。

## 本地依据

- `docs/audits/2026-06-24-first-use-flow/AUDIT.md`：15 个实际页面/流程截图及证据化审计。
- `docs/audits/2026-06-24-first-use-flow/PROBLEMS-AND-AI.md`：P0/P1/P2 问题清单、目标流程和 AI 机会地图。
- `outputs/饭单-1.1家庭协作开发计划.md`：项目阶段与交付顺序。
- `docs/development/progress.md`：每轮实现、验证和交接记录。

## 每张任务的完成标准

1. 将 Linear 状态设为 In Progress，再按任务验收标准实现，不额外扩展范围。
2. 同步更新对应功能文档和 `docs/development/progress.md`。
3. 至少运行 `npm run check`、`npm run build` 及与风险匹配的 API/浏览器 smoke。
4. 涉及移动页面时，在 `390 × 844` 验证主流程、首屏密度、触控尺寸和横向溢出。
5. 涉及 migration 时先完成本地旧数据保护验证；合并前按项目规则单独确认生产 D1 migration。
6. 提交并推送后，在 Linear 留下实现、验证、文档和 commit 证据，再标记 Done。
