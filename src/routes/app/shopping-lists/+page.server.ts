import { redirect } from '@sveltejs/kit';
import { requireUserSpace } from '$lib/server/context';
import { listShoppingLists } from '$lib/server/shopping-lists';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	if (!locals.user || !locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const context = await requireUserSpace(event);

	return listShoppingLists(context, {
		status: url.searchParams.get('status'),
		date: url.searchParams.get('date'),
		mealPlanId: url.searchParams.get('mealPlanId'),
		q: url.searchParams.get('q')
	});
};
