# 饭单 App 重设计落地审查

日期：2026-06-30

## 背景

Claude Code 已按前序视觉方向重做 App 页面。本次审查目标不是重新设计，而是确认当前实现是否已经像一个可用的移动 App，以及还剩哪些必须修的落地问题。

审查方式：

- 本地 `npm run build` 后用 `npm run preview` 启动 Cloudflare Worker 预览。
- 使用本地 D1 测试数据进入登录态。
- 主要视口：390 x 844。
- 截取首页、饭单列表、常做菜、买菜、家、饭单详情、购物清单详情、分享确认页。

## 截图证据

- [01-dashboard.png](01-dashboard.png) - 首页 / 今天
- [02-meal-plans.png](02-meal-plans.png) - 饭单列表
- [03-dishes.png](03-dishes.png) - 常做菜
- [04-shopping-lists.png](04-shopping-lists.png) - 买菜
- [05-settings.png](05-settings.png) - 家 / 设置
- [06-meal-detail.png](06-meal-detail.png) - 饭单详情
- [07-shopping-detail.png](07-shopping-detail.png) - 购物清单详情
- [08-share-confirmation.png](08-share-confirmation.png) - 分享确认页

## 总体结论

这版方向明显成立。它已经从后台式页面转成了移动端生活 App：视觉更温暖，入口更集中，首页围绕“下一顿吃什么”，饭单列表能表达流程，分享页也足够克制。

但还不能直接收工。真实移动端里仍有几处会影响使用的落地问题：固定底部操作条遮挡内容、常做菜列表过挤、部分餐别/列表卡片文字和图片抢空间、长文本场景还需要压测。

## 分步健康度

1. 首页 / 今天：基本健康  
   首屏问题清楚，日期和餐别入口直观。风险是餐别卡内部文案、图片和箭头略挤，长推荐文案容易被视觉裁切。

2. 饭单列表：健康  
   `安排 -> 确认 -> 买菜` 的主线明确，状态卡和主操作清晰，是当前最稳的页面之一。

3. 常做菜：需要打磨  
   顶部推荐卡可用，但下方列表行过密。菜名、分类、食材、图片、加入按钮、删除按钮挤在一起，阅读和点击都偏紧。

4. 买菜列表：基本健康  
   首屏能快速说明“今天要买什么”。浮动加号略压主卡片右下区域，但暂未挡住核心信息。

5. 家 / 设置：基本健康  
   工具入口和家庭设置层级清楚。需要继续测长家庭名、长邮箱、多人成员列表，避免卡片内文本挤压。

6. 饭单详情：需要打磨  
   底部固定操作条会覆盖下方菜品卡，滚动中阅读有遮挡感。需要增加底部安全距离，或调整 sticky 操作条样式。

7. 购物清单详情：需要打磨  
   `看这顿饭安排` 固定 CTA 明显压住第一条蔬菜卡，是当前最清楚的功能性视觉问题。

8. 分享确认页：健康  
   接收者视角足够聚焦，视觉克制，没有多余导航干扰。当前状态页可继续保留。

## 必修项

- 修复饭单详情和购物清单详情的底部 sticky CTA 遮挡内容。
- 重排常做菜列表项，降低单行密度，确保菜名、食材和操作按钮互不挤压。
- 收紧首页餐别卡的文案展示策略，避免推荐文案与图片/箭头冲突。
- 对设置页成员卡、账号卡做长邮箱和长家庭名压测。

## 可访问性风险

- 被裁切或遮挡的文本会影响放大阅读和低视力用户。
- 底部固定操作条遮内容时，可能让用户以为某些卡片不可操作。
- 淡绿、淡黄徽章需要后续用自动化对比度工具复核。

## 验证记录

- `npm run build`：通过。
- 构建警告：当前 Node.js 是 `22.9.0`，Vite 要求 `20.19+`、`22.12+` 或 `24+`。不阻塞本次审查，但建议升级本地 Node。

## 2026-06-30 修复复验

已修复：

- 菜品列表不再使用固定假图，改为按菜名和分类自动生成的菜品识别视觉。前期不做上传图片时，页面仍有稳定的视觉锚点，且不会误导用户以为这是真实菜品照片。
- 常做菜列表卡片重排为「自动菜品视觉 + 菜名信息 + 操作」结构，降低行内拥挤。
- 菜品详情、饭单详情、购物清单详情、偏好详情和新建饭单页的底部操作从固定悬浮改为页面内操作区，避免滚动时覆盖表单、菜品卡或购物项。
- 新建菜品页文案改为说明“自动生成识别样式”，不再暗示需要上传图片。

复验截图：

- [fix-verification/dishes-list-viewport-v2.png](fix-verification/dishes-list-viewport-v2.png) - 常做菜首屏
- [fix-verification/dish-detail-real-viewport-v2.png](fix-verification/dish-detail-real-viewport-v2.png) - 菜品详情首屏
- [fix-verification/meal-plan-detail-viewport-v2.png](fix-verification/meal-plan-detail-viewport-v2.png) - 饭单详情首屏
- [fix-verification/meal-plan-new-full-v2.png](fix-verification/meal-plan-new-full-v2.png) - 新建饭单整页
- [fix-verification/shopping-list-detail-full-v2.png](fix-verification/shopping-list-detail-full-v2.png) - 购物清单整页

复验命令：

- `npm run check`：通过，0 errors / 0 warnings。
- `npm run build`：通过。
- 本地预览：`http://localhost:4173`，390 x 844 移动端视口截图复查，浏览器控制台无 error。

## 2026-06-30 二次交互修复复验

本轮针对最新反馈继续调整：

- `常做菜`：卡片从偏大的展示卡收紧为紧凑列表行，仍保留分类筛选入口。
- `安排一顿饭`：产品规则改为每顿饭只安排一道菜。手写菜名、AI 草稿、已有菜选择、替换和详情页加菜都会收敛到单道菜。
- `加菜/换菜`：不再用不可扩展的下拉选择。已有菜改为搜索 + 单选卡，支持按菜名、分类、食材查找，默认只露出少量候选。
- `购物清单详情`：移除 `待买 / 已买 / 全部` 切换，所有物品放在同一页；按分类分组，未买项在前，已买项留在原分类下并用完成态区分。
- `购物清单项`：删除等次级操作收进更多按钮，减少窄屏按钮错位和卡片拥挤。

复验截图：

- [interaction-polish/dishes-list-viewport-final.png](interaction-polish/dishes-list-viewport-final.png) - 常做菜紧凑列表首屏
- [interaction-polish/meal-plan-new-full-final.png](interaction-polish/meal-plan-new-full-final.png) - 新建饭局单菜选择整页
- [interaction-polish/meal-plan-detail-viewport-final.png](interaction-polish/meal-plan-detail-viewport-final.png) - 饭局详情单菜状态
- [interaction-polish/shopping-list-detail-full-final.png](interaction-polish/shopping-list-detail-full-final.png) - 购物清单一页化整页

复验命令：

- `npm run check`：通过，0 errors / 0 warnings。
- `npm run build`：通过。
- 本地预览：`http://localhost:4173`，390 x 844 移动端视口截图复查，浏览器控制台 0 error。

## 2026-06-30 二次纠偏复验

本轮纠正上一轮的错误理解：

- `每一餐只能出现一次` 指的是同一日期 + 同一餐别只能有一个饭局/菜单，不是一个饭局只能有一道菜。
- 饭局详情恢复多菜菜单展示；`加菜` 会追加到当前菜单，`移除` 只移除对应菜品。
- `今天` 页快捷入口现在会复用已有饭局。已安排的餐别显示 `已安排`，点击后打开已有饭局；旧重复本地数据在首页按餐别去重展示。
- 新建饭局页恢复多菜菜单；已有菜选择改为搜索 + 复选卡，临时菜名支持顿号或换行分隔。
- 新建饭局保存后回到饭局详情，先看菜单和下一步，再进入确认/买菜流程。
- 饭局详情首屏新增 `下一步` 操作卡，直接露出 `加菜 / 发给家人 / 生成清单 / 去买菜` 的主动作。
- `常做菜` 顶部推荐卡恢复；下方菜品改为两列小卡，分类筛选继续保留。

复验截图：

- [interaction-correction/01-today-after.png](interaction-correction/01-today-after.png) - 今天页餐别复用与去重
- [interaction-correction/03-dishes-tiles.png](interaction-correction/03-dishes-tiles.png) - 常做菜顶部卡 + 两列小菜卡
- [interaction-correction/04-meal-new-multidish.png](interaction-correction/04-meal-new-multidish.png) - 新建饭局多菜搜索复选
- [interaction-correction/05-meal-detail-flow.png](interaction-correction/05-meal-detail-flow.png) - 饭局详情下一步操作卡 + 多菜菜单

复验命令与行为：

- `npm run check`：通过，0 errors / 0 warnings。
- `npm run build`：通过。
- 390 x 844 下复查 `/app`、`/app/dishes`、`/app/meal-plans/new`、饭局详情；四页 `scrollWidth == clientWidth`，无横向溢出。
- 连续点击 `明天` + `午餐` 两次，均跳转到同一个饭局：`/app/meal-plans/8dec9d89-b814-4efd-90d4-10787e737f57`。
- 浏览器控制台 0 error。

## 2026-06-30 P0 反馈与收尾流程复验

本轮针对最新 P0 反馈继续调整：

- 反馈提交后进入创建者饭局详情，反馈会显示在 `家人反馈` 面板。
- 创建者点击 `确认菜单` 后，反馈不会消失；确认后仍可回到反馈面板查看菜品反馈和备注。
- `确认菜单` 从 `收尾动作/更多状态管理` 中提升为主流程按钮。主线变为 `看反馈 -> 确认菜单 -> 生成清单/去买菜`。
- 饭局详情移除了底部重复推进按钮，避免和底部 App 导航及状态管理区互相抢位置。
- 买菜清单页将 `看这顿饭安排` 放到顶部进度卡里，底部表单只保留 `添加购物项`。
- `常做菜` 下方菜品改为三列瀑布流小卡；顶部推荐卡和分类筛选继续保留。

复验截图：

- [p0-feedback-finish-flow/04-meal-feedback-confirmed-final.png](p0-feedback-finish-flow/04-meal-feedback-confirmed-final.png) - 确认后反馈仍保留
- [p0-feedback-finish-flow/05-shopping-final.png](p0-feedback-finish-flow/05-shopping-final.png) - 买菜清单按钮布局
- [p0-feedback-finish-flow/06-dishes-masonry-final.png](p0-feedback-finish-flow/06-dishes-masonry-final.png) - 常做菜三列瀑布流

复验命令与行为：

- `npm run check`：通过，0 errors / 0 warnings。
- `npm run build`：通过。
- 390 x 844 真实流程：创建饭局 -> 创建分享链接 -> 访客提交菜品反馈 -> 创建者查看反馈 -> 创建者确认菜单 -> 跳到买菜步骤 -> 回看反馈仍可见。
- 390 x 844 下复查饭局详情、买菜清单详情、常做菜；三页 `scrollWidth == clientWidth`，无横向溢出。
- 当前视口可见按钮无重叠；浏览器控制台 0 error。

## 2026-06-30 流程状态与卡片遮挡复验

本轮针对最新截图和流程反馈继续调整：

- `常做菜` 小卡移除前景生成图标，避免菜名被遮住；三列小卡高度收紧，顶部推荐大卡继续保留视觉识别。
- 买菜清单全部勾选后，饭局详情的主流程卡自动进入 `已买齐 / 完成` 状态，不再显示 `去买菜`。
- 饭局详情移除 `更多状态管理`，完成状态由买菜勾选和主流程卡承担。
- 买菜清单详情的 `看这顿饭安排`、`添加购物项` 保持整行按钮；饭局详情内的分享/生成清单/停止分享按钮继续使用窄屏安全宽度。

复验截图：

- [flow-state-layout-fix/10-dishes-after-data.png](flow-state-layout-fix/10-dishes-after-data.png) - 常做菜三列小卡，无前景图标遮挡
- [flow-state-layout-fix/12-shopping-real.png](flow-state-layout-fix/12-shopping-real.png) - 买菜清单按钮布局
- [flow-state-layout-fix/13-shopping-all-done-real.png](flow-state-layout-fix/13-shopping-all-done-real.png) - 清单全部勾选
- [flow-state-layout-fix/14-meal-done-real.png](flow-state-layout-fix/14-meal-done-real.png) - 饭局详情已买齐状态

复验命令与行为：

- `npm run check`：通过，0 errors / 0 warnings。
- 390 x 844 下 `常做菜` 小卡实测 113 x 110 px，`scrollWidth == innerWidth == 390`。
- 买菜清单详情 `看这顿饭安排` 宽 322 px，`添加购物项` 宽 320 px，均位于 390 px 视口内。
- 勾选最后一项购物项后，饭局详情显示 `当前：已买齐`，主动作变为 `看菜单 / 看清单`。
- 饭局详情正文不再出现 `更多状态管理`。
