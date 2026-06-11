import { fail, redirect } from '@sveltejs/kit';
import { requireUserSpace } from '$lib/server/context';
import { deleteDish, listDishes } from '$lib/server/dishes';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const requireContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return requireUserSpace(event);
};

export const load: PageServerLoad = async (event) => {
	const context = await requireContext(event);
	const query = (event.url.searchParams.get('q') ?? '').trim();
	const category = event.url.searchParams.get('category') ?? 'all';
	const allDishes = await listDishes(context);
	const searchedDishes = query ? await listDishes(context, { query }) : allDishes;

	const categoryOptions = Array.from(new Set(allDishes.map((dish) => dish.category).filter(Boolean))).sort();
	const dishes = searchedDishes.filter((dish) => category === 'all' || dish.category === category);

	return {
		filters: { q: query, category },
		dishes,
		total: allDishes.length,
		categoryOptions: [
			{ value: 'all', label: '全部分类' },
			...categoryOptions.map((value) => ({ value, label: value }))
		]
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const context = await requireContext(event);
		const formData = await event.request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string' || !id) {
			return fail(400, { message: '缺少菜品 ID' });
		}

		await deleteDish(context, id);

		return redirect(303, '/app/dishes');
	}
};
