import { eq } from 'drizzle-orm';
import { spaceMembers, spaces, userPreferences, type Space } from '$lib/server/db/schema';
import type { getDb } from '$lib/server/db';
import type { User } from 'better-auth';

type Db = ReturnType<typeof getDb>;

const defaultSpaceName = (user: Pick<User, 'name' | 'email'>) => {
	const displayName = user.name?.trim() || user.email.split('@')[0] || '我的';
	return `${displayName}的饭单空间`;
};

export const getUserSpaces = (db: Db, userId: string) =>
	db.select().from(spaces).where(eq(spaces.ownerUserId, userId)).orderBy(spaces.createdAt);

export const getPrimarySpace = async (db: Db, userId: string) => {
	const [space] = await getUserSpaces(db, userId).limit(1);
	return space;
};

const ensureOwnerWorkspaceRecords = async (db: Db, space: Space, userId: string) => {
	await db.batch([
		db
			.insert(spaceMembers)
			.values({
				id: crypto.randomUUID(),
				spaceId: space.id,
				userId,
				role: 'owner',
				status: 'active',
				joinedAt: space.createdAt
			})
			.onConflictDoNothing({ target: [spaceMembers.spaceId, spaceMembers.userId] }),
		db
			.insert(userPreferences)
			.values({ userId, currentSpaceId: space.id })
			.onConflictDoNothing({ target: userPreferences.userId })
	]);
};

export const ensureDefaultSpace = async (db: Db, user: Pick<User, 'id' | 'name' | 'email'>): Promise<Space> => {
	const existing = await getPrimarySpace(db, user.id);

	if (existing) {
		await ensureOwnerWorkspaceRecords(db, existing, user.id);
		return existing;
	}

	const id = crypto.randomUUID();
	const memberId = crypto.randomUUID();

	await db.batch([
		db.insert(spaces).values({
			id,
			name: defaultSpaceName(user),
			ownerUserId: user.id
		}),
		db.insert(spaceMembers).values({
			id: memberId,
			spaceId: id,
			userId: user.id,
			role: 'owner',
			status: 'active'
		}),
		db.insert(userPreferences).values({
			userId: user.id,
			currentSpaceId: id
		})
	]);

	const [created] = await db.select().from(spaces).where(eq(spaces.id, id)).limit(1);

	if (!created) {
		throw new Error('Failed to create default workspace');
	}

	return created;
};
