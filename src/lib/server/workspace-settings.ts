import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import { user } from './db/auth.schema';
import { spaceMembers, spaces, userPreferences } from './db/schema';
import {
	requireSpaceMembership,
	requireSpaceOwner,
	selectCurrentSpace,
	type AuthenticatedContext
} from './context';

export const updateWorkspaceSchema = z.object({
	name: z.string().trim().min(1, '请输入家庭名称').max(80, '家庭名称不能超过 80 个字')
});

export const createWorkspaceSchema = updateWorkspaceSchema;

export const listUserWorkspaces = async (context: AuthenticatedContext) => {
	const memberships = await context.db
		.select({
			id: spaces.id,
			name: spaces.name,
			role: spaceMembers.role,
			joinedAt: spaceMembers.joinedAt,
			createdAt: spaces.createdAt,
			updatedAt: spaces.updatedAt
		})
		.from(spaceMembers)
		.innerJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
		.where(and(eq(spaceMembers.userId, context.user.id), eq(spaceMembers.status, 'active')))
		.orderBy(desc(spaceMembers.role), asc(spaceMembers.joinedAt), asc(spaces.createdAt), asc(spaces.id));

	return memberships
		.map((workspace) => ({ ...workspace, isCurrent: workspace.id === context.space.id }))
		.sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent));
};

export const createWorkspace = async (
	context: AuthenticatedContext,
	input: z.infer<typeof createWorkspaceSchema>
) => {
	const data = createWorkspaceSchema.parse(input);
	const spaceId = crypto.randomUUID();

	await context.db.batch([
		context.db.insert(spaces).values({
			id: spaceId,
			name: data.name,
			ownerUserId: context.user.id
		}),
		context.db.insert(spaceMembers).values({
			id: crypto.randomUUID(),
			spaceId,
			userId: context.user.id,
			role: 'owner',
			status: 'active'
		}),
		context.db
			.insert(userPreferences)
			.values({ userId: context.user.id, currentSpaceId: spaceId })
			.onConflictDoUpdate({
				target: userPreferences.userId,
				set: { currentSpaceId: spaceId, updatedAt: sql`CURRENT_TIMESTAMP` }
			})
	]);

	return requireSpaceMembership(context, context.user.id, spaceId);
};

export const switchWorkspace = (context: AuthenticatedContext, spaceId: string) =>
	selectCurrentSpace(context, context.user.id, spaceId);

export const listWorkspaceMembers = async (context: AuthenticatedContext) =>
	context.db
		.select({
			id: spaceMembers.id,
			userId: spaceMembers.userId,
			role: spaceMembers.role,
			status: spaceMembers.status,
			joinedAt: spaceMembers.joinedAt,
			name: user.name,
			email: user.email,
			image: user.image
		})
		.from(spaceMembers)
		.innerJoin(user, eq(spaceMembers.userId, user.id))
		.where(and(eq(spaceMembers.spaceId, context.space.id), eq(spaceMembers.status, 'active')))
		.orderBy(desc(spaceMembers.role), asc(spaceMembers.joinedAt), asc(user.name));

export const updateWorkspace = async (
	context: AuthenticatedContext,
	input: z.infer<typeof updateWorkspaceSchema>
) => {
	requireSpaceOwner(context);
	const data = updateWorkspaceSchema.parse(input);
	const now = new Date().toISOString();

	await context.db
		.update(spaces)
		.set({ name: data.name, updatedAt: now })
		.where(eq(spaces.id, context.space.id));

	return { ...context.space, name: data.name, updatedAt: now };
};

const getActiveMembership = async (context: AuthenticatedContext, membershipId: string) => {
	const [membership] = await context.db
		.select()
		.from(spaceMembers)
		.where(
			and(
				eq(spaceMembers.id, membershipId),
				eq(spaceMembers.spaceId, context.space.id),
				eq(spaceMembers.status, 'active')
			)
		)
		.limit(1);

	return membership;
};

export const removeWorkspaceMember = async (context: AuthenticatedContext, membershipId: string) => {
	requireSpaceOwner(context);
	const membership = await getActiveMembership(context, membershipId);

	if (!membership) throw apiError('NOT_FOUND', '成员不存在或已离开');
	if (membership.role === 'owner') throw apiError('CONFLICT', '所有者不能被移除，请先完成所有权转让');
	if (membership.userId === context.user.id) throw apiError('CONFLICT', '所有者不能移除自己');

	const now = new Date().toISOString();
	await context.db.batch([
		context.db
			.update(spaceMembers)
			.set({ status: 'removed', updatedAt: now })
			.where(and(eq(spaceMembers.id, membership.id), eq(spaceMembers.status, 'active'))),
		context.db
			.update(userPreferences)
			.set({ currentSpaceId: null, updatedAt: now })
			.where(
				and(
					eq(userPreferences.userId, membership.userId),
					eq(userPreferences.currentSpaceId, context.space.id)
				)
			)
	]);

	return { ...membership, status: 'removed' as const, updatedAt: now };
};

export const leaveWorkspace = async (context: AuthenticatedContext) => {
	if (context.membership.role === 'owner') {
		throw apiError('CONFLICT', '所有者不能直接退出，请先完成所有权转让');
	}

	const now = new Date().toISOString();
	await context.db.batch([
		context.db
			.update(spaceMembers)
			.set({ status: 'left', updatedAt: now })
			.where(
				and(
					eq(spaceMembers.id, context.membership.id),
					eq(spaceMembers.status, 'active'),
					eq(spaceMembers.role, 'member')
				)
			),
		context.db
			.update(userPreferences)
			.set({ currentSpaceId: null, updatedAt: now })
			.where(eq(userPreferences.userId, context.user.id))
	]);

	return { ...context.membership, status: 'left' as const, updatedAt: now };
};
