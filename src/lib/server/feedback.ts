import { and, asc, eq } from 'drizzle-orm';
import { apiError } from './api/errors';
import { feedback, mealPlans, shareLinks, type Feedback } from './db/schema';
import type { AuthenticatedContext } from './context';

type FeedbackReaction = Feedback['reaction'];

const reactionLabels: Record<FeedbackReaction, string> = {
	like: '喜欢',
	dislike: '不喜欢',
	replace: '想替换',
	note: '备注',
	confirm: '确认'
};

const emptyCounts = () => ({
	like: 0,
	dislike: 0,
	replace: 0,
	note: 0,
	confirm: 0
});

const guestLabel = (guestName: string | null) => guestName || '访客';

const serializeFeedback = (row: Feedback & { shareToken: string }) => ({
	id: row.id,
	shareLinkId: row.shareLinkId,
	shareToken: row.shareToken,
	mealPlanItemId: row.mealPlanItemId,
	guestName: guestLabel(row.guestName),
	reaction: row.reaction,
	reactionLabel: reactionLabels[row.reaction],
	note: row.note,
	dietaryNote: row.dietaryNote,
	createdAt: row.createdAt
});

export const emptyItemFeedback = (mealPlanItemId: string) => ({
	mealPlanItemId,
	counts: emptyCounts(),
	notes: [] as ReturnType<typeof serializeFeedback>[],
	dietaryNotes: [] as ReturnType<typeof serializeFeedback>[]
});

export const getMealPlanFeedbackSummary = async (context: AuthenticatedContext, mealPlanId: string) => {
	const [mealPlan] = await context.db
		.select({ id: mealPlans.id })
		.from(mealPlans)
		.where(and(eq(mealPlans.id, mealPlanId), eq(mealPlans.spaceId, context.space.id)))
		.limit(1);

	if (!mealPlan) {
		throw apiError('NOT_FOUND', 'Meal plan not found');
	}

	const rows = await context.db
		.select({
			id: feedback.id,
			shareLinkId: feedback.shareLinkId,
			shareToken: shareLinks.token,
			mealPlanItemId: feedback.mealPlanItemId,
			guestName: feedback.guestName,
			reaction: feedback.reaction,
			note: feedback.note,
			dietaryNote: feedback.dietaryNote,
			createdAt: feedback.createdAt
		})
		.from(feedback)
		.innerJoin(shareLinks, eq(feedback.shareLinkId, shareLinks.id))
		.innerJoin(mealPlans, eq(shareLinks.mealPlanId, mealPlans.id))
		.where(and(eq(shareLinks.mealPlanId, mealPlan.id), eq(mealPlans.spaceId, context.space.id)))
		.orderBy(asc(feedback.createdAt));

	const byItem = new Map<string, ReturnType<typeof emptyItemFeedback>>();
	const globalNotes: ReturnType<typeof serializeFeedback>[] = [];
	const dietaryNotes: ReturnType<typeof serializeFeedback>[] = [];
	const confirmations: ReturnType<typeof serializeFeedback>[] = [];
	const totals = emptyCounts();

	for (const row of rows) {
		const item = serializeFeedback(row);
		totals[item.reaction] += 1;

		if (item.mealPlanItemId) {
			const itemSummary = byItem.get(item.mealPlanItemId) ?? emptyItemFeedback(item.mealPlanItemId);
			itemSummary.counts[item.reaction] += 1;

			if (item.note) {
				itemSummary.notes.push(item);
			}

			if (item.dietaryNote) {
				itemSummary.dietaryNotes.push(item);
			}

			byItem.set(item.mealPlanItemId, itemSummary);
		} else {
			if (item.reaction === 'confirm') {
				confirmations.push(item);
			}

			if (item.note) {
				globalNotes.push(item);
			}

			if (item.dietaryNote) {
				dietaryNotes.push(item);
			}
		}
	}

	return {
		total: rows.length,
		totals,
		byItem: Object.fromEntries(byItem.entries()),
		globalNotes,
		dietaryNotes,
		confirmations,
		latestConfirmation: confirmations[confirmations.length - 1] ?? null,
		latestFeedback: rows.length > 0 ? serializeFeedback(rows[rows.length - 1]) : null
	};
};
