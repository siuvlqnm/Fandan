import { error } from '@sveltejs/kit';
import { ZodError } from 'zod';

export type ApiErrorCode =
	| 'BAD_REQUEST'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'VALIDATION_ERROR'
	| 'CONFLICT'
	| 'INTERNAL_ERROR'
	| 'SERVICE_UNAVAILABLE';

export type ApiIssue = {
	path: string;
	message: string;
};

const statusByCode: Record<ApiErrorCode, number> = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	VALIDATION_ERROR: 422,
	CONFLICT: 409,
	INTERNAL_ERROR: 500,
	SERVICE_UNAVAILABLE: 503
};

export class ApiError extends Error {
	readonly code: ApiErrorCode;
	readonly status: number;
	readonly issues?: ApiIssue[];

	constructor(code: ApiErrorCode, message: string, options?: { status?: number; issues?: ApiIssue[] }) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.status = options?.status ?? statusByCode[code];
		this.issues = options?.issues;
	}
}

export const apiError = (code: ApiErrorCode, message: string, options?: { status?: number; issues?: ApiIssue[] }) =>
	new ApiError(code, message, options);

export const validationError = (cause: ZodError) =>
	new ApiError('VALIDATION_ERROR', 'Request validation failed', {
		issues: cause.issues.map((issue) => ({
			path: issue.path.join('.'),
			message: issue.message
		}))
	});

export const toApiError = (cause: unknown) => {
	if (cause instanceof ApiError) {
		return cause;
	}

	if (cause instanceof ZodError) {
		return validationError(cause);
	}

	return new ApiError('INTERNAL_ERROR', 'Unexpected server error');
};

export const throwApiError = (cause: unknown): never => {
	const apiCause = toApiError(cause);
	throw error(apiCause.status, {
		message: apiCause.message,
		code: apiCause.code,
		issues: apiCause.issues
	});
};
