import { redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { getMealPlan } from '$lib/server/meal-plans';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	const context = await requireUserSpace(event);
	const id = event.params.id;

	if (!id) {
		throw kitError(400, '缺少饭单 ID');
	}

	try {
		return {
			mealPlan: await getMealPlan(context, id)
		};
	} catch (cause) {
		if (cause instanceof ApiError) {
			throw kitError(cause.status, cause.message);
		}

		throw cause;
	}
};
