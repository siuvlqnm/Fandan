# Development Progress

This file records completed implementation slices so other Codex threads can quickly resume work without reconstructing context from Git history or Linear.

## 2026-06-25 - Date And Meal Slot Quick Start

Status: implemented locally on 2026-06-25.

Why:

- The first action after tapping `安排一顿饭` should match how families think: choose a day, choose breakfast/lunch/dinner/late night, then refine the meal.
- Today's meal-slot choices must respect the current time, so users do not create a breakfast or lunch plan from the evening by mistake.

What changed:

- Add a date selector at the top of `/app/meal-plans/new`: today, tomorrow and custom date.
- Add four meal-slot buttons below it: breakfast, lunch, dinner and late night.
- Disable already-passed slots for today based on Asia/Shanghai time.
- Clicking an available slot creates a pending-confirmation meal plan with deterministic recommended dishes and opens the meal detail.
- Keep the existing AI/manual form below as the editable fallback.

Verification completed:

- `npm run check`
- `npm run build`
- Local Worker preview at `http://localhost:4178`.
- Mobile browser smoke at `390 x 844`: quick-start date selector, disabled slots for today at 21:00 Asia/Shanghai time, tomorrow slots all available, late-night meal creation, meal detail redirect, recommended dishes present and no horizontal overflow.

Follow-up on 2026-06-26:

- Moved the quick-start module from `/app/meal-plans/new` to the top of the dashboard `/app`, because selecting date and meal slot is the home-screen entry decision.
- Kept `/app/meal-plans/new` as the secondary editor flow and moved the freeform `这顿想吃什么？` input into more settings.

## 2026-06-25 - Main Flow Realignment

Status: implemented locally on 2026-06-25.

Why:

- After a full production walkthrough, the core flow worked but still felt awkward because the UI kept switching between household meal language and system-management concepts.
- This round narrows the app around `安排一顿饭 -> 决定吃什么 -> 知道买什么`, while keeping dish library, meal profiles, invitations and workspace controls available as secondary tools.

What changed:

- Keep the fixed mobile navigation to `首页`, `饭单` and `我的`.
- Added a shared meal-flow helper that translates raw meal statuses into household next actions: `继续安排`, `发给家人确认`, `继续确认`, `生成购物清单`, `去买菜` and `查看这顿饭`.
- Made `/app` focus on the next meal and one primary household action instead of stats-heavy workspace management.
- Made `/app/meal-plans` rows lead with the next user action, while copy/archive/delete live under a collapsed management area.
- Made meal detail use the next household action as the primary CTA and moved raw status transitions into `高级状态`.
- Changed creating a share link from confirmed/completed meals to reopen `待确认`, so `发给家人确认` does not require manual status work.
- Kept `菜品库`, `偏好档案`, `邀请家人` and `家庭设置` in `我的`.
- Preserve AI as an embedded draft helper only; do not add a separate AI area.

Verification completed:

- `npm run check`
- `npm run build`
- Local Worker preview at `http://localhost:4178`.
- Mobile browser smoke at `390 x 844` with a fresh local account: new dashboard, manual meal creation, existing-user dashboard, meal list, meal detail confirmation panel and settings hierarchy.
- Confirmed no horizontal overflow on the checked mobile routes.

Known notes:

- `npm run build` succeeds, but Vite reports the local Node.js runtime is `22.9.0`; the configured Vite version prefers `20.19+`, `22.12+` or newer.

## 2026-06-25 - Production Walkthrough Fixes For AI Drafts

Status: implemented locally on 2026-06-25.

What changed:

- Added shared food option constants for dish categories, dish tags, ingredient categories and ingredient units.
- Replaced freeform category/unit/tag controls in dish forms with fixed selections, and reused fixed unit/category selections in shopping-list item add/edit forms.
- Tightened AI dish drafts so generated drafts include category, tags, base servings, instructions and ingredient name/quantity/unit/category rows instead of sparse placeholders.
- Extended AI meal drafts so each suggested new dish carries a full editable dish draft. Confirming the meal now creates those new dishes with ingredients, so the generated shopping list is not empty when AI suggests new dishes.
- Changed the first-meal save path to create new meal plans in `待确认` status, so sharing a freshly created meal can collect guest feedback without an extra manual status switch.
- Documented the 2026-06-25 production walkthrough findings in `docs/audits/2026-06-25-production-walkthrough/AUDIT.md`.

Verification completed:

- `npm run check`
- `npm run build`
- `npm run release:verify`
- Local browser smoke at `390 x 844`: dish create form showed fixed category/tag/unit/category choices, saved a dish with selected options and ingredient data, created a meal from that dish, generated a non-empty shopping list and confirmed the new meal defaulted to `待确认`.

## LES-126 - AI Meal Draft Generation

Status: implemented on 2026-06-25.

What changed:

- Added an optional `一句话生成饭单草稿` helper to `/app/meal-plans/new`.
- Added a provider-isolated Workers AI adapter for structured meal drafts.
- Validated AI output before filling the shared editable meal form.
- Normalized existing dish ids and target ids against the current workspace before using them.
- Marked saved existing dishes separately from AI-suggested new dishes.
- Added per-dish remove and replace actions for suggested dishes without resetting the rest of the draft.
- Kept manual creation, validation, permissions, dish creation, meal creation and shopping-list generation on the same save path.
- Added `AI_MEAL_MODEL` as an optional model override.

Verification completed:

- `npm run check`
- `npm run build`
- `npm run release:verify`
- Local preview with remote Workers AI at `390 x 844`: generated a meal draft from `今晚 3 人，清淡，半小时能做好，两道菜`, verified the editable draft filled two AI suggestions and 3 servings, removed one suggested dish without resetting the draft, then confirmed the meal and landed on the generated shopping list.
- Production sync check on 2026-06-25: `npm run db:migrate:remote` reported no pending D1 migrations, `origin/main` pointed to `16ba17a922a1df6aebeb5ab762ef118e82bf6cdf`, and `https://fandan.siuvlqnm.workers.dev/api/health` returned `queryOk: true`.

Notes for next threads:

- LES-127 is the next task after LES-126 is committed, pushed and closed.
- The local preview D1 must have migration `0003_worried_luminals.sql` applied before testing meal saves that create dishes, because the current save path writes `base_servings` and `serving_basis_confirmed`.

## LES-124 - AI Dish Draft Completion

Status: implemented on 2026-06-25.

What changed:

- Added an optional `一句话补全草稿` section to the existing new-dish page.
- Added a provider-isolated Workers AI adapter that returns structured dish drafts without saving them.
- Validated AI output through a server-side schema before filling the editable dish form.
- Surfaced uncertain fields and notes as review warnings for base servings, category, tags, instructions and ingredient rows.
- Preserved the pure manual create action and made AI unavailable, timeout, provider failure and invalid structure recoverable from the same page.
- Added the Cloudflare `AI` binding to `wrangler.jsonc` with remote local development support.

Verification completed:

- `npm run check`
- `npm run build`
- Pure adapter smoke with a fake provider covering valid output, invalid-output retry and missing-provider fallback.
- Isolated D1 + remote Workers AI HTTP smoke: registration/login, AI draft action, no dish persisted before confirmation, AI-confirmed dish save and manual dish save.

Notes for next threads:

- LES-126 is now unblocked and should reuse the same provider boundary and draft-before-save contract.
- The in-app browser blocked the local `127.0.0.1:4175` verification URL in this run, so visual QA for the AI section should be refreshed if the browser policy allows a local page in the next session.

## LES-125 - Mobile Navigation And First-Screen Density

Status: implemented on 2026-06-25.

What changed:

- Reduced the fixed mobile navigation to three destinations: `首页`, `饭单` and `我的`.
- Moved dishes, meal profiles, invitations and family management into the `我的` secondary layer without removing their routes or capabilities.
- Kept empty lists action-first, used one-line search for small collections, and moved multi-dimensional filters behind a collapsed `details` control once collections exceed five records.
- Separated personal-account, common-feature and current-family groups on `/app/settings`.
- Removed duplicate first-use and empty-state calls to action so each first screen has one clear primary next step.
- Raised visible mobile links, form controls and card actions in the covered routes to a minimum 44px touch height and added a global keyboard focus-visible outline.

Verification completed:

- `npm run check`
- `npm run build`
- In-app mobile browser verification at the product viewport for empty, three-record and seven-record dish states; empty and six-record meal-plan states; settings hierarchy; meal creation; meal detail; and the generated shopping list.
- Verified the three-item navigation, collapsed high-density filters, no horizontal overflow and no visible controls below 44px on the inspected routes.

Notes for next threads:

- LES-124 is the next unblocked Phase 9.5 task.
- Keep new secondary creator tools reachable from `我的`; do not grow the fixed mobile navigation without a new information-architecture decision.

## LES-123 - Arrange A Meal Manual Core Flow

Status: implemented on 2026-06-24.

What changed:

- Replaced the entity-first meal-plan form with a mobile task flow centered on dishes and servings.
- Allowed comma/newline dish entry, multi-select from existing dishes and automatic reusable dish creation without a target prerequisite.
- Defaulted to tonight, two servings and the current family; moved title, date, time, saved meal context and notes under more settings.
- Created a confirmed single meal, generated its deterministic shopping list and redirected directly to that editable list.
- Added first-use completion guidance and follow-ups after the meal and list are saved.
- Reduced the new-user dashboard to one primary `安排一顿饭` action.
- Kept existing dishes, targets, meal plans and detail-management routes compatible.

Verification completed:

- `npm run check`
- `npm run build`
- `npm run release:verify`
- Isolated D1 HTTP smoke for a fresh account entering two dish names, creating reusable dishes with a three-serving basis, saving a confirmed meal and landing on its editable empty shopping list.

Notes for next threads:

- Browser visual QA remains subject to the same local URL policy blocker recorded under LES-122.
- LES-124 and LES-125 are the next tasks unlocked by this core flow; publish still requires production migration `0003` before pushing main.

## LES-122 - Split Authentication And First-Use Entry

Status: implemented on 2026-06-24.

What changed:

- Kept `/login` focused on returning users and added a clear link to the separate `/register` route.
- Added a three-field registration page with validation, pending feedback and duplicate-submit protection.
- Made direct registration continue to `/app/meal-plans/new` instead of the empty dashboard.
- Preserved safe `next` redirects for protected pages and invitation login/registration.
- Split invitation auth choices into explicit login and account-creation actions.
- Hid workspace, target and professional-service concepts from the registration surface.

Verification completed:

- `npm run check`
- `npm run build`
- `npm run release:verify`
- Isolated D1 HTTP smoke for separate login/registration surfaces, validation errors, duplicate registration, first-meal redirect and invitation return.

Notes for next threads:

- LES-123 becomes unblocked when LES-121 and LES-122 are both published.
- The new registration destination intentionally uses the existing meal-plan form; LES-123 owns simplifying that form into the final first-meal flow.
- A final in-app-browser pass was attempted, but the local verification URL was blocked by the browser URL policy; do not treat responsive visual QA for LES-122 as completed.

## LES-121 - Base Servings And Trustworthy Shopping Quantities

Status: implemented on 2026-06-24.

What changed:

- Added dish-level `baseServings` and `servingBasisConfirmed` fields plus migration `0003_worried_luminals.sql`.
- Migrated existing dishes to a safe one-serving basis marked unconfirmed, preserving the previous generator rule until the dish is explicitly reviewed.
- Added base-serving input and migrated-data warnings to dish create/edit pages.
- Replaced blind multiplication with `ingredient quantity × meal servings / dish base servings`.
- Kept text and missing quantities unscaled, separated unit conflicts, and stored calculation/warning evidence on every generated shopping item.
- Kept generated quantities editable and regeneration deterministic.
- Extended the isolated D1 family smoke with migration, equal-basis, scaling, text/missing quantity, unit-conflict and repeat-generation assertions.

Verification completed:

- `npm run check`
- `npm run build`
- `npm run release:verify`
- Mobile browser smoke at `390 x 844` for dish creation/editing and generated shopping-list explanation/edit controls.

Notes for next threads:

- Migration `0003` must be applied to production D1 before code depending on these fields is deployed.
- LES-122 is the next independent task; LES-123 becomes unblocked after both LES-121 and LES-122 are complete.

## 2026-06-24 - Core Experience Audit And AI Queue

Status: documented and queued. No product code was changed in this slice.

What was decided:

- Ordinary families are the primary default experience. The core task is `arrange a meal -> decide dishes -> know what to buy`, not managing spaces, targets and record states.
- The current first-use path, entity-based navigation, long forms, oversized search/filter areas and mixed page responsibilities create too much learning cost.
- A meal's ingredient quantities need a deterministic base-serving model before AI or further collaboration work can rely on the shopping list.
- Manual and AI creation must share the same editable draft and validation path. AI is embedded in specific tasks, never added as a separate product area.
- AI may draft dishes and meal plans, but users confirm before saving; shopping quantities, allergies and permissions remain deterministic or explicitly user-confirmed.

Evidence and handoff:

- `docs/audits/2026-06-24-first-use-flow/AUDIT.md`
- `docs/audits/2026-06-24-first-use-flow/PROBLEMS-AND-AI.md`
- `docs/development/core-experience-ai-handoff.md`
- Linear milestone: `Phase 9.5 首次使用与 AI 基础`
- Parent issue: LES-120, with LES-121 through LES-127 as the executable queue.

Notes for next threads:

- Start directly with LES-121. Do not reopen product discovery unless implementation exposes a new conflict.
- After LES-121, continue with LES-122 and LES-123 before visual-density or AI work.
- LES-106 through LES-109 are blocked by LES-120 so the product does not add more collaboration complexity before the core flow becomes usable.
- Follow the normal issue loop: implement, update docs, run risk-matched verification, commit/push, leave Linear evidence, then move to the next unblocked issue.

## LES-102 - Family Workspace End-To-End And Migration Gate

Status: implemented on 2026-06-24. Phase 9 family workspace foundation is complete.

What changed:

- Added `scripts/verify-family-workspace.mjs`, a repeatable end-to-end smoke using an isolated temporary D1 database.
- Reconstructed a pre-1.1 database with a real credential account plus target, dish, meal plan and shopping-list data, then applied `0002_rainy_mindworm.sql` before login.
- Verified owner membership/current-space backfill and preservation of every seeded business record through authenticated APIs.
- Exercised independent owner/member sessions through invitation preview, acceptance, shared writes and owner-visible shopping-list updates.
- Covered cross-workspace `404`, unauthorized workspace selection `403` and member access to owner-only invitation management `403`.
- Covered repeated acceptance, revoked links, expired links and already-consumed invitations.
- Added the family smoke to `npm run release:verify`, after typecheck and production build.
- Documented the isolation strategy and release-gate contract.

Verification completed:

- `npm run verify:family-workspace`
- `npm run release:verify`
- Mobile browser smoke at `390 x 844` for the owner dashboard, member settings, shared meal-plan detail and shared shopping list.
- The owner saw the member-created dish and plan; the member settings showed both accounts with the correct owner/member roles.
- All inspected mobile routes had `scrollWidth === clientWidth`.
- The automated smoke removed its temporary D1 directory; manual browser accounts and their workspace data were removed afterward.

Notes for next threads:

- Phase 9 is closed. Complete the Phase 9.5 core-experience queue before resuming LES-106 and the rest of Phase 10.
- Run `npm run release:verify` for future releases; it now fails on family-workspace regressions as well as type/build failures.
- The smoke does not touch the ordinary local D1 state or production D1 and requires no new migration.

## LES-103 - Multiple Workspaces And Current Workspace Switching

Status: implemented on 2026-06-24.

What changed:

- Added authenticated workspace list, create and select APIs.
- Added a compact creation entry for single-workspace users and an explicit switcher only when multiple active memberships exist.
- Made a newly created workspace an owner workspace and selected it in the same D1 batch.
- Validated every switch against an active membership before updating `user_preferences.current_space_id`.
- Kept dashboard, targets, dishes, meal plans and shopping lists on the shared `requireUserSpace` boundary, so a selection change refreshes all business data without client-side workspace IDs.
- Reused stale-selection repair after leave or removal, returning the user to another active workspace automatically.
- Documented the product, API, persistence and isolation contract.

Verification completed:

- `npm run check`
- `npm run build`
- Created additional owner workspaces through both the JSON API and the `/app/settings` action; each became current immediately.
- Switched workspaces through the mobile UI and observed explicit success feedback plus refreshed current-space settings.
- Created a target and dish in one workspace; both were present there and absent from the original workspace.
- A fresh login session retained the previously selected workspace.
- An unrelated authenticated user received `403` when attempting to select a guessed workspace ID.
- Removing a member from their selected shared workspace caused their next request to fall back to their personal owner workspace.
- The 390px target route rendered with `scrollWidth === clientWidth` before and after switching.
- Temporary users, workspaces, memberships, targets, dishes, sessions and invitations were removed after verification.

Notes for next threads:

- LES-102 is the final Phase 9 gate: run the complete two-account collaboration flow and prove old-data migration protection.
- Ownership transfer remains intentionally out of scope, so every created workspace keeps its creator as the sole owner.
- LES-103 uses the existing workspace tables and requires no D1 migration.

## LES-101 - Family Workspace Settings And Member Management

Status: implemented on 2026-06-24.

What changed:

- Connected the mobile bottom navigation's `我的` item to the real `/app/settings` route.
- Added a role-aware settings page with current account, workspace, active members and permission guidance.
- Let owners rename the workspace, create/copy/revoke invitations and remove active members.
- Let members inspect the shared workspace and leave it voluntarily without seeing owner-only controls.
- Prevented owners from leaving or being removed until a future ownership-transfer flow exists.
- Cleared stale current-workspace preferences on leave/removal so the existing context repair returns users to another valid workspace.
- Reactivated historical `left` or `removed` membership rows when a user accepts a fresh invitation, preserving the unique user-space pair.
- Added workspace/member APIs and documented the route, permission and lifecycle contract.

Verification completed:

- `npm run check`
- `npm run build`
- Owner mobile flow: rename workspace, create/copy invitation and see member list.
- Member mobile flow: only read allowed settings, see both active members, hide all owner-only controls and leave with confirmation.
- Fresh invitation successfully reactivated the historical member row after voluntary leave.
- Owner API removed the member, cleared their selected workspace and reduced the active member list immediately.
- Removed member's next `/api/me` request repaired to their personal owner workspace.
- Owner leave and owner removal both returned `409` with explicit ownership-transfer guidance.
- Settings page at the 390px target rendered without horizontal overflow.
- Temporary accounts, spaces, memberships, sessions and invitations were removed after verification.

Notes for next threads:

- LES-103 can build workspace creation/switching on the same `user_preferences.current_space_id` repair behavior.
- Ownership transfer is still intentionally out of scope; owner exit remains blocked.
- LES-101 uses the existing membership schema and requires no new D1 migration.

## LES-100 - Family Workspace Invitation And Join Flow

Status: implemented on 2026-06-24.

What changed:

- Added owner-only invitation list, create and revoke APIs plus the mobile `/app/invitations` management page.
- Generated 256-bit random URL-safe invitation tokens with a seven-day default expiry.
- Added a public `/invite/:token` preview that exposes only the workspace name, invitation status and expiry.
- Preserved the invite return path through both login and registration using a validated form field.
- Added atomic invitation acceptance that conditionally creates membership, records the accepting user and switches `user_preferences.current_space_id`.
- Protected against owner self-acceptance, duplicate memberships, expired/revoked links and concurrent acceptance.
- Made repeated acceptance by the same user idempotent and kept accepted, expired and revoked states explicit.
- Added the owner dashboard shortcut and documented the full route/API contract in `docs/development/invitations.md`.

Verification completed:

- `npm run check`
- `npm run build`
- Existing-account flow: anonymous preview, login return, accept and immediate access to the owner's existing target, dish and meal plan.
- New-account flow: registration return, accept and current-workspace switch.
- Owner self-invite protection, repeated accepted-link rendering, member management access returning `403`, revoked-link and expired-link states.
- Public preview contained no private workspace data before acceptance.
- Mobile browser smoke at the 390px target; the joined shared dashboard had no horizontal overflow.
- Temporary users, workspaces, memberships and invitations were removed after the smoke test.

Notes for next threads:

- LES-101 can reuse `listInvitations`, `createInvitation` and `revokeInvitation` inside the family settings/member-management surface.
- Only owners may manage invitations. Ordinary shared business data remains writable by active members.
- LES-100 uses the LES-104 schema as-is, so no new D1 migration is required.

## LES-105 - Membership-Aware Workspace Context

Status: implemented on 2026-06-23.

What changed:

- Switched current-space resolution from `spaces.owner_user_id` to active `space_members` records.
- Validated stored current-space preferences and repaired stale, removed or inaccessible selections to another active membership, preferring an owner workspace.
- Returned the current membership role from `requireUserSpace`, `/api/me` and the app dashboard loader.
- Added reusable active-membership, role and owner authorization helpers for invitation/member-management routes.
- Kept all business-resource lookups scoped to the selected `space_id`; public share-token access remains independent.
- Made default-workspace repair restore the owner's active membership when legacy records are incomplete.

Verification completed:

- `npm run check`
- `npm run build`
- Active member read shared dishes, targets, meal plans and shopping-list data.
- Active member created a dish in the shared workspace and the owner read it.
- A guessed resource ID from another workspace returned `404`.
- Removing the selected membership caused `/api/me` to fall back to the user's remaining owner workspace and repair `user_preferences`.
- Owner and member roles were returned correctly; the existing single-owner `/app` flow remained available.
- Temporary two-account smoke-test records were removed.

Notes for next threads:

- Use `requireSpaceOwner` for invitation creation, member removal and other dangerous settings actions.
- LES-100 can now implement invitation APIs on top of the stable membership-aware context.
- LES-105 adds no schema migration, so no D1 migration action is required for this branch.

## LES-104 - Family Workspace Persistence Model

Status: implemented; production D1 migration applied on 2026-06-23.

What changed:

- Added `space_members` with unique user-space membership, owner/member roles, active/left/removed states and a single-owner partial unique index.
- Added `space_invitations` with unique token, role/status checks, inviter/acceptor audit fields, expiration and outcome timestamps.
- Added `user_preferences.current_space_id` outside Better Auth's generated schema.
- Updated `ensureDefaultSpace` so new accounts create a space, active owner membership and current-space preference in one D1 batch; existing owner spaces repair missing companion rows.
- Added `drizzle/0002_rainy_mindworm.sql`, including backfill from valid `spaces.owner_user_id` rows.
- Updated the local seed and added `docs/development/workspaces.md`.

Verification completed:

- `npm run check`
- `npm run db:migrate:local`
- Existing local data: 2 valid owned spaces produced 2 active owner memberships, 2 current-space preferences and 0 missing owner memberships.
- SQLite constraint smoke rejected duplicate membership, a second owner, invalid member status, duplicate invitation token and invalid invitation status.
- Workspace deletion cascaded members/invitations and cleared `user_preferences.current_space_id`.
- HTTP sign-up smoke returned 302 to `/app` and created matching space, owner membership and preference; temporary records were removed.
- Local seed ran successfully against a database copy and produced matching owner membership and current-space preference.
- Production D1 recorded `0002_rainy_mindworm.sql` as migration id 3; all 16 batch statements succeeded.
- Production backfill verified 3 users, 3 spaces, 3 active owner memberships, 3 valid current-space preferences and 0 spaces missing an owner membership.
- Production `/api/health` returned HTTP 200 with `queryOk: true` and 3 spaces after migration.

Notes for next threads:

- At LES-104 completion `getCurrentSpace` remained owner-based; LES-105 has now replaced that compatibility path with active-membership resolution.
- Do not regenerate or edit Better Auth's `auth.schema.ts` to store current space; use `user_preferences`.
- Production D1 already contains `0002_rainy_mindworm.sql`; do not re-run it manually.

## 2026-06-23 - Version 1.1 Family Workspace Planning

Status: planning completed in Linear and documented locally; implementation started with LES-104 above.

What changed:

- Created the Linear project `饭单 1.1 家庭协作` instead of reopening the completed `饭单 MVP` project.
- Added four milestones: family workspace foundation, collaboration experience, product completion, and templates/customer value.
- Added issues LES-100 through LES-119 with priorities, estimates, acceptance criteria and blocking relations.
- Put family workspace membership, invitations, role-aware access, settings and workspace switching ahead of templates and later product expansion.
- Added `outputs/饭单-1.1家庭协作开发计划.md` as the local execution and handoff source.

Recommended next issue:

- Start with LES-104, then LES-105 and LES-100. Do not begin member-facing pages before the membership migration and permission context are stable.

Planning verification:

- Existing `饭单 MVP` Linear project remains completed with LES-80 through LES-99 done.
- New `饭单 1.1 家庭协作` project is Planned under team `Less`.
- Phase 9 dependencies end at LES-102, the two-account collaboration and migration-protection gate.

## 2026-06-22 - Version 1.0 Flow Closure

Status: implemented.

What changed:

- Added creator-side share-link creation, copy, open and disable controls to meal-plan confirmation.
- Enforced one active share link per meal plan and moved shared drafts to pending confirmation automatically.
- Made visitor confirmation idempotent, stopped feedback after confirmation and replaced the stale submit button with a completed state.
- Exposed item-level feedback under the matching dish with reaction counts and visitor notes.
- Made the meal-plan summary generate a shopping list directly and cleared manual shopping-item forms after success.
- Selected the only existing target by default when creating a meal plan.
- Removed fabricated landing/dashboard dishes, participants, confirmation ratios, pending counts and shopping estimates.
- Set package metadata to `1.0.0` and added `docs/development/release-1.0.md`.

Verification checklist:

- `npm run release:verify`
- Authenticated browser flow from registration through share confirmation and creator feedback review.
- Share-link disable smoke and mobile horizontal-overflow checks.

## 2026-06-14 - Mobile-First Product Redesign

Status: implemented.

What changed:

- Replaced the default black/white shadcn visual baseline with a mobile-first green service-product system.
- Added a fixed mobile bottom navigation for authenticated app routes.
- Reworked the public home page, login page, creator dashboard, meal-plan list, shopping-list page and public share page around the selected `Shared Meal Room` direction.
- Added generated participant avatar imagery and compressed the runtime asset to `128KB`.
- Hid the global logged-in header on share links so visitor confirmation pages feel standalone.
- Added `docs/development/mobile-redesign.md` and `design-qa.md`.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser mobile viewport checks at `390 x 844` for `/`, `/login`, `/app`, `/app/meal-plans`, `/app/shopping-lists/:id` and `/share/:token`.
- Horizontal overflow check across the same core mobile pages.
- Product Design comparison evidence saved at `.codex-screenshots/fandan-dashboard-design-comparison.png`.
- `design-qa.md` final result: `passed`.

Notes for next threads:

- Treat mobile browser as the design source of truth. PC is compatibility only.
- Continue the same visual language into form-heavy pages: meal-plan detail internals, new/edit meal plan, target forms and dish forms.
- Do not reintroduce admin-dashboard card stacks unless a route is explicitly PC-only.

## 2026-06-14 - Meal Plan Detail Split

Status: implemented.

What changed:

- Split `/app/meal-plans/:id` into four mobile sections: menu, confirmation, shopping list and editing.
- Made the detail page open on the meal workspace instead of the large base-information form.
- Kept status updates, feedback aggregation, shopping-list generation, target preferences, existing-dish add, quick dish creation and base-info editing in separate focused panels.
- Added quick actions from the page summary into confirmation and shopping-list work.

Verification checklist:

- `npm run check`
- `npm run build`
- `git diff --check`
- Browser mobile viewport check at `390 x 844` for `/app/meal-plans/design_meal_family`.
- Browser tab-click smoke for menu, confirmation, shopping list and editing sections.

Notes for next threads:

- Continue splitting form-heavy routes in the same pattern: primary task first, advanced edit surfaces behind explicit section controls.
- The detail page is now the shopping-list CTA anchor; keep generated/open list actions easy to reach from the summary and the list section.

## 2026-06-14 - Dish And Target Back Navigation

Status: implemented.

What changed:

- Added `返回工作台` navigation to the dish library and target list pages.
- Added `返回菜品库` and `返回对象列表` navigation to the new dish and new target pages.
- Reworked dish and target list, create and edit surfaces into the same mobile-first `app-page` / `app-panel` pattern as the redesigned meal-plan pages.
- Updated shared dish and target forms with larger mobile input controls and rounded touch-friendly actions.

Verification checklist:

- `npm run check`
- Browser mobile viewport smoke for `/app/dishes`, `/app/dishes/new`, `/app/dishes/:id`, `/app/targets`, `/app/targets/new` and `/app/targets/:id`.

## LES-99 - MVP Deployment Preparation

Status: first production Worker deployment is live through Cloudflare's GitHub integration; production D1 is migrated and reachable.

Commit: see Git history entry `Add deployment runbook`.

What changed:

- Added deployment scripts: `npm run deploy:dry-run`, `npm run deploy` and `npm run db:migrate:remote`.
- Added `CLOUDFLARE_API_TOKEN` to `.env.example` because Wrangler requires it in non-interactive environments.
- Added `docs/development/deployment.md` with production D1 setup, deployment commands, trial data and production smoke checklist.
- Linked the deployment runbook from the README.

Verification checklist:

- `npx wrangler --version` returns `4.99.0`.
- `npm run check`
- `npm run build`
- `npx wrangler deploy --dry-run` succeeds and reports `env.DB (fandan)` bound to D1.
- `npx wrangler whoami` fails with `Failed to fetch auth token: 400 Bad Request` and `Not logged in`.
- Cloudflare API connector confirmed account access and created production D1 database `fandan` with id `a6dfa36e-47ca-4d6a-ae9b-20297ea7c90a`.
- `wrangler.jsonc` now points `DB` at the production D1 database id.
- Cloudflare API connector applied `drizzle/0000_panoramic_carnage.sql` and `drizzle/0001_groovy_wilson_fisk.sql` to the production D1 database.
- Production D1 verification: business tables exist, 30 named indexes exist, `d1_migrations` contains both migration filenames, and `SELECT COUNT(*) FROM user` returns 0 on the fresh database.
- `npx wrangler d1 list` fails because no local `CLOUDFLARE_API_TOKEN` is set.
- 2026-06-14: Cloudflare dashboard was authorized to read the GitHub project and auto-deploy updates.
- 2026-06-14: Production URL is `https://fandan.siuvlqnm.workers.dev/`.
- 2026-06-14: Production smoke check returned `HTTP 200` for `/` and `/api/health` returned `queryOk: true` for D1.

Remaining setup:

- A valid local Wrangler login or `CLOUDFLARE_API_TOKEN` is still required for manual Wrangler deploys, `wrangler tail`, or remote D1 commands from this checkout.
- Confirm production dashboard variables/secrets are set as expected: `BETTER_AUTH_SECRET`, `ORIGIN`, and any account-specific environment values.

Notes for next threads:

- Current migrations were applied through the Cloudflare API connector and recorded in `d1_migrations`; do not re-run them manually.
- Routine production updates are deployed by Cloudflare after it reads updates from GitHub; use Wrangler deploy commands only for manual deploy fallback.
- Do not run `scripts/db/seed.local.sql` against production; create trial data through the production UI after signing in with a test creator account.

## LES-98 - Mobile Polish And Error-State Readiness

Status: implemented.

Commit: see Git history entry `Add mobile form safety`.

What changed:

- Added `src/lib/forms/enhance.ts`, a reusable SvelteKit form enhancement for pending state and destructive-action confirmation.
- Added pending labels and disabled submit states to core create/edit flows for targets, dishes, meal plans, shopping lists and share confirmation.
- Added confirmation prompts for destructive or overwriting actions: delete, archive, remove meal-plan item and regenerate shopping list.
- Kept fast reversible actions, such as shopping-list purchased toggles, responsive with pending state only.
- Added `docs/development/mobile-polish.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- HTTP smoke on `wrangler dev`: `/` and `/login` return 200, protected `/app` and `/app/meal-plans` redirect to login, invalid `/share/:token` renders a public unavailable page.
- Authenticated HTTP smoke on `wrangler dev`: sign up a temporary user, open `/app`, `/app/meal-plans`, `/app/meal-plans/new`, `/app/dishes` and `/app/targets`, create a dish, create a meal plan, generate a shopping list, create a share link and open `/share/:token`.
- Browser mobile viewport smoke at 390px: `/app`, `/app/meal-plans`, `/app/meal-plans/new`, `/app/shopping-lists/:id` and `/share/:token` render without horizontal overflow.
- Browser interaction smoke: create a temporary account and meal plan, generate a shopping list, and verify delete/archive/regenerate controls expose confirmation prompts while submit controls expose pending labels.

Notes for next threads:

- LES-99 can focus on production D1/env/deploy/seed data rather than returning to baseline form safety.
- New SvelteKit form actions should use `enhanceWithFeedback` unless they need a custom modal or optimistic update.

## LES-97 - Dashboard And New User Empty State

Status: implemented.

Commit: see Git history entry `Add dashboard empty states`.

What changed:

- Replaced `/app` placeholder copy with a creator dashboard focused on the next meal-plan action.
- Added a first-screen new-user empty state with primary entry to create the first meal plan.
- Added dashboard stats linking to targets, dishes and meal plans.
- Prioritized pending-confirmation meal plans before today's plans and recent plans.
- Added current-week, recent meal-plan, recent-target and recent-dish sections.
- Added `docs/development/dashboard.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated browser smoke for `/app` as a new user: empty state and primary first-meal-plan action render.
- Authenticated browser smoke for `/app` with temporary target, dish and pending meal plan: pending confirmation is prioritized and recent sections render.
- Mobile viewport check for `/app` with no horizontal overflow and visible core action.

Notes for next threads:

- The dashboard date logic currently compares existing `YYYY-MM-DD` date strings.
- LES-98 can use this page as the mobile polish baseline rather than returning to the old placeholder.

## LES-96 - Meal Plan Feedback Aggregation

Status: implemented.

Commit: see Git history entry `Add meal plan feedback aggregation`.

What changed:

- Added `src/lib/server/feedback.ts` for space-scoped creator-side feedback aggregation.
- Added feedback summary loading to `/app/meal-plans/:id`.
- Added a `访客反馈` section below the dish workspace with totals for likes, dislikes, replacements and confirmations.
- Added per-dish feedback counts and visitor notes without changing existing dish editing controls.
- Added global dietary notes and freeform visitor notes.
- Added a compact sidebar feedback status card.
- Added `docs/development/feedback-aggregation.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Local D1/browser smoke with temporary `smoke_les96_*` records: open the protected meal-plan detail page with feedback rows, verify totals, per-dish counts, global dietary note and confirmation state render.
- Mobile viewport check for `/app/meal-plans/:id` with feedback rows.

Notes for next threads:

- Applying feedback directly to modify the meal plan remains deferred.
- LES-97 can use the confirmation/feedback status to prioritize pending-confirmation meal plans on the dashboard.

## LES-95 - Guest Share Confirmation Page

Status: implemented.

Commit: see Git history entry `Add guest share confirmation page`.

What changed:

- Added public `/share/:token` page with no login requirement.
- Page shows meal-plan title, date range, status, target summary, target preferences and grouped dishes.
- Guests can submit per-dish feedback with `like`, `dislike`, `replace` or note reactions.
- Guests can submit a global dietary note.
- Guests can confirm a meal plan and optionally include a confirmation note.
- Expired, missing or disabled links render a readable unavailable state.
- Added `docs/development/share-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Local D1 HTTP/browser smoke with temporary `smoke_les95_*` records: open `/share/:token` without login, submit feedback, confirm the meal plan, verify success messages and persisted feedback/status.
- Browser desktop and mobile viewport checks for `/share/:token` and an expired token.

Notes for next threads:

- LES-96 can aggregate feedback rows in the creator meal-plan detail page.
- The creator detail page still does not expose a share-link creation panel; future polish can add a small share card that calls the LES-94 endpoint.

## LES-94 - Share Link And Guest Feedback API

Status: implemented.

Commit: see Git history entry `Add share link feedback API`.

What changed:

- Added protected `POST /api/meal-plans/:id/share-links` for creator-side share-link creation.
- Added public `GET /api/share/:token` for visitor-safe meal-plan reads without login.
- Added public `POST /api/share/:token/feedback` for item-level reactions and global dietary notes.
- Added public `POST /api/share/:token/confirm` for guest confirmation and feedback persistence.
- Added `src/lib/server/share-links.ts` with token generation, expiry checks, permission checks and meal-plan item ownership validation.
- Confirmation writes a `confirm` feedback row and moves draft or pending-confirmation meal plans to `confirmed`.
- Added `docs/development/share-links-api.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Local D1 HTTP smoke test with temporary `smoke_les94_*` records: read the public share without login, submit item feedback, confirm the share, and verify persisted feedback rows and confirmed meal-plan status.
- Protected-route smoke test: logged-out `POST /api/meal-plans/:id/share-links` returns the unified 401 envelope.
- Expired-link smoke test: expired `GET /api/share/:token` returns the unified 403 envelope.

Notes for next threads:

- LES-95 can build `/share/:token` as a public page on top of the `/api/share/:token` payload.
- LES-96 can aggregate rows from `feedback` by `share_link_id`, `meal_plan_item_id` and `reaction`.
- Public routes intentionally expose no `space_id`, user or session fields.

## LES-93 - Shopping List Page

Status: implemented.

Commit: see Git history entry `Add shopping list page`.

What changed:

- Added `/app/shopping-lists/:id` creator-side shopping-list workspace.
- Added shopping-list entry actions to `/app/meal-plans/:id` for generating or opening the meal plan's default list.
- Shopping-list page shows the source meal plan, pending/purchased counts and category-grouped items.
- Added large toggle controls for purchased state.
- Added inline editing for item name, quantity, unit, category and notes.
- Added custom item creation and item deletion.
- Added explicit regenerate action that replaces current items from meal-plan ingredients.
- Added empty-list guidance for returning to the meal plan or adding a manual item.
- Added `docs/development/shopping-lists-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test: create dishes with ingredients, create meal plan, generate shopping list from meal-plan detail page action, open shopping-list page, toggle checked state, add custom item, edit item fields, delete item and regenerate.
- Browser mobile viewport check for `/app/shopping-lists/:id` with no horizontal overflow and visible one-handed toggle controls.

Notes for next threads:

- Use `docs/development/shopping-lists-pages.md` for shopping-list page behavior.
- LES-94 starts the share-link and guest feedback API; the shopping-list page does not expose public sharing.
- There is still no standalone `/app/shopping-lists` index; entry is currently through meal-plan detail generation/open actions.

## LES-92 - Shopping List Generation API

Status: implemented.

Commit: see Git history entry `Add shopping list generation API`.

What changed:

- Added `src/lib/server/shopping-lists.ts` for shopping-list generation, serialization, space scoping and item edits.
- Added `POST /api/meal-plans/:id/shopping-list/generate`.
- Added `GET /api/shopping-lists/:id`.
- Added `POST /api/shopping-lists/:id/items`.
- Added `PATCH /api/shopping-lists/:id/items/:itemId`.
- Added `DELETE /api/shopping-lists/:id/items/:itemId`.
- Generation reads meal-plan dishes and dish ingredients, groups ingredients by name and unit, keeps different units separate and defaults missing categories to `其他`.
- Numeric ingredient quantities are multiplied by servings and summed; non-numeric quantities are preserved as text fragments.
- Regeneration reuses the meal plan's default shopping list and replaces items only when the generate endpoint is called.
- Added `docs/development/shopping-lists-api.md` and linked it from the README/server docs.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test: create dishes with ingredients, create meal plan with servings, generate shopping list, verify aggregation/category rules, add custom item, patch checked/quantity, delete item, regenerate and confirm explicit overwrite behavior.
- Logged-out `POST /api/meal-plans/:id/shopping-list/generate` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/shopping-lists-api.md` as the contract for LES-93 page work.
- LES-93 can add `/app/shopping-lists/:id` and a meal-plan detail button that calls generate or opens the existing list.
- The API currently keeps one default shopping list per meal plan by reusing the latest list on regeneration.

## LES-91 - Meal Plan Detail Workspace

Status: implemented.

Commit: see Git history entry `Add meal plan detail workspace`.

What changed:

- Replaced `/app/meal-plans/:id` placeholder with the meal-plan detail workspace.
- Added base information editing for title, target, type, date range and notes.
- Added target preference context with people count, taste notes, dietary restrictions and budget notes.
- Added existing-dish insertion with date, meal slot, servings and item notes.
- Added quick dish creation that immediately adds the new dish to the current meal plan.
- Added grouped item display by planned date and meal slot.
- Added item removal and item up/down ordering actions with automatic persistence.
- Added detail status actions for draft, pending confirmation, confirmed, completed and archived.
- Archived meal plans now render as read-only in the detail workspace.
- Updated `docs/development/meal-plans-pages.md` with the LES-91 detail workspace behavior.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test: create target, create dish, create meal plan, update detail metadata, add existing dish, quick-create-and-add dish, move item, remove item, step status through pending confirmation, confirmed and completed, then archive.
- Browser mobile viewport check for `/app/meal-plans/:id`.

Notes for next threads:

- Detail item actions still use full-list replacement through `updateMealPlan`, which matches the LES-89 API contract.
- Archived meal plans are intentionally immutable; duplicate archived history before editing.
- The next MVP slice can build shopping-list generation from the saved meal-plan items and dish ingredients.

## LES-90 - Meal Plan List And Create Flow

Status: implemented.

Commit: see Git history entry `Add meal plan list and create flow`.

What changed:

- Added `/app/meal-plans` list page with status, type and target filters.
- Added list actions to open, duplicate, archive and delete meal plans.
- Replaced `/app/meal-plans/new` placeholder with a real create flow.
- New meal-plan flow supports selecting an existing target, quickly creating a target, setting title/type/date/meal slot and optionally adding the first dish.
- Existing `targetId` and `dishId` entry links now prefill the create flow.
- Updated `/app/meal-plans/:id` placeholder to read through `getMealPlan` and show type/item count.
- Updated dashboard "新建饭单" entry to `/app/meal-plans/new`.
- Added `docs/development/meal-plans-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/meal-plans`, create first meal plan with quick target, create from existing target/dish context, verify detail placeholder, filter list, duplicate, archive and delete.
- Mobile viewport browser check for `/app/meal-plans` and `/app/meal-plans/new`.

Notes for next threads:

- Use `docs/development/meal-plans-pages.md` for LES-91 handoff.
- Detail editing is intentionally still placeholder-level and belongs to LES-91.
- New flow creates at most one initial dish item; the full item workspace starts in LES-91.

## LES-89 - Meal Plan CRUD API And Status Flow

Status: implemented.

Commit: see Git history entry `Add meal plan CRUD API`.

What changed:

- Added protected `/api/meal-plans` list and create endpoints.
- Added protected `/api/meal-plans/:id` detail, patch and delete endpoints.
- Added protected `/api/meal-plans/:id/duplicate` endpoint that copies a meal plan and items into a new draft.
- Added protected `/api/meal-plans/:id/archive` endpoint that marks a meal plan archived.
- Added `src/lib/server/meal-plans.ts` with Zod validation, serialization, space-scoped Drizzle operations, target/dish reference checks and archived edit protection.
- Meal-plan create supports `single_meal`, `day`, `week` and `gathering`, defaults status to `draft`, and accepts optional items for future detail-page reuse.
- `PATCH /api/meal-plans/:id` rejects archived meal plans with `409 CONFLICT`.
- Added `docs/development/meal-plans-api.md` and linked it from the README/server docs.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates single-meal, day, week and gathering meal plans, creates plan items with dishes, filters list, patches status, duplicates to draft, archives, verifies archived patch conflict, reads detail, and deletes test plans.
- Logged-out `GET /api/meal-plans` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/meal-plans-api.md` as the contract for LES-90 page work.
- Meal-plan item creation/update is currently full-list replacement through the parent payload; LES-91 can add narrower item actions if the detail workspace needs more granular autosave.
- Archived meal plans are immutable through `PATCH`; duplicate archived history before editing.

## LES-88 - Dish List And Edit Pages

Status: implemented.

Commit: see Git history entry `Add dish management pages`.

What changed:

- Added `/app/dishes` list page with search, category filter, dish cards, tags/ingredient summary and delete action.
- Added `/app/dishes/new` create page.
- Added `/app/dishes/:id` edit page with ingredient summary, add-to-meal-plan entry and delete action.
- Added shared `DishForm` component for create/edit forms with comma-separated tags and editable ingredient rows.
- Added page form helpers in `src/lib/server/dishes.ts` so page actions reuse LES-87 validation and serialization boundaries.
- Updated the dashboard dish entry to point to `/app/dishes`.
- Updated `/app/meal-plans/new?dishId=:id` placeholder to preserve selected dish context before LES-90/LES-91 replace the meal-plan flow.
- Added `docs/development/dishes-pages.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/dishes`, create name-only dish, create dish with ingredients/tags, filter/search, edit, open meal-plan placeholder, delete dish.
- Mobile viewport browser check for `/app/dishes` and `/app/dishes/new`.

Notes for next threads:

- Use `docs/development/dishes-pages.md` for page behavior and route boundaries.
- Meal-plan placeholder routes are intentionally minimal and should be replaced by LES-90 and LES-91.
- Dish page actions reuse `src/lib/server/dishes.ts`; keep future page/API behavior aligned there.

## LES-87 - Dish And Ingredient CRUD API

Status: implemented.

Commit: see Git history entry `Add dish ingredient CRUD API`.

What changed:

- Added protected `/api/dishes` list and create endpoints.
- Added protected `/api/dishes/:id` detail, patch and delete endpoints.
- Added `src/lib/server/dishes.ts` with Zod validation, serialization, space-scoped Drizzle operations and ingredient replacement behavior.
- Dish create supports saving with only `name`; `tags`, `ingredients` and `visibility` receive MVP defaults.
- Dish create/update supports multiple ingredients with name, quantity, unit, category, notes and sort order.
- Dish list supports `q` or `search` query against dish name, category, tags and ingredient names.
- Added `docs/development/dishes-api.md` and linked it from the README.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates a name-only dish, creates a dish with multiple ingredients, searches by dish name, ingredient name and tag, patches fields and ingredients, reads detail, and deletes the dish.
- Logged-out `GET /api/dishes` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/dishes-api.md` as the contract for LES-88 page work.
- `PATCH /api/dishes/:id` keeps existing ingredients when `ingredients` is omitted and replaces the full list when `ingredients` is provided.
- Search currently runs in the service layer after loading current-space dishes and ingredients, which is acceptable for the MVP library size but can move into SQL if the dish library grows.

## LES-86 - Meal Target List And Edit Pages

Status: implemented.

Commit: see Git history entry `Add meal target management pages`.

What changed:

- Added `/app/targets` list page with search, type filter, target cards and delete action.
- Added `/app/targets/new` create page.
- Added `/app/targets/:id` edit page with historical meal-plan section and delete action.
- Added shared `TargetForm` component for create/edit forms.
- Added placeholder `/app/meal-plans/new?targetId=:id` and `/app/meal-plans/:id` routes so target card links are not broken before LES-90/LES-91.
- Updated `/app` dashboard target entry to point to `/app/targets`.

Verification checklist:

- `npm run check`
- `npm run build`
- Browser smoke: sign up, open `/app/targets`, create target, filter/search, edit, open meal-plan placeholder, delete target.
- Mobile viewport browser check for `/app/targets` and `/app/targets/new`.

Notes for next threads:

- Use `docs/development/targets-pages.md` for route and UX boundaries.
- Meal-plan placeholder routes are intentionally minimal and should be replaced by LES-90 and LES-91.
- Target page actions reuse `src/lib/server/targets.ts`; keep future page/API behavior aligned there.

## LES-85 - Meal Target CRUD API

Status: implemented.

Commit: see Git history entry `Add meal target CRUD API`.

What changed:

- Added space-scoped target API routes under `/api/targets`.
- Added create, list, detail, patch, delete and target meal-plan list endpoints.
- Added `src/lib/server/targets.ts` for Zod validation, serialization and Drizzle operations.
- `POST /api/targets` supports creating a target with only `name`; `type` defaults to `home` and `peopleCount` defaults to `1`.
- `PATCH /api/targets/:id` only changes explicitly provided fields and does not reset missing fields to defaults.

Verification checklist:

- `npm run check`
- `npm run build`
- Authenticated smoke test creates, lists, reads, updates, lists meal plans for, and deletes a target.
- Logged-out `GET /api/targets` returns the unified 401 envelope.

Notes for next threads:

- Use `docs/development/targets-api.md` as the contract for page work.
- The implemented route prefix is `/api`; Linear's `/targets` notation refers to the product endpoint family.
- All creator-side target queries filter by the current `space.id`.

## LES-84 - Better Auth Login And Default Workspace

Status: implemented.

Commit: see Git history entry `Implement auth workspace flow`.

What changed:

- Added protected creator workspace route `/app`.
- Added `/logout`.
- Login and registration now redirect to `/app` by default and honor a safe `?next=/path` value.
- Successful sign in/sign up creates a default `spaces` row when the user does not have one.
- `requireUserSpace(event)` now guarantees an authenticated user has a current workspace.
- Root layout exposes authenticated navigation and logout.

Verification checklist:

- `npm run check`
- `npm run build`
- Logged-out `/app` returns a redirect to `/login?next=%2Fapp`.
- `/api/health` remains public.
- `/api/me` returns unified 401 while logged out.

Notes for next threads:

- Current auth mode is email + password. Better Auth's `email-otp` and `magic-link` plugins exist in the installed package, but email delivery is not configured yet.
- Creator-side feature work should start from `/app` and use `space.id` for every business query.
- Future `/share/**` pages should remain public and resolve by `share_links.token`.
