import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { getRequestContext } from '$lib/server/context';
import { ensureDefaultSpace } from '$lib/server/workspace';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const signInSchema = z.object({
	email: z.email('请输入有效邮箱'),
	password: z.string().min(8, '密码至少 8 位')
});

const signUpSchema = signInSchema.extend({
	name: z.string().min(1, '请输入名称')
});

const getRedirectTo = (event: RequestEvent) => {
	const next = event.url.searchParams.get('next');
	return next?.startsWith('/') && !next.startsWith('//') ? next : '/app';
};

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, getRedirectTo(event));
	}

	return {
		signInForm: await superValidate(zod4(signInSchema), { id: 'sign-in' }),
		signUpForm: await superValidate(zod4(signUpSchema), { id: 'sign-up' })
	};
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const form = await superValidate(event, zod4(signInSchema), { id: 'sign-in' });

		if (!form.valid) {
			return fail(400, { signInForm: form });
		}

		if (!event.locals.auth) {
			return fail(503, {
				signInForm: {
					...form,
					message: '服务暂时不可用，请稍后重试'
				}
			});
		}

		try {
			const result = await event.locals.auth.api.signInEmail({
				body: {
					email: form.data.email,
					password: form.data.password,
					callbackURL: getRedirectTo(event)
				},
				headers: event.request.headers
			});

			const { db } = getRequestContext(event);
			await ensureDefaultSpace(db, result.user);
		} catch (error) {
			const message = error instanceof APIError ? error.message : '登录失败，请稍后重试';
			return fail(400, { signInForm: { ...form, message } });
		}

		return redirect(302, getRedirectTo(event));
	},

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
					callbackURL: getRedirectTo(event)
				},
				headers: event.request.headers
			});

			const { db } = getRequestContext(event);
			await ensureDefaultSpace(db, result.user);
		} catch (error) {
			const message = error instanceof APIError ? error.message : '注册失败，请稍后重试';
			return fail(400, { signUpForm: { ...form, message } });
		}

		return redirect(302, getRedirectTo(event));
	}
};
