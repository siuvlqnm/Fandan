import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { apiError } from './api/errors';
import { getDb } from './db';
import { spaceMembers, spaces, userPreferences, type Space, type SpaceMember } from './db/schema';
import { ensureDefaultSpace } from './workspace';
import type { RequestEvent } from '@sveltejs/kit';

export type RequestContext = {
	db: ReturnType<typeof getDb>;
	env: Env;
};

export type AuthenticatedContext = RequestContext & {
	user: NonNullable<App.Locals['user']>;
	session: NonNullable<App.Locals['session']>;
	space: Space;
	membership: SpaceMember;
};

export type SpaceAccess = {
	space: Space;
	membership: SpaceMember;
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

export const getActiveSpaceAccess = async (
	context: RequestContext,
	userId: string,
	spaceId: string
): Promise<SpaceAccess | undefined> => {
	const [access] = await context.db
		.select({ space: spaces, membership: spaceMembers })
		.from(spaceMembers)
		.innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
		.where(
			and(
				eq(spaceMembers.userId, userId),
				eq(spaceMembers.spaceId, spaceId),
				eq(spaceMembers.status, 'active')
			)
		)
		.limit(1);

	return access;
};

export const requireSpaceMembership = async (context: RequestContext, userId: string, spaceId: string) => {
	const access = await getActiveSpaceAccess(context, userId, spaceId);

	if (!access) {
		throw apiError('FORBIDDEN', 'You are not an active member of this workspace');
	}

	return access;
};

const getPreferredSpaceAccess = async (context: RequestContext, userId: string) => {
	const [preference] = await context.db
		.select({ currentSpaceId: userPreferences.currentSpaceId })
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	if (!preference?.currentSpaceId) {
		return undefined;
	}

	return getActiveSpaceAccess(context, userId, preference.currentSpaceId);
};

const getFallbackSpaceAccess = async (context: RequestContext, userId: string) => {
	const [access] = await context.db
		.select({ space: spaces, membership: spaceMembers })
		.from(spaceMembers)
		.innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
		.where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.status, 'active')))
		.orderBy(desc(spaceMembers.role), asc(spaceMembers.joinedAt), asc(spaces.createdAt), asc(spaces.id))
		.limit(1);

	return access;
};

const saveCurrentSpacePreference = async (context: RequestContext, userId: string, spaceId: string) => {
	await context.db
		.insert(userPreferences)
		.values({ userId, currentSpaceId: spaceId })
		.onConflictDoUpdate({
			target: userPreferences.userId,
			set: {
				currentSpaceId: spaceId,
				updatedAt: sql`CURRENT_TIMESTAMP`
			}
		});
};

export const getCurrentSpace = async (event: RequestEvent, context = getRequestContext(event)): Promise<SpaceAccess> => {
	const user = event.locals.user;

	if (!user) {
		throw apiError('UNAUTHORIZED', 'Authentication is required');
	}

	const preferredAccess = await getPreferredSpaceAccess(context, user.id);

	if (preferredAccess) {
		return preferredAccess;
	}

	let access = await getFallbackSpaceAccess(context, user.id);

	if (!access) {
		const defaultSpace = await ensureDefaultSpace(context.db, user);
		access = await requireSpaceMembership(context, user.id, defaultSpace.id);
	}

	await saveCurrentSpacePreference(context, user.id, access.space.id);

	return access;
};

export const requireSpaceRole = (context: AuthenticatedContext, roles: readonly SpaceMember['role'][]) => {
	if (!roles.includes(context.membership.role)) {
		throw apiError('FORBIDDEN', 'Your workspace role does not allow this action');
	}

	return context;
};

export const requireSpaceOwner = (context: AuthenticatedContext) => requireSpaceRole(context, ['owner']);

export const requireUserSpace = async (event: RequestEvent): Promise<AuthenticatedContext> => {
	const context = getRequestContext(event);

	if (!event.locals.user || !event.locals.session) {
		throw apiError('UNAUTHORIZED', 'Authentication is required');
	}

	const { space, membership } = await getCurrentSpace(event, context);

	return {
		...context,
		user: event.locals.user,
		session: event.locals.session,
		space,
		membership
	};
};
