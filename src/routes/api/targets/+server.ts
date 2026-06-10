import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { createTarget, createTargetSchema, listTargets } from '$lib/server/targets';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const targets = await listTargets(context);

	return apiOk({ targets });
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createTargetSchema);
	const target = await createTarget(context, body);

	return apiOk({ target }, { status: 201 });
});
