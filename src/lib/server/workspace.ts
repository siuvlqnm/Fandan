import { eq } from 'drizzle-orm';
import { spaces, type Space } from '$lib/server/db/schema';
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

export const ensureDefaultSpace = async (db: Db, user: Pick<User, 'id' | 'name' | 'email'>): Promise<Space> => {
	const existing = await getPrimarySpace(db, user.id);

	if (existing) {
		return existing;
	}

	const id = crypto.randomUUID();

	await db.insert(spaces).values({
		id,
		name: defaultSpaceName(user),
		ownerUserId: user.id
	});

	const [created] = await db.select().from(spaces).where(eq(spaces.id, id)).limit(1);

	if (!created) {
		throw new Error('Failed to create default workspace');
	}

	return created;
};
