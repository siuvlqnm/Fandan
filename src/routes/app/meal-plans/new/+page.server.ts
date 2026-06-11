import { redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { getDish } from '$lib/server/dishes';
import { getTarget } from '$lib/server/targets';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	const context = await requireUserSpace(event);
	const targetId = event.url.searchParams.get('targetId');
	const dishId = event.url.searchParams.get('dishId');

	if (!targetId && !dishId) {
		return {
			target: null,
			dish: null
		};
	}

	try {
		return {
			target: targetId ? await getTarget(context, targetId) : null,
			dish: dishId ? await getDish(context, dishId) : null
		};
	} catch (cause) {
		if (cause instanceof ApiError) {
			throw kitError(cause.status, cause.message);
		}

		throw cause;
	}
};
