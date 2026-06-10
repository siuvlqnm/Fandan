import { count, eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { getRequestContext } from '$lib/server/context';
import { ensureDefaultSpace } from '$lib/server/workspace';
import { dishes, mealPlans, mealTargets } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;

	if (!locals.user || !locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const { db } = getRequestContext(event);
	const space = await ensureDefaultSpace(db, locals.user);

	const [[targetStats], [dishStats], [mealPlanStats]] = await Promise.all([
		db.select({ value: count() }).from(mealTargets).where(eq(mealTargets.spaceId, space.id)),
		db.select({ value: count() }).from(dishes).where(eq(dishes.spaceId, space.id)),
		db.select({ value: count() }).from(mealPlans).where(eq(mealPlans.spaceId, space.id))
	]);

	return {
		user: {
			name: locals.user.name,
			email: locals.user.email
		},
		space: {
			id: space.id,
			name: space.name
		},
		stats: {
			targets: targetStats?.value ?? 0,
			dishes: dishStats?.value ?? 0,
			mealPlans: mealPlanStats?.value ?? 0
		}
	};
};
