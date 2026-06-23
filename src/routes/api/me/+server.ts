import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';

export const GET = apiRoute(async (event) => {
	const { user, session, space, membership } = await requireUserSpace(event);

	return apiOk({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified
		},
		session: {
			id: session.id,
			expiresAt: session.expiresAt
		},
		space: {
			id: space.id,
			name: space.name,
			role: membership.role
		}
	});
});
