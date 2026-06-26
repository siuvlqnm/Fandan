import { sql } from 'drizzle-orm';
import { apiError } from './api/errors';

export const versionedNow = sql`strftime('%Y-%m-%d %H:%M:%f', 'now')`;

export const normalizeExpectedUpdatedAt = (value: string | null | undefined) => {
	const normalized = value?.trim();
	return normalized ? normalized : null;
};

export const staleWriteError = () =>
	apiError('CONFLICT', '内容已被其他成员更新，请重新加载页面后再提交。');

export const assertExpectedUpdatedAt = (actual: string, expected: string | null | undefined) => {
	const normalized = normalizeExpectedUpdatedAt(expected);

	if (normalized && actual !== normalized) {
		throw staleWriteError();
	}
};
