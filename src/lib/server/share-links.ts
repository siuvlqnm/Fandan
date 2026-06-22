import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import {
	dishes,
	feedback,
	mealPlanItems,
	mealPlans,
	mealTargets,
	shareLinks,
	type Feedback,
	type NewFeedback,
	type NewShareLink,
	type ShareLink
} from './db/schema';
import { getMealPlan } from './meal-plans';
import type { AuthenticatedContext, RequestContext } from './context';

const feedbackReactionSchema = z.enum(['like', 'dislike', 'replace', 'note']);
const nullableTextSchema = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();
const nullableIdSchema = z.string().trim().min(1).nullable().optional();

const expiresAtSchema = z
	.string()
	.trim()
	.refine((value) => !Number.isNaN(Date.parse(value)), 'expiresAt must be a valid date time')
	.transform((value) => new Date(value).toISOString())
	.nullable()
	.optional();

const feedbackItemSchema = z.object({
	mealPlanItemId: z.string().trim().min(1),
	reaction: feedbackReactionSchema,
	note: nullableTextSchema(1000)
});

export const createShareLinkSchema = z.object({
	canView: z.boolean().optional().default(true),
	canFeedback: z.boolean().optional().default(true),
	canConfirm: z.boolean().optional().default(true),
	expiresAt: expiresAtSchema
});

export const createShareFeedbackSchema = z
	.object({
		guestName: nullableTextSchema(80),
		mealPlanItemId: nullableIdSchema,
		reaction: feedbackReactionSchema.optional().default('note'),
		note: nullableTextSchema(1000),
		dietaryNote: nullableTextSchema(1000),
		items: z.array(feedbackItemSchema).max(100).optional()
	})
	.refine(
		(value) =>
			(value.items?.length ?? 0) > 0 ||
			Boolean(value.mealPlanItemId) ||
			Boolean(value.note) ||
			Boolean(value.dietaryNote),
		{ message: 'At least one feedback entry is required' }
	);

export const confirmShareSchema = z.object({
	guestName: nullableTextSchema(80),
	note: nullableTextSchema(1000),
	dietaryNote: nullableTextSchema(1000)
});

type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
type CreateShareFeedbackInput = z.infer<typeof createShareFeedbackSchema>;
type ConfirmShareInput = z.infer<typeof confirmShareSchema>;

const serializeShareLink = (shareLink: ShareLink) => ({
	id: shareLink.id,
	mealPlanId: shareLink.mealPlanId,
	token: shareLink.token,
	path: `/share/${shareLink.token}`,
	apiPath: `/api/share/${shareLink.token}`,
	canView: shareLink.canView,
	canFeedback: shareLink.canFeedback,
	canConfirm: shareLink.canConfirm,
	expiresAt: shareLink.expiresAt,
	active: shareLink.canView && !isExpired(shareLink.expiresAt),
	createdAt: shareLink.createdAt,
	updatedAt: shareLink.updatedAt
});

const serializeFeedback = (row: Feedback) => ({
	id: row.id,
	shareLinkId: row.shareLinkId,
	mealPlanItemId: row.mealPlanItemId,
	guestName: row.guestName,
	reaction: row.reaction,
	note: row.note,
	dietaryNote: row.dietaryNote,
	createdAt: row.createdAt
});

const generateToken = () => {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const isExpired = (expiresAt: string | null) => Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());

const getToken = (token: string) => {
	const normalized = token.trim();

	if (!normalized) {
		throw apiError('BAD_REQUEST', 'Share token is required');
	}

	return normalized;
};

const loadShareLinkBundle = async (context: RequestContext, token: string) => {
	const [row] = await context.db
		.select({
			shareLink: shareLinks,
			mealPlan: mealPlans,
			targetId: mealTargets.id,
			targetName: mealTargets.name,
			targetType: mealTargets.type,
			targetPeopleCount: mealTargets.peopleCount,
			targetTasteNotes: mealTargets.tasteNotes,
			targetDietaryRestrictions: mealTargets.dietaryRestrictions,
			targetBudgetNotes: mealTargets.budgetNotes
		})
		.from(shareLinks)
		.innerJoin(mealPlans, eq(shareLinks.mealPlanId, mealPlans.id))
		.leftJoin(mealTargets, eq(mealPlans.targetId, mealTargets.id))
		.where(eq(shareLinks.token, getToken(token)))
		.limit(1);

	if (!row) {
		throw apiError('NOT_FOUND', 'Share link not found');
	}

	if (isExpired(row.shareLink.expiresAt)) {
		throw apiError('FORBIDDEN', 'Share link has expired');
	}

	return row;
};

const assertPermission = (allowed: boolean, message: string) => {
	if (!allowed) {
		throw apiError('FORBIDDEN', message);
	}
};

const loadPublicItems = async (context: RequestContext, mealPlanId: string) =>
	context.db
		.select({
			id: mealPlanItems.id,
			dishId: mealPlanItems.dishId,
			dishName: dishes.name,
			dishCategory: dishes.category,
			mealSlot: mealPlanItems.mealSlot,
			plannedDate: mealPlanItems.plannedDate,
			servings: mealPlanItems.servings,
			notes: mealPlanItems.notes,
			sortOrder: mealPlanItems.sortOrder
		})
		.from(mealPlanItems)
		.leftJoin(dishes, eq(mealPlanItems.dishId, dishes.id))
		.where(eq(mealPlanItems.mealPlanId, mealPlanId))
		.orderBy(asc(mealPlanItems.sortOrder), asc(mealPlanItems.createdAt));

const assertMealPlanItemIds = async (context: RequestContext, mealPlanId: string, itemIds: string[]) => {
	const uniqueIds = Array.from(new Set(itemIds));

	if (uniqueIds.length === 0) {
		return;
	}

	const rows = await context.db
		.select({ id: mealPlanItems.id })
		.from(mealPlanItems)
		.where(and(eq(mealPlanItems.mealPlanId, mealPlanId), inArray(mealPlanItems.id, uniqueIds)));

	if (rows.length !== uniqueIds.length) {
		throw apiError('BAD_REQUEST', 'One or more meal plan items do not belong to this share link');
	}
};

const insertFeedbackRows = async (context: RequestContext, rows: NewFeedback[]) => {
	if (rows.length === 0) {
		return [];
	}

	await context.db.insert(feedback).values(rows);

	const ids = rows.map((row) => row.id).filter((id): id is string => Boolean(id));

	return context.db.select().from(feedback).where(inArray(feedback.id, ids)).orderBy(asc(feedback.createdAt));
};

export const createMealPlanShareLink = async (
	context: AuthenticatedContext,
	mealPlanId: string,
	input: CreateShareLinkInput
) => {
	const mealPlan = await getMealPlan(context, mealPlanId);

	if (mealPlan.status === 'archived') {
		throw apiError('CONFLICT', 'Archived meal plans cannot be shared');
	}
	let token = generateToken();

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const [existing] = await context.db.select({ id: shareLinks.id }).from(shareLinks).where(eq(shareLinks.token, token)).limit(1);

		if (!existing) {
			break;
		}

		token = generateToken();
	}

	const id = crypto.randomUUID();
	const values = {
		id,
		mealPlanId: mealPlan.id,
		token,
		canView: input.canView,
		canFeedback: input.canFeedback,
		canConfirm: input.canConfirm,
		expiresAt: input.expiresAt ?? null
	} satisfies NewShareLink;

	await context.db
		.update(shareLinks)
		.set({
			canView: false,
			canFeedback: false,
			canConfirm: false,
			updatedAt: sql`CURRENT_TIMESTAMP`
		})
		.where(and(eq(shareLinks.mealPlanId, mealPlan.id), eq(shareLinks.canView, true)));
	await context.db.insert(shareLinks).values(values);
	await context.db
		.update(mealPlans)
		.set({ status: 'pending_confirmation', updatedAt: sql`CURRENT_TIMESTAMP` })
		.where(and(eq(mealPlans.id, mealPlan.id), eq(mealPlans.status, 'draft')));

	const [shareLink] = await context.db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);

	return serializeShareLink(shareLink);
};

export const listMealPlanShareLinks = async (context: AuthenticatedContext, mealPlanId: string) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	const rows = await context.db
		.select()
		.from(shareLinks)
		.where(eq(shareLinks.mealPlanId, mealPlan.id))
		.orderBy(desc(shareLinks.createdAt));

	return rows.map(serializeShareLink);
};

export const revokeMealPlanShareLink = async (
	context: AuthenticatedContext,
	mealPlanId: string,
	shareLinkId: string
) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	const [shareLink] = await context.db
		.select()
		.from(shareLinks)
		.where(and(eq(shareLinks.id, shareLinkId), eq(shareLinks.mealPlanId, mealPlan.id)))
		.limit(1);

	if (!shareLink) {
		throw apiError('NOT_FOUND', 'Share link not found');
	}

	await context.db
		.update(shareLinks)
		.set({
			canView: false,
			canFeedback: false,
			canConfirm: false,
			updatedAt: sql`CURRENT_TIMESTAMP`
		})
		.where(eq(shareLinks.mealPlanId, mealPlan.id));

	const [updated] = await context.db.select().from(shareLinks).where(eq(shareLinks.id, shareLink.id)).limit(1);
	return serializeShareLink(updated);
};

export const getPublicShare = async (context: RequestContext, token: string) => {
	const row = await loadShareLinkBundle(context, token);
	assertPermission(row.shareLink.canView, 'Share link does not allow viewing');

	const items = await loadPublicItems(context, row.mealPlan.id);

	return {
		shareLink: serializeShareLink(row.shareLink),
		mealPlan: {
			id: row.mealPlan.id,
			title: row.mealPlan.title,
			type: row.mealPlan.type,
			status: row.mealPlan.status,
			startDate: row.mealPlan.startDate,
			endDate: row.mealPlan.endDate,
			notes: row.mealPlan.notes,
			target: row.targetId
				? {
						id: row.targetId,
						name: row.targetName,
						type: row.targetType,
						peopleCount: row.targetPeopleCount,
						tasteNotes: row.targetTasteNotes,
						dietaryRestrictions: row.targetDietaryRestrictions,
						budgetNotes: row.targetBudgetNotes
					}
				: null,
			items
		}
	};
};

export const createShareFeedback = async (context: RequestContext, token: string, input: CreateShareFeedbackInput) => {
	const row = await loadShareLinkBundle(context, token);
	assertPermission(row.shareLink.canFeedback, 'Share link does not allow feedback');

	if (row.mealPlan.status === 'confirmed' || row.mealPlan.status === 'completed' || row.mealPlan.status === 'archived') {
		throw apiError('CONFLICT', 'This meal plan is no longer accepting feedback');
	}

	const itemFeedback = input.items ?? [];
	const referencedItemIds = [
		...itemFeedback.map((item) => item.mealPlanItemId),
		...(input.mealPlanItemId ? [input.mealPlanItemId] : [])
	];
	await assertMealPlanItemIds(context, row.mealPlan.id, referencedItemIds);

	const rows: NewFeedback[] = itemFeedback.map((item) => ({
		id: crypto.randomUUID(),
		shareLinkId: row.shareLink.id,
		mealPlanItemId: item.mealPlanItemId,
		guestName: input.guestName ?? null,
		reaction: item.reaction,
		note: item.note ?? null,
		dietaryNote: null
	}));

	if (input.mealPlanItemId || input.note || input.dietaryNote) {
		rows.push({
			id: crypto.randomUUID(),
			shareLinkId: row.shareLink.id,
			mealPlanItemId: input.mealPlanItemId ?? null,
			guestName: input.guestName ?? null,
			reaction: input.reaction,
			note: input.note ?? null,
			dietaryNote: input.dietaryNote ?? null
		});
	}

	const created = await insertFeedbackRows(context, rows);

	return created.map(serializeFeedback);
};

export const confirmShare = async (context: RequestContext, token: string, input: ConfirmShareInput) => {
	const row = await loadShareLinkBundle(context, token);
	assertPermission(row.shareLink.canConfirm, 'Share link does not allow confirmation');

	if (row.mealPlan.status === 'confirmed' || row.mealPlan.status === 'completed') {
		return { confirmed: true, feedback: [] };
	}

	if (row.mealPlan.status === 'archived') {
		throw apiError('CONFLICT', 'Archived meal plans cannot be confirmed');
	}

	const created = await insertFeedbackRows(context, [
		{
			id: crypto.randomUUID(),
			shareLinkId: row.shareLink.id,
			mealPlanItemId: null,
			guestName: input.guestName ?? null,
			reaction: 'confirm',
			note: input.note ?? null,
			dietaryNote: input.dietaryNote ?? null
		}
	]);

	await context.db
		.update(mealPlans)
		.set({
			status: 'confirmed',
			updatedAt: sql`CURRENT_TIMESTAMP`
		})
		.where(and(eq(mealPlans.id, row.mealPlan.id), inArray(mealPlans.status, ['draft', 'pending_confirmation', 'confirmed'])));

	return {
		confirmed: true,
		feedback: created.map(serializeFeedback)
	};
};
