<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import heroImage from '$lib/assets/meal-ui/hero.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import {
		ArrowRightLeft,
		Check,
		ChefHat,
		ChevronDown,
		CircleCheck,
		Copy,
		Crown,
		DoorOpen,
		Link2,
		LogOut,
		Pencil,
		Plus,
		HousePlus,
		ShieldCheck,
		Target,
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
	const workspaceActionValues = $derived((form as { values?: { workspaceName?: unknown } } | null)?.values);
	const workspaceNameValue = $derived(String(workspaceActionValues?.workspaceName ?? ''));
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

<svelte:head><title>家 / 饭单</title></svelte:head>

<main class="app-client-page app-bottom-safe" data-testid="workspace-settings">
	<header class="app-topbar">
		<a href="/app" class="app-brand">
			<span class="app-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<span class="block text-2xl font-bold">家</span>
				<span class="block truncate text-sm text-muted-foreground">家庭、偏好和账号</span>
			</span>
		</a>
		<span class="app-icon-action overflow-hidden p-0"><img src={avatarImage} alt="" class="h-full w-full object-cover" /></span>
	</header>

	{#if data.feedback.saved}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">家庭名称已更新。</p>
	{/if}
	{#if data.feedback.workspaceCreated}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">新家庭已创建并切换，接下来新增的内容都会保存在这里。</p>
	{/if}
	{#if data.feedback.workspaceSwitched}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">家庭已切换，页面数据已刷新。</p>
	{/if}
	{#if data.feedback.created}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">邀请链接已创建，可以复制给家人。</p>
	{/if}
	{#if data.feedback.revoked}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">邀请已撤销。</p>
	{/if}
	{#if data.feedback.removed}
		<p class="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">成员已移除，无法再访问这个家庭。</p>
	{/if}
	{#if data.feedback.left}
		<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">已退出原家庭，现在显示你的个人家庭。</p>
	{/if}
	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="app-hero overflow-hidden">
		<div class="relative min-h-36 p-5">
			<img src={heroImage} alt="" class="absolute inset-y-0 right-0 h-full w-40 object-cover opacity-90 [mask-image:linear-gradient(90deg,transparent,black_35%)]" />
			<div class="relative max-w-[14rem] space-y-3">
				<p class="app-chip bg-white/85 text-primary">{roleLabels[data.space.role]}</p>
				<h1 class="text-4xl font-black leading-[1.05] tracking-normal">把家里的吃饭习惯收好</h1>
				<p class="text-sm leading-6 text-muted-foreground">成员、偏好、邀请和账号设置都在这里。</p>
			</div>
		</div>
		<div class="flex items-center gap-4 border-t border-border/70 bg-white/80 p-5">
			<span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-primary shadow-sm"><img src={avatarImage} alt="" class="h-full w-full object-cover" /></span>
				<div class="min-w-0 flex-1">
					<p class="truncate text-xl font-semibold">{data.user.name}</p>
					<p class="truncate text-sm text-muted-foreground">{data.user.email}</p>
				</div>
			<span class="app-chip bg-secondary text-primary">{data.space.name}</span>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">家庭工具</h2>
		<div class="grid grid-cols-3 gap-2">
			<a href="/app/dishes" class="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white p-3 text-center text-sm font-medium"><ChefHat class="size-5 text-primary" />常做菜</a>
			<a href="/app/targets" class="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white p-3 text-center text-sm font-medium"><Target class="size-5 text-primary" />偏好档案</a>
			<a href={isOwner ? '/app/invitations' : '#family-members'} class="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white p-3 text-center text-sm font-medium"><UsersRound class="size-5 text-primary" />邀请家人</a>
		</div>
	</section>

	<div id="current-family" class="pt-2"><p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">家庭设置</p><h2 class="text-xl font-semibold">当前家庭</h2><p class="text-sm text-muted-foreground">{data.space.name}</p></div>

	<section class="space-y-3" data-testid="workspace-switcher">
		{#if data.workspaces.length > 1}
			<div class="flex items-center justify-between">
				<div><h2 class="text-xl font-semibold">切换家庭</h2><p class="text-sm text-muted-foreground">切换后，饭单和菜品会跟着更新</p></div>
				<ArrowRightLeft class="size-6 text-primary" />
			</div>
			<div class="app-panel divide-y divide-border/70 overflow-hidden">
				{#each data.workspaces as workspace}
					<article class="flex items-center gap-3 p-4 {workspace.isCurrent ? 'bg-secondary/35' : ''}" data-testid={`workspace-${workspace.id}`}>
						<span class="flex size-11 shrink-0 items-center justify-center rounded-2xl {workspace.isCurrent ? 'bg-white text-primary shadow-sm' : 'bg-muted text-muted-foreground'}">
							{#if workspace.isCurrent}<CircleCheck class="size-5" />{:else}<UsersRound class="size-5" />{/if}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold">{workspace.name}</p>
							<p class="text-xs text-muted-foreground">{roleLabels[workspace.role]}</p>
						</div>
						{#if workspace.isCurrent}
							<span class="app-chip bg-white text-primary">当前</span>
						{:else}
							<form method="post" action="?/switchWorkspace" use:enhanceWithFeedback={{ pendingLabel: '切换中...' }}>
								<input type="hidden" name="spaceId" value={workspace.id} />
								<Button type="submit" variant="outline" size="sm" class="h-11 rounded-xl bg-white" data-pending-label="切换中..." aria-label={`切换到 ${workspace.name}`}>切换</Button>
							</form>
						{/if}
					</article>
				{/each}
			</div>
		{/if}

		<details class="app-panel group overflow-hidden">
			<summary class="flex min-h-12 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><HousePlus class="size-5" /></span>
				<div class="min-w-0 flex-1">
					<p class="font-semibold">{data.workspaces.length > 1 ? '创建另一个家庭' : '需要另一个家庭？'}</p>
					<p class="text-sm text-muted-foreground">不同家庭或场景的数据彼此独立</p>
				</div>
				<ChevronDown class="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<form method="post" action="?/createWorkspace" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }} class="space-y-3 border-t border-border/70 p-4">
				<div class="space-y-2">
					<Label for="new-workspace-name">新家庭名称</Label>
					<Input id="new-workspace-name" name="workspaceName" value={workspaceNameValue} maxlength={80} placeholder="例如：爸妈家" required class="app-input h-11" />
				</div>
				<p class="text-xs leading-5 text-muted-foreground">创建后会自动切换，原家庭内容不会受到影响。</p>
				<Button type="submit" class="h-11 w-full rounded-2xl" data-pending-label="创建中..."><Plus class="size-4" />创建并切换</Button>
			</form>
		</details>
	</section>

	<section class="app-panel p-5">
		<div class="mb-4 flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Pencil class="size-5" /></span>
			<div><h2 class="text-xl font-semibold">家庭名称</h2><p class="text-sm leading-6 text-muted-foreground">这个名称会显示给所有家庭成员。</p></div>
		</div>
		{#if isOwner}
			<form method="post" action="?/rename" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-3">
				<div class="space-y-2">
					<Label for="workspace-name">家庭名称</Label>
					<Input id="workspace-name" name="name" value={spaceNameValue} maxlength={80} required class="app-input h-11" />
				</div>
				<Button type="submit" class="h-11 w-full rounded-2xl" data-pending-label="保存中...">保存名称</Button>
			</form>
		{:else}
			<div class="rounded-2xl bg-muted p-4 text-sm leading-6"><p class="font-medium">{data.space.name}</p><p class="text-muted-foreground">只有家庭所有者可以修改名称。</p></div>
		{/if}
	</section>

	<section id="family-members" class="space-y-3">
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
						<form method="post" action="?/removeMember" use:enhanceWithFeedback={{ confirmMessage: `确定移除 ${member.name} 吗？对方将立即失去这个家庭的访问权限。`, pendingLabel: '移除中...' }}>
							<input type="hidden" name="membershipId" value={member.id} />
							<Button type="submit" variant="ghost" size="sm" class="h-11 text-destructive" data-pending-label="移除中..." aria-label={`移除成员 ${member.name}`}>
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
									<Button type="button" onclick={() => copyInvitation(invitation.token, invitation.url)} class="h-11 rounded-xl">
										{#if copiedToken === invitation.token}<Check class="size-4" />已复制{:else}<Copy class="size-4" />复制链接{/if}
									</Button>
									<form method="post" action="?/revokeInvitation" use:enhanceWithFeedback={{ confirmMessage: '撤销后，这个邀请链接将立即失效。确定撤销吗？', pendingLabel: '撤销中...' }}>
										<input type="hidden" name="invitationId" value={invitation.id} />
										<Button type="submit" variant="outline" class="h-11 rounded-xl bg-white" data-pending-label="撤销中..."><XCircle class="size-4" />撤销</Button>
									</form>
								</div>
							</article>
						{/each}
					</div>
				{/if}
				<a href="/app/invitations" class="flex min-h-11 items-center justify-center text-center text-sm font-medium text-muted-foreground">查看全部邀请记录</a>
			</div>
		</section>
	{/if}

	<section class="app-panel space-y-4 p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><ShieldCheck class="size-5" /></span>
			<div><h2 class="text-lg font-semibold">家庭权限</h2><p class="text-sm leading-6 text-muted-foreground">{isOwner ? '所有者负责成员、邀请和危险操作。转让所有权功能上线前，所有者不能退出。' : '成员可以共同维护菜品、饭单和购物清单，也可以随时退出当前家庭。'}</p></div>
		</div>
		{#if !isOwner}
			<form method="post" action="?/leave" use:enhanceWithFeedback={{ confirmMessage: `确定退出「${data.space.name}」吗？退出后需要新的邀请才能再次加入。`, pendingLabel: '退出中...' }}>
				<Button type="submit" variant="outline" class="h-11 w-full rounded-2xl border-destructive/30 bg-white text-destructive" data-pending-label="退出中..."><DoorOpen class="size-4" />退出这个家庭</Button>
			</form>
		{/if}
	</section>

	<form method="post" action="/logout">
		<Button type="submit" variant="outline" class="h-11 w-full rounded-2xl bg-white text-muted-foreground"><LogOut class="size-4" />退出登录</Button>
	</form>
</main>

<MobileBottomNav />
