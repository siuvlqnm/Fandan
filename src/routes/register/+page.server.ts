import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { getRequestContext } from '$lib/server/context';
import { ensureDefaultSpace } from '$lib/server/workspace';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const signUpSchema = z.object({
	name: z.string().trim().min(1, '请输入名称').max(80),
	email: z.email('请输入有效邮箱'),
	password: z.string().min(8, '密码至少 8 位'),
	next: z.string().optional()
});

const safeNext = (value: string | null | undefined) =>
	value?.startsWith('/') && !value.startsWith('//') ? value : null;
const getRedirectTo = (event: RequestEvent, formNext?: string) =>
	safeNext(formNext ?? event.url.searchParams.get('next')) ?? '/app/meal-plans/new';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, getRedirectTo(event));
	}

	return {
		next: getRedirectTo(event),
		loginNext: safeNext(event.url.searchParams.get('next')),
		signUpForm: await superValidate(zod4(signUpSchema), { id: 'sign-up' })
	};
};

export const actions: Actions = {
	signUpEmail: async (event) => {
		const form = await superValidate(event, zod4(signUpSchema), { id: 'sign-up' });

		if (!form.valid) {
			return fail(400, { signUpForm: form });
		}

		if (!event.locals.auth) {
			return fail(503, {
				signUpForm: {
					...form,
					message: '服务暂时不可用，请稍后重试'
				}
			});
		}

		try {
			const result = await event.locals.auth.api.signUpEmail({
				body: {
					email: form.data.email,
					password: form.data.password,
					name: form.data.name,
					callbackURL: getRedirectTo(event, form.data.next)
				},
				headers: event.request.headers
			});

			const { db } = getRequestContext(event);
			await ensureDefaultSpace(db, result.user);
		} catch (error) {
			const message = error instanceof APIError ? error.message : '注册失败，请稍后重试';
			return fail(400, { signUpForm: { ...form, message } });
		}

		return redirect(302, getRedirectTo(event, form.data.next));
	}
};
