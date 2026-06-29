<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import { ArrowLeft, Check, Copy, Link2, Plus, ShieldCheck, UserPlus, XCircle } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let copiedToken = $state<string | null>(null);

	const stateLabels = {
		pending: '等待加入',
		accepted: '已加入',
		expired: '已过期',
		revoked: '已撤销'
	};

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

	const copyInvitation = async (token: string, url: string) => {
		await navigator.clipboard.writeText(url);
		copiedToken = token;
		window.setTimeout(() => {
			if (copiedToken === token) copiedToken = null;
		}, 1600);
	};
</script>

<svelte:head><title>邀请家人 / 饭单</title></svelte:head>

<main class="app-page app-bottom-safe">
	<section class="app-scene-hero">
		<div class="app-scene-hero-media">
			<img src={avatarImage} alt="" />
		</div>
		<div class="app-scene-body -mt-14">
			<a href="/app/settings" class="mb-2 flex h-11 w-fit shrink-0 items-center gap-2 rounded-2xl bg-white/85 px-3 text-sm text-muted-foreground shadow-sm" aria-label="返回家">
				<ArrowLeft class="size-4" />
				返回家
			</a>
			<div class="min-w-0 space-y-2">
				<p class="app-chip bg-white text-primary shadow-sm">{data.space.name}</p>
				<h1 class="text-3xl font-semibold leading-tight">邀请家人</h1>
				<p class="text-sm leading-6 text-muted-foreground">让家人一起看到菜单、确认口味和勾选买菜清单。</p>
			</div>
		</div>
	</section>

	{#if data.createdNow}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">邀请链接已创建，可以复制发给家人。</p>
	{/if}
	{#if data.revokedNow}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">邀请已撤销，原链接不能再加入。</p>
	{/if}
	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="app-soft-panel space-y-4 p-5">
		<span class="flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><UserPlus class="size-6" /></span>
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">把家人加入同一个家庭</h2>
			<p class="text-sm leading-6 text-muted-foreground">链接默认 7 天有效。家人登录或注册后确认加入，就能立即看到这里的菜品、饭单和购物清单。</p>
		</div>
		<form method="post" action="?/create" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }}>
			<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="创建中...">
				<Plus class="size-4" />创建邀请链接
			</Button>
		</form>
	</section>

	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold">邀请记录</h2>
			<span class="text-sm text-muted-foreground">{data.invitations.length} 条</span>
		</div>
		{#if data.invitations.length === 0}
			<div class="app-panel p-6 text-center text-sm leading-6 text-muted-foreground">还没有邀请链接。创建后复制给要加入的家人。</div>
		{:else}
			<div class="space-y-3">
				{#each data.invitations as invitation}
					<article class="app-panel space-y-4 p-4">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 items-center gap-3">
								<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl {invitation.state === 'pending' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}">
									{#if invitation.state === 'accepted'}<Check class="size-5" />{:else if invitation.state === 'revoked'}<XCircle class="size-5" />{:else}<Link2 class="size-5" />{/if}
								</span>
								<div class="min-w-0">
									<p class="font-semibold">{stateLabels[invitation.state]}</p>
									<p class="truncate text-xs text-muted-foreground">有效期至 {formatDate(invitation.expiresAt)}</p>
								</div>
							</div>
							<span class="app-chip {invitation.state === 'pending' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}">成员</span>
						</div>

						{#if invitation.state === 'pending'}
							<div class="grid grid-cols-[1fr_auto] gap-2">
								<Button type="button" onclick={() => copyInvitation(invitation.token, invitation.url)} class="h-11 rounded-2xl">
									{#if copiedToken === invitation.token}<Check class="size-4" />已复制{:else}<Copy class="size-4" />复制链接{/if}
								</Button>
								<form method="post" action="?/revoke" use:enhanceWithFeedback={{ confirmMessage: '撤销后，这个邀请链接将立即失效。确定撤销吗？', pendingLabel: '撤销中...' }}>
									<input type="hidden" name="invitationId" value={invitation.id} />
									<Button type="submit" variant="outline" class="h-11 rounded-2xl bg-white" data-pending-label="撤销中...">撤销</Button>
								</form>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<section class="app-panel flex gap-3 p-4 text-sm leading-6 text-muted-foreground">
		<ShieldCheck class="mt-0.5 size-5 shrink-0 text-primary" />
		<p>邀请页只显示家庭名称和加入状态，不会泄露菜单、菜品或成员信息。</p>
	</section>
</main>

<MobileBottomNav />
