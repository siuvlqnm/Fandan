import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { deleteTarget, getTarget, updateTarget, updateTargetSchema } from '$lib/server/targets';

const getTargetId = (id: string | undefined) => {
	if (!id) {
		throw apiError('BAD_REQUEST', 'Target id is required');
	}

	return id;
};

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const target = await getTarget(context, getTargetId(event.params.id));

	return apiOk({ target });
});

export const PATCH = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, updateTargetSchema);
	const target = await updateTarget(context, getTargetId(event.params.id), body);

	return apiOk({ target });
});

export const DELETE = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const result = await deleteTarget(context, getTargetId(event.params.id));

	return apiOk(result);
});
