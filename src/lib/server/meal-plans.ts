import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import {
	dishes,
	mealPlanItems,
	mealPlans,
	mealTargets,
	type MealPlan,
	type MealPlanItem,
	type NewMealPlan,
	type NewMealPlanItem
} from './db/schema';
import type { AuthenticatedContext } from './context';
import { normalizeExpectedUpdatedAt, staleWriteError, versionedNow } from './optimistic-concurrency';
import { loadUserLabels, userLabelFrom, type UserLabel } from './user-labels';

const mealPlanTypeSchema = z.enum(['single_meal', 'day', 'week', 'gathering']);
const mealPlanStatusSchema = z.enum(['draft', 'pending_confirmation', 'confirmed', 'completed', 'archived']);

const nullableTextSchema = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();
const nullableIdSchema = z.string().trim().min(1).nullable().optional();

const itemSchema = z.object({
	dishId: nullableIdSchema,
	mealSlot: nullableTextSchema(40),
	plannedDate: nullableTextSchema(20),
	servings: z.number().int().min(1).max(999).optional().default(1),
	recommendationRating: z.number().int().min(1).max(5).nullable().optional(),
	notes: nullableTextSchema(1000),
	sortOrder: z.number().int().min(0).max(9999).optional()
});

const mealPlanFieldsSchema = z.object({
	expectedUpdatedAt: z.string().trim().min(1).optional(),
	title: z.string().trim().min(1, '请输入饭单标题').max(120),
	targetId: nullableIdSchema,
	type: mealPlanTypeSchema.optional(),
	status: mealPlanStatusSchema.optional(),
	startDate: nullableTextSchema(20),
	endDate: nullableTextSchema(20),
	notes: nullableTextSchema(2000),
	items: z.array(itemSchema).max(300).optional()
});

export const createMealPlanSchema = mealPlanFieldsSchema.extend({
	type: mealPlanTypeSchema.optional().default('single_meal'),
	status: mealPlanStatusSchema.optional().default('draft'),
	items: z.array(itemSchema).max(300).optional().default([])
});

export const updateMealPlanSchema = mealPlanFieldsSchema
	.partial()
	.refine((value) => Object.keys(value).some((key) => key !== 'expectedUpdatedAt'), {
		message: 'At least one field is required'
	});

export const mealPlanFormSchema = z.object({
	title: z.string().trim().min(1, '请输入饭单标题').max(120),
	targetId: nullableIdSchema,
	quickTargetName: z.string().trim().max(80).optional(),
	quickTargetType: z.enum(['home', 'client', 'gathering', 'other']).optional().default('home'),
	type: mealPlanTypeSchema.default('single_meal'),
	startDate: nullableTextSchema(20),
	endDate: nullableTextSchema(20),
	mealSlot: nullableTextSchema(40),
	dishId: nullableIdSchema,
	servings: z.number().int().min(1).max(999).default(1),
	notes: nullableTextSchema(2000)
});

type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;
type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;
type MealPlanItemInput = z.infer<typeof itemSchema>;
export type MealPlanFormInput = z.infer<typeof mealPlanFormSchema>;

type SerializedMealPlanItem = ReturnType<typeof serializeMealPlanItem>;
type SerializedMealPlan = ReturnType<typeof serializeMealPlan>;

const serializeMealPlanItem = (
	item: MealPlanItem,
	actors: { createdBy: UserLabel | null; updatedBy: UserLabel | null } = { createdBy: null, updatedBy: null }
) => ({
	id: item.id,
	mealPlanId: item.mealPlanId,
	dishId: item.dishId,
	mealSlot: item.mealSlot,
	plannedDate: item.plannedDate,
	servings: item.servings,
	recommendationRating: item.recommendationRating,
	notes: item.notes,
	sortOrder: item.sortOrder,
	createdBy: actors.createdBy,
	updatedBy: actors.updatedBy,
	createdAt: item.createdAt,
	updatedAt: item.updatedAt
});

const serializeMealPlan = (
	mealPlan: MealPlan,
	items: SerializedMealPlanItem[] = [],
	actors: { createdBy: UserLabel | null; updatedBy: UserLabel | null } = { createdBy: null, updatedBy: null }
) => ({
	id: mealPlan.id,
	targetId: mealPlan.targetId,
	title: mealPlan.title,
	type: mealPlan.type,
	status: mealPlan.status,
	startDate: mealPlan.startDate,
	endDate: mealPlan.endDate,
	notes: mealPlan.notes,
	items,
	createdBy: actors.createdBy,
	updatedBy: actors.updatedBy,
	createdAt: mealPlan.createdAt,
	updatedAt: mealPlan.updatedAt
});

const itemValues = (mealPlanId: string, items: MealPlanItemInput[], actorUserId: string): NewMealPlanItem[] =>
	items.map((item, index) => ({
		id: crypto.randomUUID(),
		mealPlanId,
		dishId: item.dishId ?? null,
		mealSlot: item.mealSlot ?? null,
		plannedDate: item.plannedDate ?? null,
		servings: item.servings,
		recommendationRating: item.recommendationRating ?? null,
		notes: item.notes ?? null,
		sortOrder: item.sortOrder ?? index,
		createdByUserId: actorUserId,
		updatedByUserId: actorUserId
	}));

const loadItems = async (context: AuthenticatedContext, mealPlanIds: string[]) => {
	if (mealPlanIds.length === 0) {
		return new Map<string, SerializedMealPlanItem[]>();
	}

	const rows = await context.db
		.select()
		.from(mealPlanItems)
		.where(inArray(mealPlanItems.mealPlanId, mealPlanIds))
		.orderBy(asc(mealPlanItems.sortOrder), asc(mealPlanItems.createdAt));

	const userLabels = await loadUserLabels(context, rows.flatMap((item) => [item.createdByUserId, item.updatedByUserId]));

	return rows.reduce((map, item) => {
		const list = map.get(item.mealPlanId) ?? [];
		list.push(
			serializeMealPlanItem(item, {
				createdBy: userLabelFrom(userLabels, item.createdByUserId),
				updatedBy: userLabelFrom(userLabels, item.updatedByUserId)
			})
		);
		map.set(item.mealPlanId, list);
		return map;
	}, new Map<string, SerializedMealPlanItem[]>());
};

const assertEditable = (mealPlan: SerializedMealPlan | MealPlan) => {
	if (mealPlan.status === 'archived') {
		throw apiError('CONFLICT', 'Archived meal plans cannot be edited directly');
	}
};

const assertTargetInSpace = async (context: AuthenticatedContext, targetId: string | null | undefined) => {
	if (!targetId) {
		return;
	}

	const [target] = await context.db
		.select({ id: mealTargets.id })
		.from(mealTargets)
		.where(and(eq(mealTargets.id, targetId), eq(mealTargets.spaceId, context.space.id)))
		.limit(1);

	if (!target) {
		throw apiError('BAD_REQUEST', 'Meal target does not exist in the current space');
	}
};

const assertDishesInSpace = async (context: AuthenticatedContext, items: MealPlanItemInput[] | undefined) => {
	const dishIds = Array.from(new Set((items ?? []).map((item) => item.dishId).filter((id): id is string => Boolean(id))));

	if (dishIds.length === 0) {
		return;
	}

	const rows = await context.db
		.select({ id: dishes.id })
		.from(dishes)
		.where(and(eq(dishes.spaceId, context.space.id), inArray(dishes.id, dishIds)));

	if (rows.length !== dishIds.length) {
		throw apiError('BAD_REQUEST', 'One or more dishes do not exist in the current space');
	}
};

export const listMealPlans = async (
	context: AuthenticatedContext,
	options?: { status?: string | null; type?: string | null; targetId?: string | null }
) => {
	const conditions = [eq(mealPlans.spaceId, context.space.id)];

	if (options?.status && options.status !== 'all') {
		const status = mealPlanStatusSchema.safeParse(options.status);

		if (!status.success) {
			throw apiError('BAD_REQUEST', 'Invalid meal plan status');
		}

		conditions.push(eq(mealPlans.status, status.data));
	}

	if (options?.type && options.type !== 'all') {
		const type = mealPlanTypeSchema.safeParse(options.type);

		if (!type.success) {
			throw apiError('BAD_REQUEST', 'Invalid meal plan type');
		}

		conditions.push(eq(mealPlans.type, type.data));
	}

	if (options?.targetId) {
		await assertTargetInSpace(context, options.targetId);
		conditions.push(eq(mealPlans.targetId, options.targetId));
	}

	const rows = await context.db
		.select()
		.from(mealPlans)
		.where(and(...conditions))
		.orderBy(desc(mealPlans.createdAt));

	const itemsByMealPlan = await loadItems(
		context,
		rows.map((mealPlan) => mealPlan.id)
	);
	const userLabels = await loadUserLabels(context, rows.flatMap((mealPlan) => [mealPlan.createdByUserId, mealPlan.updatedByUserId]));

	return rows.map((mealPlan) =>
		serializeMealPlan(mealPlan, itemsByMealPlan.get(mealPlan.id) ?? [], {
			createdBy: userLabelFrom(userLabels, mealPlan.createdByUserId),
			updatedBy: userLabelFrom(userLabels, mealPlan.updatedByUserId)
		})
	);
};

export const getMealPlan = async (context: AuthenticatedContext, id: string) => {
	const [mealPlan] = await context.db
		.select()
		.from(mealPlans)
		.where(and(eq(mealPlans.id, id), eq(mealPlans.spaceId, context.space.id)))
		.limit(1);

	if (!mealPlan) {
		throw apiError('NOT_FOUND', 'Meal plan not found');
	}

	const itemsByMealPlan = await loadItems(context, [mealPlan.id]);
	const userLabels = await loadUserLabels(context, [mealPlan.createdByUserId, mealPlan.updatedByUserId]);

	return serializeMealPlan(mealPlan, itemsByMealPlan.get(mealPlan.id) ?? [], {
		createdBy: userLabelFrom(userLabels, mealPlan.createdByUserId),
		updatedBy: userLabelFrom(userLabels, mealPlan.updatedByUserId)
	});
};

export const createMealPlan = async (context: AuthenticatedContext, input: CreateMealPlanInput) => {
	await assertTargetInSpace(context, input.targetId);
	await assertDishesInSpace(context, input.items);

	const id = crypto.randomUUID();

	await context.db.insert(mealPlans).values({
		id,
		spaceId: context.space.id,
		targetId: input.targetId ?? null,
		title: input.title,
		type: input.type,
		status: input.status,
		startDate: input.startDate ?? null,
		endDate: input.endDate ?? null,
		notes: input.notes ?? null,
		createdByUserId: context.user.id,
		updatedByUserId: context.user.id
	});

	const items = itemValues(id, input.items, context.user.id);

	if (items.length > 0) {
		await context.db.insert(mealPlanItems).values(items);
	}

	return getMealPlan(context, id);
};

export const updateMealPlan = async (context: AuthenticatedContext, id: string, input: UpdateMealPlanInput) => {
	const current = await getMealPlan(context, id);
	assertEditable(current);

	await assertTargetInSpace(context, input.targetId);
	await assertDishesInSpace(context, input.items);

	const { expectedUpdatedAt, items, ...mealPlanInput } = input;
	const values = Object.fromEntries(
		Object.entries(mealPlanInput).filter(([, value]) => value !== undefined)
	) as Partial<NewMealPlan>;
	const expected = normalizeExpectedUpdatedAt(expectedUpdatedAt);
	const shouldTouchMealPlan = Object.keys(values).length > 0 || items !== undefined;

	if (shouldTouchMealPlan) {
		const rows = await context.db
			.update(mealPlans)
			.set({
				...values,
				updatedByUserId: context.user.id,
				updatedAt: versionedNow
			})
			.where(
				and(
					eq(mealPlans.id, id),
					eq(mealPlans.spaceId, context.space.id),
					...(expected ? [eq(mealPlans.updatedAt, expected)] : [])
				)
			)
			.returning({ id: mealPlans.id });

		if (rows.length === 0) {
			throw staleWriteError();
		}
	}

	if (items !== undefined) {
		await context.db.delete(mealPlanItems).where(eq(mealPlanItems.mealPlanId, id));

		const nextItems = itemValues(id, items, context.user.id);

		if (nextItems.length > 0) {
			await context.db.insert(mealPlanItems).values(nextItems);
		}
	}

	return getMealPlan(context, id);
};

export const updateMealPlanItemRecommendationRating = async (
	context: AuthenticatedContext,
	mealPlanId: string,
	itemId: string,
	recommendationRating: number | null,
	options: { expectedUpdatedAt?: string | null } = {}
) => {
	const current = await getMealPlan(context, mealPlanId);
	assertEditable(current);

	const [item] = await context.db
		.select({ id: mealPlanItems.id })
		.from(mealPlanItems)
		.where(and(eq(mealPlanItems.id, itemId), eq(mealPlanItems.mealPlanId, current.id)))
		.limit(1);

	if (!item) {
		throw apiError('NOT_FOUND', 'Meal plan item not found');
	}

	const expected = normalizeExpectedUpdatedAt(options.expectedUpdatedAt);
	const rows = await context.db
		.update(mealPlans)
		.set({ updatedByUserId: context.user.id, updatedAt: versionedNow })
		.where(
			and(
				eq(mealPlans.id, current.id),
				eq(mealPlans.spaceId, context.space.id),
				...(expected ? [eq(mealPlans.updatedAt, expected)] : [])
			)
		)
		.returning({ id: mealPlans.id });

	if (rows.length === 0) {
		throw staleWriteError();
	}

	await context.db
		.update(mealPlanItems)
		.set({
			recommendationRating,
			updatedByUserId: context.user.id,
			updatedAt: versionedNow
		})
		.where(and(eq(mealPlanItems.id, item.id), eq(mealPlanItems.mealPlanId, current.id)));

	return getMealPlan(context, mealPlanId);
};

export const deleteMealPlan = async (context: AuthenticatedContext, id: string) => {
	await getMealPlan(context, id);

	await context.db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.spaceId, context.space.id)));

	return { deleted: true, id };
};

export const archiveMealPlan = async (
	context: AuthenticatedContext,
	id: string,
	options: { expectedUpdatedAt?: string | null } = {}
) => {
	await getMealPlan(context, id);
	const expected = normalizeExpectedUpdatedAt(options.expectedUpdatedAt);

	const rows = await context.db
		.update(mealPlans)
		.set({
			status: 'archived',
			updatedByUserId: context.user.id,
			updatedAt: versionedNow
		})
		.where(
			and(
				eq(mealPlans.id, id),
				eq(mealPlans.spaceId, context.space.id),
				...(expected ? [eq(mealPlans.updatedAt, expected)] : [])
			)
		)
		.returning({ id: mealPlans.id });

	if (rows.length === 0) {
		throw staleWriteError();
	}

	return getMealPlan(context, id);
};

export const duplicateMealPlan = async (context: AuthenticatedContext, id: string) => {
	const source = await getMealPlan(context, id);
	const nextId = crypto.randomUUID();

	await context.db.insert(mealPlans).values({
		id: nextId,
		spaceId: context.space.id,
		targetId: source.targetId,
		title: `${source.title} 副本`,
		type: source.type,
		status: 'draft',
		startDate: source.startDate,
		endDate: source.endDate,
		notes: source.notes,
		createdByUserId: context.user.id,
		updatedByUserId: context.user.id
	});

	const items = source.items.map((item) => ({
		dishId: item.dishId,
		mealSlot: item.mealSlot,
		plannedDate: item.plannedDate,
		servings: item.servings,
		recommendationRating: item.recommendationRating,
		notes: item.notes,
		sortOrder: item.sortOrder
	}));
	const nextItems = itemValues(nextId, items, context.user.id);

	if (nextItems.length > 0) {
		await context.db.insert(mealPlanItems).values(nextItems);
	}

	return getMealPlan(context, nextId);
};
