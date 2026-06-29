import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiError } from '$lib/server/api/errors';
import { getRequestContext } from '$lib/server/context';
import { confirmShare, createShareFeedback, getPublicShare } from '$lib/server/share-links';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const formNullableTextSchema = (maxLength: number) =>
	z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().optional());
const reactionSchema = z.enum(['like', 'dislike', 'replace', 'note']);

const feedbackFormSchema = z.object({
	guestName: formNullableTextSchema(80),
	dietaryNote: formNullableTextSchema(1000),
	items: z.array(
		z.object({
			mealPlanItemId: z.string().trim().min(1),
			reaction: reactionSchema,
			note: formNullableTextSchema(1000)
		})
	)
});

const confirmFormSchema = z.object({
	guestName: formNullableTextSchema(80),
	note: formNullableTextSchema(1000),
	dietaryNote: formNullableTextSchema(1000)
});

type Share = Awaited<ReturnType<typeof getPublicShare>>;
type FormAction = 'feedback' | 'confirm';

const mealPlanTypeLabels: Record<string, string> = {
	single_meal: '单餐',
	day: '一日',
	week: '一周',
	gathering: '聚餐'
};

const statusLabels: Record<string, string> = {
	draft: '草稿',
	pending_confirmation: '待确认',
	confirmed: '已确认',
	completed: '已完成',
	archived: '已收起'
};

const fieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

const actionError = (action: FormAction, cause: unknown, values: Record<string, unknown> = {}) => {
	if (cause instanceof ApiError) {
		return fail(cause.status, { action, values, errors: {}, message: cause.message });
	}

	throw cause;
};

const toPageError = (cause: unknown) => {
	if (cause instanceof ApiError) {
		const title =
			cause.code === 'FORBIDDEN'
				? '这个分享链接暂时不可用'
				: cause.code === 'NOT_FOUND'
					? '没有找到这份饭单'
					: '分享链接无法打开';

		return {
			status: cause.status,
			code: cause.code,
			title,
			message: cause.message
		};
	}

	throw cause;
};

const getToken = (event: RequestEvent) => event.params.token ?? '';

const formatDateRange = (mealPlan: Share['mealPlan']) => {
	if (mealPlan.startDate && mealPlan.endDate && mealPlan.startDate !== mealPlan.endDate) {
		return `${mealPlan.startDate} 至 ${mealPlan.endDate}`;
	}

	return mealPlan.startDate ?? mealPlan.endDate ?? '未设置日期';
};

const groupItems = (items: Share['mealPlan']['items']) =>
	Array.from(
		items
			.reduce(
				(map, item) => {
					const key = `${item.plannedDate ?? 'no-date'}::${item.mealSlot ?? 'no-slot'}`;
					const group = map.get(key) ?? {
						key,
						dateLabel: item.plannedDate ?? '未设置日期',
						slotLabel: item.mealSlot ?? '未设置餐别',
						items: [] as typeof items
					};
					group.items.push(item);
					map.set(key, group);
					return map;
				},
				new Map<string, { key: string; dateLabel: string; slotLabel: string; items: typeof items }>()
			)
			.values()
	);

export const load: PageServerLoad = async (event) => {
	const context = getRequestContext(event);

	try {
		const share = await getPublicShare(context, getToken(event));

		return {
			share: {
				...share,
				mealPlan: {
					...share.mealPlan,
					typeLabel: mealPlanTypeLabels[share.mealPlan.type],
					statusLabel: statusLabels[share.mealPlan.status],
					dateRangeLabel: formatDateRange(share.mealPlan)
				}
			},
			groups: groupItems(share.mealPlan.items),
			confirmedNow: event.url.searchParams.get('confirmed') === '1',
			pageError: null
		};
	} catch (cause) {
		return {
			share: null,
			groups: [],
			confirmedNow: false,
			pageError: toPageError(cause)
		};
	}
};

const readFeedbackForm = async (request: Request) => {
	const formData = await request.formData();
	const mealPlanItemIds = formData
		.getAll('mealPlanItemId')
		.filter((value): value is string => typeof value === 'string' && value.length > 0);
	const items = mealPlanItemIds
		.map((mealPlanItemId) => {
			const reactionValue = formData.get(`reaction-${mealPlanItemId}`);
			const note = String(formData.get(`note-${mealPlanItemId}`) ?? '');
			const reaction = reactionValue === 'like' || reactionValue === 'dislike' || reactionValue === 'replace' || reactionValue === 'note'
				? reactionValue
				: note.trim()
					? 'note'
					: null;

			return reaction
				? {
						mealPlanItemId,
						reaction,
						note
					}
				: null;
		})
		.filter((item): item is NonNullable<typeof item> => Boolean(item));

	return {
		guestName: String(formData.get('guestName') ?? ''),
		dietaryNote: String(formData.get('dietaryNote') ?? ''),
		items
	};
};

const readConfirmForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		guestName: String(formData.get('guestName') ?? ''),
		note: String(formData.get('note') ?? ''),
		dietaryNote: String(formData.get('dietaryNote') ?? '')
	};
};

export const actions: Actions = {
	feedback: async (event) => {
		const values = await readFeedbackForm(event.request);
		const result = feedbackFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'feedback', values, errors: fieldErrors(result.error) });
		}

		if (result.data.items.length === 0 && !result.data.dietaryNote) {
			return fail(400, {
				action: 'feedback',
				values,
				errors: { form: ['请选择至少一道菜的反馈，或填写全局忌口备注'] }
			});
		}

		try {
			const context = getRequestContext(event);
			await createShareFeedback(context, getToken(event), { ...result.data, reaction: 'note' });

			return {
				action: 'feedback',
				success: true,
				message: '反馈已提交，创建者会在这顿饭里看到这些备注。'
			};
		} catch (cause) {
			return actionError('feedback', cause, values);
		}
	},

	confirm: async (event) => {
		const values = await readConfirmForm(event.request);
		const result = confirmFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'confirm', values, errors: fieldErrors(result.error) });
		}

		try {
			const context = getRequestContext(event);
			await confirmShare(context, getToken(event), result.data);
			throw redirect(303, `${event.url.pathname}?confirmed=1`);
		} catch (cause) {
			return actionError('confirm', cause, values);
		}
	}
};
