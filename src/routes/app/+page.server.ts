import { fail, redirect } from '@sveltejs/kit';
import { getMealFlowState } from '$lib/domain/meal-flow';
import { addDateKeyDays } from '$lib/domain/meal-quick-start';
import { requireUserSpace } from '$lib/server/context';
import { listDishes } from '$lib/server/dishes';
import { createQuickStartMealPlan, getQuickStartViewData, quickStartMealSchema } from '$lib/server/meal-quick-start';
import { listMealPlans } from '$lib/server/meal-plans';
import { listTargets } from '$lib/server/targets';
import type { Actions, PageServerLoad } from './$types';

const typeLabels: Record<string, string> = {
	single_meal: '单餐',
	day: '一日',
	week: '一周',
	gathering: '聚餐'
};

const statusLabels: Record<string, string> = {
	draft: '草稿',
	pending_confirmation: '待确认',
	confirmed: '已确认',
	completed: '已完成',
	archived: '已归档'
};

const targetTypeLabels: Record<string, string> = {
	home: '家庭',
	client: '客户',
	gathering: '聚餐',
	other: '其他'
};

const startOfShanghaiWeek = (dateKey: string) => {
	const day = new Date(`${dateKey}T00:00:00+08:00`).getUTCDay();
	const daysFromMonday = (day + 6) % 7;
	return addDateKeyDays(dateKey, -daysFromMonday);
};

const dateRangeLabel = (startDate: string | null, endDate: string | null) => {
	if (!startDate && !endDate) {
		return '未设置日期';
	}

	if (!endDate || startDate === endDate) {
		return startDate ?? endDate ?? '未设置日期';
	}

	return `${startDate} - ${endDate}`;
};

const planStart = (mealPlan: { startDate: string | null; endDate: string | null; createdAt: string }) =>
	mealPlan.startDate ?? mealPlan.endDate ?? mealPlan.createdAt;

const overlapsDate = (mealPlan: { startDate: string | null; endDate: string | null }, dateKey: string) => {
	const start = mealPlan.startDate ?? mealPlan.endDate;
	const end = mealPlan.endDate ?? mealPlan.startDate;

	return Boolean(start && end && start <= dateKey && end >= dateKey);
};

const overlapsRange = (
	mealPlan: { startDate: string | null; endDate: string | null },
	startKey: string,
	endKey: string
) => {
	const start = mealPlan.startDate ?? mealPlan.endDate;
	const end = mealPlan.endDate ?? mealPlan.startDate;

	return Boolean(start && end && start <= endKey && end >= startKey);
};

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	if (!locals.user || !locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const context = await requireUserSpace(event);
	const [targets, dishes, mealPlans] = await Promise.all([
		listTargets(context),
		listDishes(context),
		listMealPlans(context)
	]);
	const targetById = new Map(targets.map((target) => [target.id, target]));
	const quickStart = getQuickStartViewData();
	const todayKey = quickStart.today;
	const weekStartKey = startOfShanghaiWeek(todayKey);
	const weekEndKey = addDateKeyDays(weekStartKey, 6);

	const enrichedMealPlans = mealPlans
		.map((mealPlan) => ({
			...mealPlan,
			typeLabel: typeLabels[mealPlan.type],
			statusLabel: statusLabels[mealPlan.status],
			targetName: mealPlan.targetId ? (targetById.get(mealPlan.targetId)?.name ?? '未知对象') : '当前家庭',
			dateRangeLabel: dateRangeLabel(mealPlan.startDate, mealPlan.endDate),
			flow: getMealFlowState({ status: mealPlan.status, itemCount: mealPlan.items.length })
		}))
		.sort((left, right) => planStart(left).localeCompare(planStart(right)));

	const currentMealPlans = enrichedMealPlans.filter((mealPlan) => mealPlan.status !== 'archived');
	const pendingMealPlans = currentMealPlans.filter((mealPlan) => mealPlan.status === 'pending_confirmation').slice(0, 3);
	const todayMealPlans = currentMealPlans.filter((mealPlan) => overlapsDate(mealPlan, todayKey)).slice(0, 3);
	const weekMealPlans = currentMealPlans.filter((mealPlan) => overlapsRange(mealPlan, weekStartKey, weekEndKey)).slice(0, 5);
	const recentMealPlans = [...currentMealPlans]
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, 4);

	return {
		user: {
			name: locals.user.name,
			email: locals.user.email
		},
		space: {
			id: context.space.id,
			name: context.space.name,
			role: context.membership.role
		},
		stats: {
			targets: targets.length,
			dishes: dishes.length,
			mealPlans: mealPlans.length
		},
		isNewUser: targets.length === 0 && dishes.length === 0 && mealPlans.length === 0,
		todayKey,
		quickStart,
		weekRangeLabel: `${weekStartKey} - ${weekEndKey}`,
		pendingMealPlans,
		todayMealPlans,
		weekMealPlans,
		recentMealPlans,
		recentTargets: targets.slice(0, 4).map((target) => ({
			...target,
			typeLabel: targetTypeLabels[target.type]
		})),
		recentDishes: dishes.slice(0, 4)
	};
};

export const actions: Actions = {
	quickStart: async (event) => {
		const context = await requireUserSpace(event);
		const result = quickStartMealSchema.safeParse(Object.fromEntries(await event.request.formData()));

		if (!result.success) {
			return fail(400, { quickStartError: result.error.issues[0]?.message ?? '请选择日期和餐别' });
		}

		let mealPlan: Awaited<ReturnType<typeof createQuickStartMealPlan>>;
		try {
			mealPlan = await createQuickStartMealPlan(context, result.data);
		} catch (error) {
			return fail(400, {
				quickStartError: error instanceof Error ? error.message : '暂时无法创建这顿饭，请换个餐别再试。'
			});
		}

		throw redirect(303, `/app/meal-plans/${mealPlan.id}`);
	}
};
