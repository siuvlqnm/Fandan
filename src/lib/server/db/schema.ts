import { relations, sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`);

export const spaces = sqliteTable('spaces', {
	id: id(),
	name: text('name').notNull(),
	ownerUserId: text('owner_user_id').notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
}, (table) => [index('spaces_owner_idx').on(table.ownerUserId)]);

export const spaceMembers = sqliteTable(
	'space_members',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
		status: text('status', { enum: ['active', 'left', 'removed'] }).notNull().default('active'),
		joinedAt: text('joined_at').notNull().default(sql`CURRENT_TIMESTAMP`),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		uniqueIndex('space_members_space_user_unique').on(table.spaceId, table.userId),
		uniqueIndex('space_members_owner_unique').on(table.spaceId).where(sql`${table.role} = 'owner'`),
		index('space_members_user_status_idx').on(table.userId, table.status),
		index('space_members_space_status_idx').on(table.spaceId, table.status),
		check('space_members_role_check', sql`${table.role} in ('owner', 'member')`),
		check('space_members_status_check', sql`${table.status} in ('active', 'left', 'removed')`)
	]
);

export const spaceInvitations = sqliteTable(
	'space_invitations',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		token: text('token').notNull(),
		role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
		status: text('status', { enum: ['pending', 'accepted', 'revoked'] }).notNull().default('pending'),
		invitedByUserId: text('invited_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		acceptedByUserId: text('accepted_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		expiresAt: text('expires_at').notNull(),
		acceptedAt: text('accepted_at'),
		revokedAt: text('revoked_at'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		uniqueIndex('space_invitations_token_unique').on(table.token),
		index('space_invitations_space_status_idx').on(table.spaceId, table.status),
		index('space_invitations_invited_by_idx').on(table.invitedByUserId),
		index('space_invitations_accepted_by_idx').on(table.acceptedByUserId),
		index('space_invitations_expires_at_idx').on(table.expiresAt),
		check('space_invitations_role_check', sql`${table.role} in ('owner', 'member')`),
		check('space_invitations_status_check', sql`${table.status} in ('pending', 'accepted', 'revoked')`)
	]
);

export const userPreferences = sqliteTable(
	'user_preferences',
	{
		userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
		currentSpaceId: text('current_space_id').references(() => spaces.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('user_preferences_current_space_idx').on(table.currentSpaceId)]
);

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
	(table) => [
		index('meal_targets_space_idx').on(table.spaceId),
		index('meal_targets_space_type_idx').on(table.spaceId, table.type)
	]
);

export const dishes = sqliteTable(
	'dishes',
	{
		id: id(),
		spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		category: text('category'),
		instructions: text('instructions'),
		baseServings: integer('base_servings').notNull().default(1),
		servingBasisConfirmed: integer('serving_basis_confirmed', { mode: 'boolean' }).notNull().default(false),
		tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
		visibility: text('visibility', { enum: ['space', 'private'] }).notNull().default('space'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('dishes_space_idx').on(table.spaceId),
		index('dishes_space_name_idx').on(table.spaceId, table.name),
		index('dishes_space_category_idx').on(table.spaceId, table.category)
	]
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
		index('meal_plans_space_status_idx').on(table.spaceId, table.status),
		index('meal_plans_space_start_date_idx').on(table.spaceId, table.startDate),
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
		index('meal_plan_items_plan_sort_idx').on(table.mealPlanId, table.sortOrder),
		index('meal_plan_items_plan_date_idx').on(table.mealPlanId, table.plannedDate),
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
	(table) => [
		index('shopping_list_items_list_idx').on(table.shoppingListId),
		index('shopping_list_items_list_checked_idx').on(table.shoppingListId, table.checked),
		index('shopping_list_items_source_dish_idx').on(table.sourceDishId)
	]
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
		index('feedback_share_link_reaction_idx').on(table.shareLinkId, table.reaction),
		index('feedback_plan_item_idx').on(table.mealPlanItemId)
	]
);

export const spacesRelations = relations(spaces, ({ many }) => ({
	members: many(spaceMembers),
	invitations: many(spaceInvitations),
	userPreferences: many(userPreferences),
	mealTargets: many(mealTargets),
	dishes: many(dishes),
	mealPlans: many(mealPlans)
}));

export const spaceMembersRelations = relations(spaceMembers, ({ one }) => ({
	space: one(spaces, {
		fields: [spaceMembers.spaceId],
		references: [spaces.id]
	}),
	user: one(user, {
		fields: [spaceMembers.userId],
		references: [user.id]
	})
}));

export const spaceInvitationsRelations = relations(spaceInvitations, ({ one }) => ({
	space: one(spaces, {
		fields: [spaceInvitations.spaceId],
		references: [spaces.id]
	}),
	invitedBy: one(user, {
		fields: [spaceInvitations.invitedByUserId],
		references: [user.id],
		relationName: 'spaceInvitationInvitedBy'
	}),
	acceptedBy: one(user, {
		fields: [spaceInvitations.acceptedByUserId],
		references: [user.id],
		relationName: 'spaceInvitationAcceptedBy'
	})
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
	user: one(user, {
		fields: [userPreferences.userId],
		references: [user.id]
	}),
	currentSpace: one(spaces, {
		fields: [userPreferences.currentSpaceId],
		references: [spaces.id]
	})
}));

export const mealTargetsRelations = relations(mealTargets, ({ one, many }) => ({
	space: one(spaces, {
		fields: [mealTargets.spaceId],
		references: [spaces.id]
	}),
	mealPlans: many(mealPlans)
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
	space: one(spaces, {
		fields: [dishes.spaceId],
		references: [spaces.id]
	}),
	ingredients: many(dishIngredients),
	mealPlanItems: many(mealPlanItems),
	shoppingListItems: many(shoppingListItems)
}));

export const dishIngredientsRelations = relations(dishIngredients, ({ one }) => ({
	dish: one(dishes, {
		fields: [dishIngredients.dishId],
		references: [dishes.id]
	})
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
	space: one(spaces, {
		fields: [mealPlans.spaceId],
		references: [spaces.id]
	}),
	target: one(mealTargets, {
		fields: [mealPlans.targetId],
		references: [mealTargets.id]
	}),
	items: many(mealPlanItems),
	shoppingLists: many(shoppingLists),
	shareLinks: many(shareLinks)
}));

export const mealPlanItemsRelations = relations(mealPlanItems, ({ one, many }) => ({
	mealPlan: one(mealPlans, {
		fields: [mealPlanItems.mealPlanId],
		references: [mealPlans.id]
	}),
	dish: one(dishes, {
		fields: [mealPlanItems.dishId],
		references: [dishes.id]
	}),
	feedback: many(feedback)
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
	mealPlan: one(mealPlans, {
		fields: [shoppingLists.mealPlanId],
		references: [mealPlans.id]
	}),
	items: many(shoppingListItems)
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
	shoppingList: one(shoppingLists, {
		fields: [shoppingListItems.shoppingListId],
		references: [shoppingLists.id]
	}),
	sourceDish: one(dishes, {
		fields: [shoppingListItems.sourceDishId],
		references: [dishes.id]
	})
}));

export const shareLinksRelations = relations(shareLinks, ({ one, many }) => ({
	mealPlan: one(mealPlans, {
		fields: [shareLinks.mealPlanId],
		references: [mealPlans.id]
	}),
	feedback: many(feedback)
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
	shareLink: one(shareLinks, {
		fields: [feedback.shareLinkId],
		references: [shareLinks.id]
	}),
	mealPlanItem: one(mealPlanItems, {
		fields: [feedback.mealPlanItemId],
		references: [mealPlanItems.id]
	})
}));

export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type SpaceMember = typeof spaceMembers.$inferSelect;
export type NewSpaceMember = typeof spaceMembers.$inferInsert;
export type SpaceInvitation = typeof spaceInvitations.$inferSelect;
export type NewSpaceInvitation = typeof spaceInvitations.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
export type MealTarget = typeof mealTargets.$inferSelect;
export type NewMealTarget = typeof mealTargets.$inferInsert;
export type Dish = typeof dishes.$inferSelect;
export type NewDish = typeof dishes.$inferInsert;
export type DishIngredient = typeof dishIngredients.$inferSelect;
export type NewDishIngredient = typeof dishIngredients.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type MealPlanItem = typeof mealPlanItems.$inferSelect;
export type NewMealPlanItem = typeof mealPlanItems.$inferInsert;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type NewShoppingListItem = typeof shoppingListItems.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type NewShareLink = typeof shareLinks.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

export * from './auth.schema';
