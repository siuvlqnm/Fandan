import { eq } from 'drizzle-orm';
import { apiError } from './api/errors';
import { getDb } from './db';
import { spaces, type Space } from './db/schema';
import type { RequestEvent } from '@sveltejs/kit';

export type RequestContext = {
	db: ReturnType<typeof getDb>;
	env: Env;
};

export type AuthenticatedContext = RequestContext & {
	user: NonNullable<App.Locals['user']>;
	session: NonNullable<App.Locals['session']>;
	space: Space;
};

export const getRequestContext = (event: RequestEvent): RequestContext => {
	const env = event.platform?.env as Env | undefined;

	if (!env?.DB) {
		throw apiError('SERVICE_UNAVAILABLE', 'D1 binding "DB" is not available');
	}

	return {
		env,
		db: getDb(env.DB)
	};
};

export const getCurrentSpace = async (event: RequestEvent, context = getRequestContext(event)) => {
	const user = event.locals.user;

	if (!user) {
		throw apiError('UNAUTHORIZED', 'Authentication is required');
	}

	const [space] = await context.db.select().from(spaces).where(eq(spaces.ownerUserId, user.id)).limit(1);

	if (!space) {
		throw apiError('NOT_FOUND', 'Current user does not have a workspace');
	}

	return space;
};

export const requireUserSpace = async (event: RequestEvent): Promise<AuthenticatedContext> => {
	const context = getRequestContext(event);

	if (!event.locals.user || !event.locals.session) {
		throw apiError('UNAUTHORIZED', 'Authentication is required');
	}

	const space = await getCurrentSpace(event, context);

	return {
		...context,
		user: event.locals.user,
		session: event.locals.session,
		space
	};
};
