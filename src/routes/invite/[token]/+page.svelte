<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { AlertCircle, CheckCircle2, ChefHat, Clock3, ShieldCheck, UserPlus, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const canAccept = $derived(data.invitation?.state === 'pending' && !data.membership);
	const joined = $derived(Boolean(data.joinedNow || data.invitation?.acceptedByCurrentUser || data.membership === 'member'));
	const unavailableMessage = $derived(
		data.invitation?.state === 'expired'
			? '这个邀请已经过期，请让家庭所有者重新生成链接。'
			: data.invitation?.state === 'revoked'
				? '这个邀请已被撤销，请联系家庭所有者。'
				: data.invitation?.state === 'accepted'
					? '这个邀请已经被使用。'
					: '没有找到这个邀请，请检查链接是否完整。'
	);
</script>

<svelte:head><title>{data.space ? `加入 ${data.space.name} / 饭单` : '邀请不可用 / 饭单'}</title></svelte:head>

<main class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-5 px-4 py-8 md:max-w-2xl">
	{#if !data.invitation || !data.space}
		<section class="app-panel space-y-5 p-5 md:p-8">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle class="size-6" /></span>
			<div class="space-y-2"><p class="app-chip bg-muted text-muted-foreground">家庭邀请</p><h1 class="text-2xl font-semibold">邀请链接不可用</h1><p class="text-sm leading-6 text-muted-foreground">{unavailableMessage}</p></div>
		</section>
	{:else if joined}
		<section class="app-panel space-y-5 p-5 text-center md:p-8">
			<span class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><CheckCircle2 class="size-7" /></span>
			<div class="space-y-2"><p class="app-chip bg-secondary text-primary">加入成功</p><h1 class="text-2xl font-semibold">已经加入「{data.space.name}」</h1><p class="text-sm leading-6 text-muted-foreground">当前家庭已经切换，可以开始查看家人共享的常做菜、饭单和买菜清单。</p></div>
			<Button href="/app" class="h-12 w-full rounded-2xl text-base"><ChefHat class="size-4" />进入家庭饭单</Button>
		</section>
	{:else if data.membership === 'owner'}
		<section class="app-panel space-y-5 p-5 md:p-8">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck class="size-6" /></span>
			<div class="space-y-2"><h1 class="text-2xl font-semibold">这是你自己的家庭</h1><p class="text-sm leading-6 text-muted-foreground">家庭所有者不能接受自己创建的邀请。请把链接发给要加入的家人。</p></div>
			<Button href="/app/invitations" class="h-12 w-full rounded-2xl">返回邀请</Button>
		</section>
	{:else if data.invitation.state !== 'pending'}
		<section class="app-panel space-y-5 p-5 md:p-8">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle class="size-6" /></span>
			<div class="space-y-2"><p class="app-chip bg-muted text-muted-foreground">家庭邀请</p><h1 class="text-2xl font-semibold">暂时无法加入</h1><p class="text-sm leading-6 text-muted-foreground">{unavailableMessage}</p></div>
		</section>
	{:else}
		<section class="app-panel overflow-hidden">
			<div class="space-y-5 bg-secondary/60 p-5 md:p-8">
				<span class="flex size-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><UsersRound class="size-7" /></span>
				<div class="space-y-3"><p class="app-chip bg-white text-primary">家庭邀请</p><h1 class="text-3xl font-semibold leading-tight">加入「{data.space.name}」</h1><p class="text-sm leading-6 text-muted-foreground">加入后，家里的常做菜、饭单、确认结果和买菜清单会在同一个家庭里同步。</p></div>
				<p class="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-muted-foreground"><Clock3 class="size-4 text-primary" />邀请有效期至 {new Date(data.invitation.expiresAt).toLocaleString('zh-CN')}</p>
			</div>
			<div class="space-y-4 p-5 md:p-8">
				{#if form?.message}<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>{/if}
				{#if data.signedIn}
					<form method="post" action="?/accept" use:enhanceWithFeedback={{ pendingLabel: '加入中...' }}>
						<Button type="submit" class="h-12 w-full rounded-2xl text-base" disabled={!canAccept} data-pending-label="加入中..."><UserPlus class="size-4" />确认加入</Button>
					</form>
				{:else}
					<div class="grid gap-3">
						<Button href={`/login?next=${encodeURIComponent(`/invite/${data.token}`)}`} class="h-12 w-full rounded-2xl text-base"><UserPlus class="size-4" />登录后加入</Button>
						<Button href={`/register?next=${encodeURIComponent(`/invite/${data.token}`)}`} variant="outline" class="h-12 w-full rounded-2xl bg-white text-base">创建账号后加入</Button>
					</div>
				{/if}
				<div class="flex gap-3 text-sm leading-6 text-muted-foreground"><ShieldCheck class="mt-0.5 size-5 shrink-0 text-primary" /><p>加入前不会展示家庭里的私人内容；只有确认加入后才能访问共享数据。</p></div>
			</div>
		</section>
	{/if}
</main>
