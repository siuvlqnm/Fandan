import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { getRequestContext } from '$lib/server/context';
import { getInvitationPreview } from '$lib/server/invitations';

export const GET = apiRoute(async (event) => {
	if (!event.params.token) throw apiError('BAD_REQUEST', 'Invitation token is required');
	const preview = await getInvitationPreview(getRequestContext(event), event.params.token, event.locals.user?.id);
	return apiOk(preview);
});
