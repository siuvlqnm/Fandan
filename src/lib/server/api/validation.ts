import { apiError, validationError } from './errors';
import type { RequestEvent } from '@sveltejs/kit';
import type { z } from 'zod';

export const parseJsonBody = async <Schema extends z.ZodType>(event: RequestEvent, schema: Schema) => {
	const contentType = event.request.headers.get('content-type') ?? '';

	if (!contentType.includes('application/json')) {
		throw apiError('BAD_REQUEST', 'Expected application/json request body');
	}

	let payload: unknown;

	try {
		payload = await event.request.json();
	} catch {
		throw apiError('BAD_REQUEST', 'Malformed JSON request body');
	}

	const result = schema.safeParse(payload);

	if (!result.success) {
		throw validationError(result.error);
	}

	return result.data as z.infer<Schema>;
};
