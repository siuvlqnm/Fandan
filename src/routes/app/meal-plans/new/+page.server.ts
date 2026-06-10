import { redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { getTarget } from '$lib/server/targets';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	const context = await requireUserSpace(event);
	const targetId = event.url.searchParams.get('targetId');

	if (!targetId) {
		return {
			target: null
		};
	}

	try {
		return {
			target: await getTarget(context, targetId)
		};
	} catch (cause) {
		if (cause instanceof ApiError) {
			throw kitError(cause.status, cause.message);
		}

		throw cause;
	}
};
