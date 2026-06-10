import { json } from '@sveltejs/kit';
import type { ApiError } from './errors';

export type ApiSuccess<T> = {
	ok: true;
	data: T;
	meta?: Record<string, unknown>;
};

export type ApiFailure = {
	ok: false;
	error: {
		code: ApiError['code'];
		message: string;
		issues?: ApiError['issues'];
	};
};

export const apiOk = <T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }) => {
	const { meta, ...responseInit } = init ?? {};

	return json(
		{
			ok: true,
			data,
			...(meta ? { meta } : {})
		} satisfies ApiSuccess<T>,
		responseInit
	);
};

export const apiFail = (cause: ApiError) =>
	json(
		{
			ok: false,
			error: {
				code: cause.code,
				message: cause.message,
				...(cause.issues ? { issues: cause.issues } : {})
			}
		} satisfies ApiFailure,
		{ status: cause.status }
	);
