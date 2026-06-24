import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import { spaceInvitations, spaceMembers, spaces, userPreferences, type SpaceInvitation } from './db/schema';
import { requireSpaceOwner, type AuthenticatedContext, type RequestContext } from './context';

const DEFAULT_EXPIRY_DAYS = 7;

export const createInvitationSchema = z.object({
	expiresInDays: z.number().int().min(1).max(30).default(DEFAULT_EXPIRY_DAYS)
});

const encodeBase64Url = (bytes: Uint8Array) => {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

const createToken = () => {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return encodeBase64Url(bytes);
};

const invitationState = (invitation: SpaceInvitation) => {
	if (invitation.status === 'revoked') return 'revoked' as const;
	if (invitation.status === 'accepted') return 'accepted' as const;
	if (new Date(invitation.expiresAt).getTime() <= Date.now()) return 'expired' as const;
	return 'pending' as const;
};

export const listInvitations = async (context: AuthenticatedContext) => {
	requireSpaceOwner(context);

	const invitations = await context.db
		.select()
		.from(spaceInvitations)
		.where(eq(spaceInvitations.spaceId, context.space.id))
		.orderBy(desc(spaceInvitations.createdAt));

	return invitations.map((invitation) => ({
		...invitation,
		state: invitationState(invitation)
	}));
};

export const createInvitation = async (
	context: AuthenticatedContext,
	input: z.infer<typeof createInvitationSchema>
) => {
	requireSpaceOwner(context);
	const data = createInvitationSchema.parse(input);
	const invitation = {
		id: crypto.randomUUID(),
		spaceId: context.space.id,
		token: createToken(),
		role: 'member' as const,
		status: 'pending' as const,
		invitedByUserId: context.user.id,
		expiresAt: new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
	};

	await context.db.insert(spaceInvitations).values(invitation);
	return { ...invitation, acceptedByUserId: null, acceptedAt: null, revokedAt: null, state: 'pending' as const };
};

export const revokeInvitation = async (context: AuthenticatedContext, invitationId: string) => {
	requireSpaceOwner(context);

	const [invitation] = await context.db
		.select()
		.from(spaceInvitations)
		.where(and(eq(spaceInvitations.id, invitationId), eq(spaceInvitations.spaceId, context.space.id)))
		.limit(1);

	if (!invitation) throw apiError('NOT_FOUND', '邀请不存在');
	if (invitation.status === 'accepted') throw apiError('CONFLICT', '已接受的邀请不能撤销');
	if (invitation.status === 'revoked') return { ...invitation, state: 'revoked' as const };

	const now = new Date().toISOString();
	await context.db
		.update(spaceInvitations)
		.set({ status: 'revoked', revokedAt: now, updatedAt: now })
		.where(and(eq(spaceInvitations.id, invitation.id), eq(spaceInvitations.status, 'pending')));

	const [revoked] = await context.db
		.select()
		.from(spaceInvitations)
		.where(eq(spaceInvitations.id, invitation.id))
		.limit(1);
	if (!revoked) throw apiError('NOT_FOUND', '邀请不存在');
	if (revoked.status === 'accepted') throw apiError('CONFLICT', '邀请已被接受，不能撤销');
	return { ...revoked, state: invitationState(revoked) };
};

export const getInvitationPreview = async (context: RequestContext, token: string, userId?: string) => {
	const [row] = await context.db
		.select({ invitation: spaceInvitations, spaceName: spaces.name })
		.from(spaceInvitations)
		.innerJoin(spaces, eq(spaceInvitations.spaceId, spaces.id))
		.where(eq(spaceInvitations.token, token))
		.limit(1);

	if (!row) throw apiError('NOT_FOUND', '邀请不存在');

	const state = invitationState(row.invitation);
	let membership: 'owner' | 'member' | null = null;
	if (userId) {
		const [existing] = await context.db
			.select({ role: spaceMembers.role })
			.from(spaceMembers)
			.where(
				and(
					eq(spaceMembers.spaceId, row.invitation.spaceId),
					eq(spaceMembers.userId, userId),
					eq(spaceMembers.status, 'active')
				)
			)
			.limit(1);
		membership = existing?.role ?? null;
	}

	return {
		space: { name: row.spaceName },
		invitation: {
			role: row.invitation.role,
			expiresAt: row.invitation.expiresAt,
			state,
			acceptedByCurrentUser: Boolean(userId && membership && row.invitation.acceptedByUserId === userId)
		},
		membership
	};
};

export const acceptInvitation = async (context: AuthenticatedContext, token: string) => {
	const [invitation] = await context.db
		.select()
		.from(spaceInvitations)
		.where(eq(spaceInvitations.token, token))
		.limit(1);

	if (!invitation) throw apiError('NOT_FOUND', '邀请不存在');

	if (invitation.status === 'accepted') {
		if (invitation.acceptedByUserId !== context.user.id) {
			throw apiError('CONFLICT', '邀请已被其他用户接受');
		}

		const [membership] = await context.db
			.select()
			.from(spaceMembers)
			.where(
				and(
					eq(spaceMembers.spaceId, invitation.spaceId),
					eq(spaceMembers.userId, context.user.id),
					eq(spaceMembers.status, 'active')
				)
			)
			.limit(1);
		if (!membership) throw apiError('CONFLICT', '该邀请对应的成员资格已失效');
		await context.db
			.insert(userPreferences)
			.values({ userId: context.user.id, currentSpaceId: invitation.spaceId })
			.onConflictDoUpdate({
				target: userPreferences.userId,
				set: { currentSpaceId: invitation.spaceId, updatedAt: new Date().toISOString() }
			});
		return { invitation, membership, alreadyAccepted: true };
	}

	if (invitation.status === 'revoked') throw apiError('CONFLICT', '邀请已被撤销');
	if (new Date(invitation.expiresAt).getTime() <= Date.now()) throw apiError('CONFLICT', '邀请已经过期');

	const [existingMembership] = await context.db
		.select()
		.from(spaceMembers)
		.where(and(eq(spaceMembers.spaceId, invitation.spaceId), eq(spaceMembers.userId, context.user.id)))
		.limit(1);

	if (existingMembership) {
		throw apiError(
			'CONFLICT',
			existingMembership.role === 'owner'
				? '空间所有者不能接受自己创建的邀请'
				: '你已经拥有这个空间的成员记录'
		);
	}

	const membershipId = crypto.randomUUID();
	const now = new Date().toISOString();

	await context.db.batch([
		context.db.insert(spaceMembers).select(sql`
			SELECT ${membershipId}, ${invitation.spaceId}, ${context.user.id}, 'member', 'active', ${now}, ${now}, ${now}
			FROM ${spaceInvitations}
			WHERE ${spaceInvitations.id} = ${invitation.id}
				AND ${spaceInvitations.status} = 'pending'
				AND ${spaceInvitations.expiresAt} > ${now}
		`),
		context.db
			.update(spaceInvitations)
			.set({ status: 'accepted', acceptedByUserId: context.user.id, acceptedAt: now, updatedAt: now })
			.where(
				and(
					eq(spaceInvitations.id, invitation.id),
					eq(spaceInvitations.status, 'pending'),
					gt(spaceInvitations.expiresAt, now)
				)
			)
	]);

	const [accepted] = await context.db
		.select()
		.from(spaceInvitations)
		.where(eq(spaceInvitations.id, invitation.id))
		.limit(1);
	const [membership] = await context.db
		.select()
		.from(spaceMembers)
		.where(and(eq(spaceMembers.spaceId, invitation.spaceId), eq(spaceMembers.userId, context.user.id)))
		.limit(1);

	if (!accepted || accepted.acceptedByUserId !== context.user.id || !membership) {
		throw apiError('CONFLICT', '邀请已被其他用户接受');
	}

	await context.db
		.insert(userPreferences)
		.values({ userId: context.user.id, currentSpaceId: invitation.spaceId })
		.onConflictDoUpdate({
			target: userPreferences.userId,
			set: { currentSpaceId: invitation.spaceId, updatedAt: now }
		});

	return { invitation: accepted, membership, alreadyAccepted: false };
};
