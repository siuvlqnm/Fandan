<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		ArrowLeft,
		Check,
		Copy,
		Crown,
		DoorOpen,
		Link2,
		LogOut,
		Pencil,
		Plus,
		ShieldCheck,
		UserMinus,
		UserPlus,
		UserRound,
		UsersRound,
		XCircle
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let copiedToken = $state<string | null>(null);

	const isOwner = $derived(data.space.role === 'owner');
	const actionValues = $derived((form as { values?: { name?: unknown } } | null)?.values);
	const spaceNameValue = $derived(String(actionValues?.name ?? data.space.name));
	const pendingInvitations = $derived(data.invitations.filter((invitation) => invitation.state === 'pending'));
	const roleLabels = { owner: '所有者', member: '成员' };

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value));

	const copyInvitation = async (token: string, url: string) => {
		await navigator.clipboard.writeText(url);
		copiedToken = token;
		window.setTimeout(() => {
			if (copiedToken === token) copiedToken = null;
		}, 1600);
	};
</script>

<svelte:head><title>我的 / 饭单</title></svelte:head>

<main class="app-page app-bottom-safe" data-testid="workspace-settings">
	<section class="flex items-center gap-3">
		<a href="/app" class="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm" aria-label="返回工作台">
			<ArrowLeft class="size-5" />
		</a>
		<div class="min-w-0">
			<p class="text-xs text-muted-foreground">家庭与账号</p>
			<h1 class="text-2xl font-semibold">我的</h1>
		</div>
	</section>

	{#if data.feedback.saved}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">家庭空间名称已更新。</p>
	{/if}
	{#if data.feedback.created}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">邀请链接已创建，可以复制给家人。</p>
	{/if}
	{#if data.feedback.revoked}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">邀请已撤销。</p>
	{/if}
	{#if data.feedback.removed}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">成员已移除，无法再访问这个家庭空间。</p>
	{/if}
	{#if data.feedback.left}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">已退出原家庭空间，现在显示你的个人空间。</p>
	{/if}
	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="app-soft-panel overflow-hidden">
		<div class="flex items-center gap-4 p-5">
			<span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><UserRound class="size-7" /></span>
			<div class="min-w-0 flex-1">
				<p class="truncate text-xl font-semibold">{data.user.name}</p>
				<p class="truncate text-sm text-muted-foreground">{data.user.email}</p>
			</div>
			<span class="app-chip bg-white text-primary">{roleLabels[data.space.role]}</span>
		</div>
		<div class="border-t border-border/70 bg-white px-5 py-3 text-sm text-muted-foreground">
			当前空间：<span class="font-medium text-foreground">{data.space.name}</span>
		</div>
	</section>

	<section class="app-panel p-5">
		<div class="mb-4 flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Pencil class="size-5" /></span>
			<div><h2 class="text-xl font-semibold">家庭空间</h2><p class="text-sm leading-6 text-muted-foreground">这个名称会显示在所有家庭成员的工作台。</p></div>
		</div>
		{#if isOwner}
			<form method="post" action="?/rename" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-3">
				<div class="space-y-2">
					<Label for="workspace-name">空间名称</Label>
					<Input id="workspace-name" name="name" value={spaceNameValue} maxlength={80} required class="app-input" />
				</div>
				<Button type="submit" class="h-11 w-full rounded-2xl" data-pending-label="保存中...">保存名称</Button>
			</form>
		{:else}
			<div class="rounded-2xl bg-muted p-4 text-sm leading-6"><p class="font-medium">{data.space.name}</p><p class="text-muted-foreground">只有空间所有者可以修改名称。</p></div>
		{/if}
	</section>

	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<div><h2 class="text-xl font-semibold">家庭成员</h2><p class="text-sm text-muted-foreground">当前有 {data.members.length} 位成员</p></div>
			<UsersRound class="size-6 text-primary" />
		</div>
		<div class="app-panel divide-y divide-border/70 overflow-hidden">
			{#each data.members as member}
				<article class="flex items-center gap-3 p-4" data-testid={`member-${member.id}`}>
					<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl {member.role === 'owner' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}">
						{#if member.role === 'owner'}<Crown class="size-5" />{:else}<UserRound class="size-5" />{/if}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex min-w-0 flex-wrap items-center gap-2">
							<p class="truncate font-semibold">{member.name}</p>
							{#if member.userId === data.user.id}<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">你</span>{/if}
						</div>
						<p class="truncate text-xs text-muted-foreground">{member.email}</p>
						<p class="mt-1 text-xs text-muted-foreground">{roleLabels[member.role]} · {formatDate(member.joinedAt)} 加入</p>
					</div>
					{#if isOwner && member.role === 'member'}
						<form method="post" action="?/removeMember" use:enhanceWithFeedback={{ confirmMessage: `确定移除 ${member.name} 吗？对方将立即失去这个家庭空间的访问权限。`, pendingLabel: '移除中...' }}>
							<input type="hidden" name="membershipId" value={member.id} />
							<Button type="submit" variant="ghost" size="sm" class="text-destructive" data-pending-label="移除中..." aria-label={`移除成员 ${member.name}`}>
								<UserMinus class="size-4" />移除
							</Button>
						</form>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	{#if isOwner}
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<div><h2 class="text-xl font-semibold">邀请家人</h2><p class="text-sm text-muted-foreground">链接默认 7 天有效</p></div>
				<UserPlus class="size-6 text-primary" />
			</div>
			<div class="app-panel space-y-4 p-4">
				<form method="post" action="?/createInvitation" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }}>
					<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="创建中..."><Plus class="size-4" />创建邀请链接</Button>
				</form>
				{#if pendingInvitations.length === 0}
					<div class="rounded-2xl border border-dashed p-5 text-center text-sm leading-6 text-muted-foreground">没有待处理邀请。需要时创建一条发给家人。</div>
				{:else}
					<div class="space-y-3">
						{#each pendingInvitations as invitation}
							<article class="rounded-2xl bg-muted/70 p-3" data-testid={`invitation-${invitation.id}`}>
								<div class="mb-3 flex items-center gap-3">
									<span class="flex size-9 items-center justify-center rounded-xl bg-white text-primary"><Link2 class="size-4" /></span>
									<div class="min-w-0 flex-1"><p class="font-medium">等待加入</p><p class="truncate text-xs text-muted-foreground">{formatDate(invitation.expiresAt)} 到期</p></div>
								</div>
								<div class="grid grid-cols-[1fr_auto] gap-2">
									<Button type="button" onclick={() => copyInvitation(invitation.token, invitation.url)} class="h-10 rounded-xl">
										{#if copiedToken === invitation.token}<Check class="size-4" />已复制{:else}<Copy class="size-4" />复制链接{/if}
									</Button>
									<form method="post" action="?/revokeInvitation" use:enhanceWithFeedback={{ confirmMessage: '撤销后，这个邀请链接将立即失效。确定撤销吗？', pendingLabel: '撤销中...' }}>
										<input type="hidden" name="invitationId" value={invitation.id} />
										<Button type="submit" variant="outline" class="h-10 rounded-xl bg-white" data-pending-label="撤销中..."><XCircle class="size-4" />撤销</Button>
									</form>
								</div>
							</article>
						{/each}
					</div>
				{/if}
				<a href="/app/invitations" class="block text-center text-sm font-medium text-muted-foreground">查看全部邀请记录</a>
			</div>
		</section>
	{/if}

	<section class="app-panel space-y-4 p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><ShieldCheck class="size-5" /></span>
			<div><h2 class="text-lg font-semibold">空间权限</h2><p class="text-sm leading-6 text-muted-foreground">{isOwner ? '所有者负责成员、邀请和危险操作。转让所有权功能上线前，所有者不能退出。' : '成员可以共同维护菜品、饭单和购物清单，也可以随时退出当前家庭空间。'}</p></div>
		</div>
		{#if !isOwner}
			<form method="post" action="?/leave" use:enhanceWithFeedback={{ confirmMessage: `确定退出「${data.space.name}」吗？退出后需要新的邀请才能再次加入。`, pendingLabel: '退出中...' }}>
				<Button type="submit" variant="outline" class="h-11 w-full rounded-2xl border-destructive/30 bg-white text-destructive" data-pending-label="退出中..."><DoorOpen class="size-4" />退出家庭空间</Button>
			</form>
		{/if}
	</section>

	<form method="post" action="/logout">
		<Button type="submit" variant="outline" class="h-11 w-full rounded-2xl bg-white text-muted-foreground"><LogOut class="size-4" />退出登录</Button>
	</form>
</main>

<MobileBottomNav />
