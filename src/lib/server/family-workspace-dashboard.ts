import { and, desc, eq, gt, sql } from 'drizzle-orm';
import type { AuthenticatedContext } from './context';
import { mealPlans, shoppingListItems, shoppingLists, spaceInvitations } from './db/schema';
import { loadUserLabels, userLabelFrom, type UserLabel } from './user-labels';

type DashboardMealPlan = {
	id: string;
	title: string;
	status: string;
	statusLabel: string;
	items: unknown[];
	createdBy: UserLabel | null;
	updatedBy: UserLabel | null;
	createdAt: string;
	updatedAt: string;
};

type DashboardDish = {
	id: string;
	name: string;
	category: string | null;
	ingredients: unknown[];
	createdBy: UserLabel | null;
	updatedBy: UserLabel | null;
	createdAt: string;
	updatedAt: string;
};

type ShoppingSummaryRow = {
	id: string;
	mealPlanId: string;
	title: string;
	status: string;
	mealPlanTitle: string;
	totalCount: number;
	uncheckedCount: number;
	createdAt: string;
	updatedAt: string;
};

type ActivitySeed = {
	id: string;
	type: 'meal_plan' | 'dish' | 'shopping' | 'invitation';
	title: string;
	detail: string;
	actorName: string;
	href: string;
	timestamp: string;
};

type PendingTaskSeed = {
	id: string;
	type: 'confirm' | 'shop' | 'generate' | 'invite';
	title: string;
	detail: string;
	href: string;
	timestamp: string;
	priority: number;
};

const actorName = (actor: UserLabel | null | undefined) => actor?.name ?? '家庭成员';

const isSameTimestamp = (left: string, right: string) => {
	const leftTime = Date.parse(left);
	const rightTime = Date.parse(right);
	return Number.isFinite(leftTime) && Number.isFinite(rightTime) && Math.abs(leftTime - rightTime) < 1000;
};

const timestampValue = (value: string) => {
	const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
	const parsed = Date.parse(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
};

const sortByTimestampDesc = <T extends { timestamp: string }>(items: T[]) =>
	items.sort((left, right) => timestampValue(right.timestamp) - timestampValue(left.timestamp));

const loadShoppingSummaries = async (context: AuthenticatedContext): Promise<ShoppingSummaryRow[]> => {
	const rows = await context.db
		.select({
			id: shoppingLists.id,
			mealPlanId: shoppingLists.mealPlanId,
			title: shoppingLists.title,
			status: shoppingLists.status,
			mealPlanTitle: mealPlans.title,
			totalCount: sql<number>`count(${shoppingListItems.id})`,
			uncheckedCount: sql<number>`sum(case when ${shoppingListItems.checked} = 0 then 1 else 0 end)`,
			createdAt: shoppingLists.createdAt,
			updatedAt: shoppingLists.updatedAt
		})
		.from(shoppingLists)
		.innerJoin(mealPlans, eq(shoppingLists.mealPlanId, mealPlans.id))
		.leftJoin(shoppingListItems, eq(shoppingListItems.shoppingListId, shoppingLists.id))
		.where(eq(mealPlans.spaceId, context.space.id))
		.groupBy(
			shoppingLists.id,
			shoppingLists.mealPlanId,
			shoppingLists.title,
			shoppingLists.status,
			mealPlans.title,
			shoppingLists.createdAt,
			shoppingLists.updatedAt
		)
		.orderBy(desc(shoppingLists.updatedAt))
		.limit(8);

	return rows.map((row) => ({
		...row,
		totalCount: Number(row.totalCount ?? 0),
		uncheckedCount: Number(row.uncheckedCount ?? 0)
	}));
};

const loadShoppingActivities = async (context: AuthenticatedContext): Promise<ActivitySeed[]> => {
	const rows = await context.db
		.select({
			id: shoppingListItems.id,
			shoppingListId: shoppingListItems.shoppingListId,
			name: shoppingListItems.name,
			checked: shoppingListItems.checked,
			checkedByUserId: shoppingListItems.checkedByUserId,
			updatedByUserId: shoppingListItems.updatedByUserId,
			checkedAt: shoppingListItems.checkedAt,
			updatedAt: shoppingListItems.updatedAt,
			mealPlanTitle: mealPlans.title
		})
		.from(shoppingListItems)
		.innerJoin(shoppingLists, eq(shoppingListItems.shoppingListId, shoppingLists.id))
		.innerJoin(mealPlans, eq(shoppingLists.mealPlanId, mealPlans.id))
		.where(eq(mealPlans.spaceId, context.space.id))
		.orderBy(desc(shoppingListItems.updatedAt))
		.limit(8);
	const userLabels = await loadUserLabels(context, rows.flatMap((row) => [row.checkedByUserId, row.updatedByUserId]));

	return rows.map((row) => {
		const actor = row.checked
			? userLabelFrom(userLabels, row.checkedByUserId) ?? userLabelFrom(userLabels, row.updatedByUserId)
			: userLabelFrom(userLabels, row.updatedByUserId);
		return {
			id: `shopping-${row.id}`,
			type: 'shopping' as const,
			title: row.checked ? '标记已买' : '更新采购项',
			detail: `${row.name} · ${row.mealPlanTitle}`,
			actorName: actorName(actor),
			href: `/app/shopping-lists/${row.shoppingListId}`,
			timestamp: row.checkedAt ?? row.updatedAt
		};
	});
};

const loadInvitationActivities = async (context: AuthenticatedContext): Promise<ActivitySeed[]> => {
	const rows = await context.db
		.select({
			id: spaceInvitations.id,
			status: spaceInvitations.status,
			invitedByUserId: spaceInvitations.invitedByUserId,
			acceptedByUserId: spaceInvitations.acceptedByUserId,
			acceptedAt: spaceInvitations.acceptedAt,
			createdAt: spaceInvitations.createdAt,
			updatedAt: spaceInvitations.updatedAt
		})
		.from(spaceInvitations)
		.where(eq(spaceInvitations.spaceId, context.space.id))
		.orderBy(desc(spaceInvitations.updatedAt))
		.limit(5);
	const userLabels = await loadUserLabels(context, rows.flatMap((row) => [row.invitedByUserId, row.acceptedByUserId]));

	return rows.map((row) => {
		const accepted = row.status === 'accepted' && row.acceptedAt;
		const actor = accepted
			? userLabelFrom(userLabels, row.acceptedByUserId)
			: userLabelFrom(userLabels, row.invitedByUserId);
		return {
			id: `invitation-${row.id}`,
			type: 'invitation' as const,
			title: accepted ? '家人加入工作区' : '创建邀请链接',
			detail: accepted ? '家庭成员已可以一起安排饭单' : '等待家人通过链接加入',
			actorName: actorName(actor),
			href: '/app/invitations',
			timestamp: row.acceptedAt ?? row.updatedAt ?? row.createdAt
		};
	});
};

const loadPendingInvitationCount = async (context: AuthenticatedContext) => {
	if (context.membership.role !== 'owner') {
		return 0;
	}

	const rows = await context.db
		.select({ id: spaceInvitations.id })
		.from(spaceInvitations)
		.where(
			and(
				eq(spaceInvitations.spaceId, context.space.id),
				eq(spaceInvitations.status, 'pending'),
				gt(spaceInvitations.expiresAt, new Date().toISOString())
			)
		)
		.limit(20);

	return rows.length;
};

export const getFamilyWorkspaceDashboard = async (
	context: AuthenticatedContext,
	input: { mealPlans: DashboardMealPlan[]; dishes: DashboardDish[] }
) => {
	const [shoppingSummaries, shoppingActivities, invitationActivities, pendingInvitationCount] = await Promise.all([
		loadShoppingSummaries(context),
		loadShoppingActivities(context),
		loadInvitationActivities(context),
		loadPendingInvitationCount(context)
	]);
	const shoppingByMealPlanId = new Map(shoppingSummaries.map((shoppingList) => [shoppingList.mealPlanId, shoppingList]));
	const currentMealPlans = input.mealPlans.filter((mealPlan) => mealPlan.status !== 'archived');

	const mealPlanActivities = currentMealPlans.slice(0, 8).map((mealPlan) => {
		const created = isSameTimestamp(mealPlan.createdAt, mealPlan.updatedAt);
		const actor = created ? mealPlan.createdBy : (mealPlan.updatedBy ?? mealPlan.createdBy);
		return {
			id: `meal-plan-${mealPlan.id}`,
			type: 'meal_plan' as const,
			title: created ? '创建饭单' : '更新饭单',
			detail: `${mealPlan.title} · ${mealPlan.statusLabel} · ${mealPlan.items.length} 道菜`,
			actorName: actorName(actor),
			href: `/app/meal-plans/${mealPlan.id}`,
			timestamp: mealPlan.updatedAt
		};
	});

	const dishActivities = input.dishes.slice(0, 8).map((dish) => {
		const created = isSameTimestamp(dish.createdAt, dish.updatedAt);
		const actor = created ? dish.createdBy : (dish.updatedBy ?? dish.createdBy);
		return {
			id: `dish-${dish.id}`,
			type: 'dish' as const,
			title: created ? '新增菜品' : '更新菜品',
			detail: `${dish.name} · ${dish.category ?? '未分类'} · ${dish.ingredients.length} 个食材`,
			actorName: actorName(actor),
			href: `/app/dishes/${dish.id}`,
			timestamp: dish.updatedAt
		};
	});

	const activityItems = sortByTimestampDesc([
		...mealPlanActivities,
		...dishActivities,
		...shoppingActivities,
		...invitationActivities
	]).slice(0, 4);

	const pendingTasks: PendingTaskSeed[] = [];

	for (const mealPlan of currentMealPlans.filter((plan) => plan.status === 'pending_confirmation').slice(0, 5)) {
		pendingTasks.push({
			id: `confirm-${mealPlan.id}`,
			type: 'confirm',
			title: '确认饭单',
			detail: `${mealPlan.title} · ${mealPlan.items.length} 道菜`,
			href: `/app/meal-plans/${mealPlan.id}?panel=confirm`,
			timestamp: mealPlan.updatedAt,
			priority: 10
		});
	}

	for (const shoppingList of shoppingSummaries.filter((item) => item.status !== 'completed' && item.uncheckedCount > 0).slice(0, 5)) {
		pendingTasks.push({
			id: `shop-${shoppingList.id}`,
			type: 'shop',
			title: '继续采购',
			detail: `${shoppingList.mealPlanTitle} · ${shoppingList.uncheckedCount}/${shoppingList.totalCount} 项待买`,
			href: `/app/shopping-lists/${shoppingList.id}?filter=unchecked`,
			timestamp: shoppingList.updatedAt,
			priority: 8
		});
	}

	for (const mealPlan of currentMealPlans.filter((plan) => plan.status === 'confirmed' && !shoppingByMealPlanId.has(plan.id)).slice(0, 5)) {
		pendingTasks.push({
			id: `generate-${mealPlan.id}`,
			type: 'generate',
			title: '生成采购清单',
			detail: `${mealPlan.title} · 已确认，下一步买菜`,
			href: `/app/meal-plans/${mealPlan.id}?panel=shopping`,
			timestamp: mealPlan.updatedAt,
			priority: 6
		});
	}

	if (pendingInvitationCount > 0) {
		pendingTasks.push({
			id: 'invite-pending',
			type: 'invite',
			title: '邀请待处理',
			detail: `${pendingInvitationCount} 条邀请仍在等待加入`,
			href: '/app/invitations',
			timestamp: new Date().toISOString(),
			priority: 4
		});
	}

	return {
		activityItems,
		pendingTasks: pendingTasks
			.sort((left, right) => right.priority - left.priority || timestampValue(right.timestamp) - timestampValue(left.timestamp))
			.slice(0, 3)
			.map(({ priority, ...task }) => task)
	};
};
