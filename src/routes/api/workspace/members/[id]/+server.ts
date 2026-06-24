import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { removeWorkspaceMember } from '$lib/server/workspace-settings';

export const DELETE = apiRoute(async (event) => {
	if (!event.params.id) throw apiError('BAD_REQUEST', '缺少成员编号');
	const context = await requireUserSpace(event);
	const membership = await removeWorkspaceMember(context, event.params.id);
	return apiOk({ membership });
});
