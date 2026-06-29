import { fail, redirect } from '@sveltejs/kit';
import { getMealFlowState } from '$lib/domain/meal-flow';
import { requireUserSpace } from '$lib/server/context';
import { archiveMealPlan, deleteMealPlan, duplicateMealPlan, listMealPlans } from '$lib/server/meal-plans';
import { listTargets } from '$lib/server/targets';
import type { RequestEvent } from '@sveltejs/kit';
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
	archived: '已收起'
};

const requireContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return requireUserSpace(event);
};

const getFormId = async (request: Request) => {
	const formData = await request.formData();
	const id = formData.get('id');

	if (typeof id !== 'string' || !id) {
		return null;
	}

	return id;
};

export const load: PageServerLoad = async (event) => {
	const context = await requireContext(event);
	const status = event.url.searchParams.get('status') ?? 'all';
	const type = event.url.searchParams.get('type') ?? 'all';
	const targetId = event.url.searchParams.get('targetId');
	const [mealPlans, allMealPlans, targets] = await Promise.all([
		listMealPlans(context, { status, type, targetId }),
		listMealPlans(context),
		listTargets(context)
	]);
	const targetById = new Map(targets.map((target) => [target.id, target]));

	return {
		filters: { status, type, targetId: targetId ?? '' },
		total: allMealPlans.length,
		mealPlans: mealPlans.map((mealPlan) => ({
			...mealPlan,
			typeLabel: typeLabels[mealPlan.type],
			statusLabel: statusLabels[mealPlan.status],
			targetName: mealPlan.targetId ? (targetById.get(mealPlan.targetId)?.name ?? '未知偏好') : '当前家庭',
			flow: getMealFlowState({ status: mealPlan.status, itemCount: mealPlan.items.length })
		})),
		targets,
		typeOptions: [
			{ value: 'all', label: '全部类型' },
			...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))
		],
		statusOptions: [
			{ value: 'all', label: '全部进展' },
			...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
		]
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const context = await requireContext(event);
		const id = await getFormId(event.request);

		if (!id) {
			return fail(400, { message: '缺少饭单 ID' });
		}

		await deleteMealPlan(context, id);

		return redirect(303, '/app/meal-plans');
	},

	duplicate: async (event) => {
		const context = await requireContext(event);
		const id = await getFormId(event.request);

		if (!id) {
			return fail(400, { message: '缺少饭单 ID' });
		}

		const mealPlan = await duplicateMealPlan(context, id);

		return redirect(303, `/app/meal-plans/${mealPlan.id}`);
	},

	archive: async (event) => {
		const context = await requireContext(event);
		const id = await getFormId(event.request);

		if (!id) {
			return fail(400, { message: '缺少饭单 ID' });
		}

		await archiveMealPlan(context, id);

		return redirect(303, '/app/meal-plans');
	}
};
