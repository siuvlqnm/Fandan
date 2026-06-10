import { and, eq } from 'drizzle-orm';
import { redirect, error as kitError } from '@sveltejs/kit';
import { requireUserSpace } from '$lib/server/context';
import { mealPlans } from '$lib/server/db/schema';
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

	const [mealPlan] = await context.db
		.select()
		.from(mealPlans)
		.where(and(eq(mealPlans.id, id), eq(mealPlans.spaceId, context.space.id)))
		.limit(1);

	if (!mealPlan) {
		throw kitError(404, '饭单不存在');
	}

	return {
		mealPlan
	};
};
