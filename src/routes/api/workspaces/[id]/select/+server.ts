import { apiRoute } from '$lib/server/api/handler';
import { apiError } from '$lib/server/api/errors';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { switchWorkspace } from '$lib/server/workspace-settings';

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const spaceId = event.params.id;
	if (!spaceId) throw apiError('BAD_REQUEST', 'Workspace id is required');
	const { space, membership } = await switchWorkspace(context, spaceId);
	return apiOk({ workspace: space, membership });
});
