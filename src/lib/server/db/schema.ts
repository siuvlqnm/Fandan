import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`);

export const spaces = sqliteTable('spaces', {
	id: id(),
	name: text('name').notNull(),
	ownerUserId: text('owner_user_id').notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const mealTargets = sqliteTable(
	'meal_targets',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		type: text('type', { enum: ['home', 'client', 'gathering', 'other'] }).notNull().default('home'),
		peopleCount: integer('people_count').notNull().default(1),
		tasteNotes: text('taste_notes'),
		dietaryRestrictions: text('dietary_restrictions'),
		budgetNotes: text('budget_notes'),
		contactNotes: text('contact_notes'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('meal_targets_space_idx').on(table.spaceId)]
);

export const dishes = sqliteTable(
	'dishes',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		category: text('category'),
		instructions: text('instructions'),
		tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
		visibility: text('visibility', { enum: ['space', 'private'] }).notNull().default('space'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('dishes_space_idx').on(table.spaceId), index('dishes_name_idx').on(table.name)]
);

export const dishIngredients = sqliteTable(
	'dish_ingredients',
	{
		id: id(),
		dishId: text('dish_id').notNull().references(() => dishes.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		quantity: text('quantity'),
		unit: text('unit'),
		category: text('category'),
		notes: text('notes'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('dish_ingredients_dish_idx').on(table.dishId)]
);

export const mealPlans = sqliteTable(
	'meal_plans',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		targetId: text('target_id').references(() => mealTargets.id, { onDelete: 'set null' }),
		title: text('title').notNull(),
		type: text('type', { enum: ['single_meal', 'day', 'week', 'gathering'] }).notNull().default('single_meal'),
		status: text('status', { enum: ['draft', 'pending_confirmation', 'confirmed', 'completed', 'archived'] })
			.notNull()
			.default('draft'),
		startDate: text('start_date'),
		endDate: text('end_date'),
		notes: text('notes'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('meal_plans_space_idx').on(table.spaceId),
		index('meal_plans_target_idx').on(table.targetId),
		index('meal_plans_status_idx').on(table.status)
	]
);

export const mealPlanItems = sqliteTable(
	'meal_plan_items',
	{
		id: id(),
		mealPlanId: text('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
		dishId: text('dish_id').references(() => dishes.id, { onDelete: 'set null' }),
		mealSlot: text('meal_slot'),
		plannedDate: text('planned_date'),
		servings: integer('servings').notNull().default(1),
		notes: text('notes'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('meal_plan_items_plan_idx').on(table.mealPlanId),
		index('meal_plan_items_dish_idx').on(table.dishId)
	]
);

export const shoppingLists = sqliteTable(
	'shopping_lists',
	{
		id: id(),
		mealPlanId: text('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		status: text('status', { enum: ['draft', 'active', 'completed'] }).notNull().default('draft'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('shopping_lists_plan_idx').on(table.mealPlanId)]
);

export const shoppingListItems = sqliteTable(
	'shopping_list_items',
	{
		id: id(),
		shoppingListId: text('shopping_list_id').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		quantity: text('quantity'),
		unit: text('unit'),
		category: text('category'),
		checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
		sourceDishId: text('source_dish_id').references(() => dishes.id, { onDelete: 'set null' }),
		notes: text('notes'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('shopping_list_items_list_idx').on(table.shoppingListId)]
);

export const shareLinks = sqliteTable(
	'share_links',
	{
		id: id(),
		mealPlanId: text('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		canView: integer('can_view', { mode: 'boolean' }).notNull().default(true),
		canFeedback: integer('can_feedback', { mode: 'boolean' }).notNull().default(true),
		canConfirm: integer('can_confirm', { mode: 'boolean' }).notNull().default(true),
		expiresAt: text('expires_at'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('share_links_plan_idx').on(table.mealPlanId)]
);

export const feedback = sqliteTable(
	'feedback',
	{
		id: id(),
		shareLinkId: text('share_link_id').notNull().references(() => shareLinks.id, { onDelete: 'cascade' }),
		mealPlanItemId: text('meal_plan_item_id').references(() => mealPlanItems.id, { onDelete: 'set null' }),
		guestName: text('guest_name'),
		reaction: text('reaction', { enum: ['like', 'dislike', 'replace', 'note', 'confirm'] }).notNull().default('note'),
		note: text('note'),
		dietaryNote: text('dietary_note'),
		createdAt: createdAt()
	},
	(table) => [
		index('feedback_share_link_idx').on(table.shareLinkId),
		index('feedback_plan_item_idx').on(table.mealPlanItemId)
	]
);

export * from './auth.schema';
