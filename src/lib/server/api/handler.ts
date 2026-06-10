import { apiFail } from './response';
import { toApiError } from './errors';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

type ApiRouteHandler = (event: RequestEvent) => Response | Promise<Response>;

export const apiRoute = (handler: ApiRouteHandler): RequestHandler => {
	return async (event) => {
		try {
			return await handler(event);
		} catch (cause) {
			return apiFail(toApiError(cause));
		}
	};
};
