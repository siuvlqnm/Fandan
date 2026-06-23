DELETE FROM feedback;
DELETE FROM share_links;
DELETE FROM shopping_list_items;
DELETE FROM shopping_lists;
DELETE FROM meal_plan_items;
DELETE FROM meal_plans;
DELETE FROM dish_ingredients;
DELETE FROM dishes;
DELETE FROM meal_targets;
DELETE FROM space_invitations;
DELETE FROM space_members;
DELETE FROM user_preferences WHERE user_id = 'seed-user';
DELETE FROM spaces;

INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES (
	'seed-user',
	'饭单演示用户',
	'seed-user@fandan.local',
	1,
	cast(unixepoch('subsecond') * 1000 as integer),
	cast(unixepoch('subsecond') * 1000 as integer)
);

INSERT INTO spaces (id, name, owner_user_id, created_at, updated_at)
VALUES
	('space_demo_home', '饭单演示空间', 'seed-user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO space_members (id, space_id, user_id, role, status, joined_at, created_at, updated_at)
VALUES (
	'space_member_demo_owner',
	'space_demo_home',
	'seed-user',
	'owner',
	'active',
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
);

INSERT INTO user_preferences (user_id, current_space_id, created_at, updated_at)
VALUES ('seed-user', 'space_demo_home', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO meal_targets (
	id,
	space_id,
	name,
	type,
	people_count,
	taste_notes,
	dietary_restrictions,
	budget_notes,
	contact_notes,
	created_at,
	updated_at
)
VALUES
	(
		'target_zhang_home',
		'space_demo_home',
		'张女士家',
		'client',
		3,
		'偏清淡，孩子喜欢番茄和鸡蛋',
		'老人少盐，不吃香菜',
		'日常晚餐控制在 120 元以内',
		'每周一、三、五上门做饭',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	),
	(
		'target_weekend_gathering',
		'space_demo_home',
		'周末朋友聚餐',
		'gathering',
		6,
		'需要两道下酒菜和一道汤',
		'一位朋友不吃辣',
		'总预算 350 元左右',
		'周六下午 5 点前确认菜单',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);

INSERT INTO dishes (
	id,
	space_id,
	name,
	category,
	instructions,
	tags,
	visibility,
	created_at,
	updated_at
)
VALUES
	(
		'dish_tomato_egg',
		'space_demo_home',
		'番茄炒蛋',
		'家常菜',
		'先炒鸡蛋盛出，再炒番茄出汁后回锅。',
		'["快手","儿童友好"]',
		'space',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	),
	(
		'dish_steamed_fish',
		'space_demo_home',
		'清蒸鲈鱼',
		'荤菜',
		'鱼身划刀，蒸 8-10 分钟，出锅淋热油和蒸鱼豉油。',
		'["清淡","宴客"]',
		'space',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	),
	(
		'dish_lotus_soup',
		'space_demo_home',
		'莲藕排骨汤',
		'汤',
		'排骨焯水后和莲藕一起小火炖 60 分钟。',
		'["汤","提前准备"]',
		'space',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);

INSERT INTO dish_ingredients (
	id,
	dish_id,
	name,
	quantity,
	unit,
	category,
	notes,
	sort_order,
	created_at,
	updated_at
)
VALUES
	('ingredient_tomato', 'dish_tomato_egg', '番茄', '3', '个', '蔬菜', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('ingredient_egg', 'dish_tomato_egg', '鸡蛋', '4', '个', '蛋奶', NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('ingredient_bass', 'dish_steamed_fish', '鲈鱼', '1', '条', '水产', '约 600g', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('ingredient_ginger', 'dish_steamed_fish', '姜', '1', '块', '调味', NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('ingredient_ribs', 'dish_lotus_soup', '排骨', '500', 'g', '肉类', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('ingredient_lotus', 'dish_lotus_soup', '莲藕', '2', '节', '蔬菜', NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO meal_plans (
	id,
	space_id,
	target_id,
	title,
	type,
	status,
	start_date,
	end_date,
	notes,
	created_at,
	updated_at
)
VALUES
	(
		'meal_plan_demo_dinner',
		'space_demo_home',
		'target_zhang_home',
		'张女士家周三晚餐',
		'single_meal',
		'pending_confirmation',
		'2026-06-10',
		NULL,
		'演示饭单：用于验证本地 D1、API 和页面开发。',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);

INSERT INTO meal_plan_items (
	id,
	meal_plan_id,
	dish_id,
	meal_slot,
	planned_date,
	servings,
	notes,
	sort_order,
	created_at,
	updated_at
)
VALUES
	('meal_item_tomato_egg', 'meal_plan_demo_dinner', 'dish_tomato_egg', '晚餐', '2026-06-10', 3, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('meal_item_steamed_fish', 'meal_plan_demo_dinner', 'dish_steamed_fish', '晚餐', '2026-06-10', 3, '老人少盐', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('meal_item_lotus_soup', 'meal_plan_demo_dinner', 'dish_lotus_soup', '晚餐', '2026-06-10', 3, NULL, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO shopping_lists (id, meal_plan_id, title, status, created_at, updated_at)
VALUES
	('shopping_list_demo_dinner', 'meal_plan_demo_dinner', '张女士家周三晚餐采购清单', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO shopping_list_items (
	id,
	shopping_list_id,
	name,
	quantity,
	unit,
	category,
	checked,
	source_dish_id,
	notes,
	sort_order,
	created_at,
	updated_at
)
VALUES
	('shopping_item_tomato', 'shopping_list_demo_dinner', '番茄', '3', '个', '蔬菜', false, 'dish_tomato_egg', NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('shopping_item_egg', 'shopping_list_demo_dinner', '鸡蛋', '4', '个', '蛋奶', false, 'dish_tomato_egg', NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('shopping_item_bass', 'shopping_list_demo_dinner', '鲈鱼', '1', '条', '水产', false, 'dish_steamed_fish', '约 600g', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('shopping_item_ribs', 'shopping_list_demo_dinner', '排骨', '500', 'g', '肉类', false, 'dish_lotus_soup', NULL, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('shopping_item_lotus', 'shopping_list_demo_dinner', '莲藕', '2', '节', '蔬菜', false, 'dish_lotus_soup', NULL, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO share_links (
	id,
	meal_plan_id,
	token,
	can_view,
	can_feedback,
	can_confirm,
	expires_at,
	created_at,
	updated_at
)
VALUES
	(
		'share_link_demo_dinner',
		'meal_plan_demo_dinner',
		'demo-zhang-dinner',
		true,
		true,
		true,
		'2026-12-31T23:59:59.000Z',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);
