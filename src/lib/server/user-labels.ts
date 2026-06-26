import { inArray } from 'drizzle-orm';
import type { RequestContext } from './context';
import { user } from './db/schema';

export type UserLabel = {
	id: string;
	name: string;
};

export const loadUserLabels = async (context: RequestContext, userIds: Array<string | null | undefined>) => {
	const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));

	if (ids.length === 0) {
		return new Map<string, UserLabel>();
	}

	const rows = await context.db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids));

	return new Map(rows.map((row) => [row.id, row]));
};

export const userLabelFrom = (labels: Map<string, UserLabel>, userId: string | null | undefined) => {
	if (!userId) {
		return null;
	}

	return labels.get(userId) ?? { id: userId, name: '已删除成员' };
};
