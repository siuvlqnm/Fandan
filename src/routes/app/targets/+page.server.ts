import { fail, redirect } from '@sveltejs/kit';
import { requireUserSpace } from '$lib/server/context';
import { deleteTarget, listTargetMealPlans, listTargets } from '$lib/server/targets';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const typeLabels: Record<string, string> = {
	home: '家庭',
	client: '特别照顾',
	gathering: '聚餐',
	other: '其他'
};

const requireContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return requireUserSpace(event);
};

export const load: PageServerLoad = async (event) => {
	const context = await requireContext(event);
	const query = (event.url.searchParams.get('q') ?? '').trim();
	const type = event.url.searchParams.get('type') ?? 'all';
	const allTargets = await listTargets(context);
	const normalizedQuery = query.toLowerCase();

	const filteredTargets = allTargets.filter((target) => {
		const matchesType = type === 'all' || target.type === type;
		const searchableText = [
			target.name,
			target.tasteNotes,
			target.dietaryRestrictions,
			target.budgetNotes,
			target.contactNotes
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		return matchesType && (!normalizedQuery || searchableText.includes(normalizedQuery));
	});

	const targets = await Promise.all(
		filteredTargets.map(async (target) => ({
			...target,
			typeLabel: typeLabels[target.type],
			mealPlanCount: (await listTargetMealPlans(context, target.id)).length
		}))
	);

	return {
		filters: { q: query, type },
		targets,
		total: allTargets.length,
		typeOptions: [
			{ value: 'all', label: '全部类型' },
			...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))
		]
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const context = await requireContext(event);
		const formData = await event.request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string' || !id) {
			return fail(400, { message: '缺少偏好 ID' });
		}

		await deleteTarget(context, id);

		return redirect(303, '/app/targets');
	}
};
