import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { leaveWorkspace } from '$lib/server/workspace-settings';

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const membership = await leaveWorkspace(context);
	return apiOk({ membership });
});
