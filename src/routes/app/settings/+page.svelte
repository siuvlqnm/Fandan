<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import heroImage from '$lib/assets/meal-ui/hero.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import {
		ArrowRight,
		ChefHat,
		Check,
		ChevronDown,
		CircleCheck,
		Copy,
		Crown,
		DoorOpen,
		HousePlus,
		Link2,
		LogOut,
		Pencil,
		Plus,
		ShieldCheck,
		UserMinus,
		UserPlus,
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

<main class="fd-screen" data-testid="home-settings">
	<header class="fd-topbar">
		<a href="/app" class="fd-brand">
			<span class="fd-logo"><img src={logoImage} alt="" /></span>
			<span class="min-w-0 leading-tight">
				<h1>家</h1>
				<p>家庭、偏好和账号</p>
			</span>
		</a>
		<div class="fd-actions">
			<span class="fd-avatar"><img src={avatarImage} alt="" /></span>
		</div>
	</header>

	<!-- 当前家庭 profile-card -->
	<section class="fd-profile-card" aria-label="当前家庭">
		<img src={heroImage} alt="家里的餐桌" />
		<div class="min-w-0">
			<h3>{data.space.name}</h3>
			<p>{data.members.length} 位成员 · {roleLabels[data.space.role]}</p>
		</div>
		<span class="fd-state-pill green">当前</span>
	</section>

	{#if data.feedback.saved || data.feedback.workspaceCreated || data.feedback.workspaceSwitched || data.feedback.created || data.feedback.left}
		<p class="fd-state-pill green" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">
			{#if data.feedback.saved}家庭名称已更新。{:else if data.feedback.workspaceCreated}新家庭已创建并切换。{:else if data.feedback.workspaceSwitched}家庭已切换，页面已刷新。{:else if data.feedback.created}邀请链接已创建，可以复制给家人。{:else if data.feedback.left}已退出原家庭，现在显示你的个人家庭。{/if}
		</p>
	{/if}
	{#if data.feedback.revoked || data.feedback.removed}
		<p class="fd-state-pill muted" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">
			{#if data.feedback.revoked}邀请已撤销。{:else if data.feedback.removed}成员已移除，无法再访问这个家庭。{/if}
		</p>
	{/if}
	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	<!-- 家庭工具 -->
	<section class="fd-section-head">
		<div>
			<h3>家庭工具</h3>
			<p>常用但不抢首页</p>
		</div>
	</section>
	<section class="fd-tool-grid" aria-label="家庭工具">
		<a class="fd-tool" href="/app/targets"><UsersRound class="size-6" /><span>给谁做饭</span></a>
		<a class="fd-tool" href="/app/dishes"><ChefHat class="size-6" /><span>常做菜</span></a>
		<a class="fd-tool" href={isOwner ? '/app/invitations' : '#family-members'}><UserPlus class="size-6" /><span>邀请家人</span></a>
	</section>

	<!-- 当前家庭：切换 / 新建 / 改名 -->
	<section class="fd-section-head" id="current-family">
		<div>
			<h3>当前家庭</h3>
			<p>家人共享的菜、安排和买菜清单都在这里</p>
		</div>
	</section>

	<section class="fd-soft-card" style="padding:0;" data-testid="workspace-switcher">
		{#if data.workspaces.length > 1}
			<div style="display:grid;gap:0;">
				{#each data.workspaces as workspace}
					<article class="fd-setting-row" style="border-bottom:1px solid var(--fd-line-soft);" data-testid={`workspace-${workspace.id}`}>
						<span class="fd-avatar-text" style="width:42px;height:42px;" data-accent={workspace.isCurrent ? 'green' : ''}>
							{#if workspace.isCurrent}<CircleCheck class="size-5" />{:else}<UsersRound class="size-5" />{/if}
						</span>
						<div class="meta min-w-0">
							<strong>{workspace.name}</strong>
							<span>{roleLabels[workspace.role]}</span>
						</div>
						{#if workspace.isCurrent}
							<span class="fd-state-pill green">当前</span>
						{:else}
							<form method="post" action="?/switchWorkspace" use:enhanceWithFeedback={{ pendingLabel: '切换中...' }}>
								<input type="hidden" name="spaceId" value={workspace.id} />
								<button type="submit" class="fd-ghost-btn" style="height:38px;font-size:13px;" data-pending-label="切换中..." aria-label={`切换到 ${workspace.name}`}>切换</button>
							</form>
						{/if}
					</article>
				{/each}
			</div>
		{/if}

		{#if isOwner}
			<form method="post" action="?/rename" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} style={`padding:16px;display:grid;gap:10px;${data.workspaces.length > 1 ? 'border-top:1px solid var(--fd-line-soft);' : ''}`}>
				<div class="space-y-2">
					<Label for="workspace-name" style="font-size:12px;font-weight:700;">家庭名称</Label>
					<Input id="workspace-name" name="name" value={spaceNameValue} maxlength={80} required class="fd-text-input" />
				</div>
				<button type="submit" class="fd-primary-btn block" data-pending-label="保存中..."><Pencil class="size-4" /> 保存名称</button>
			</form>
		{:else}
			<div style="padding:16px;font-size:13px;color:var(--fd-muted);">
				<strong style="display:block;font-weight:800;color:#38332e;">{data.space.name}</strong>
				<span>只有家庭所有者可以修改名称。</span>
			</div>
		{/if}
	</section>

	<details class="fd-soft-card" style="margin-top:12px;padding:0;">
		<summary style="display:flex;min-height:48px;cursor:pointer;list-style:none;align-items:center;gap:11px;padding:12px 16px;font-size:14px;font-weight:700;color:#4f4943;">
			<span class="fd-avatar-text" style="width:42px;height:42px;"><HousePlus class="size-5" /></span>
			<span class="min-w-0 flex-1">
				<strong style="display:block;font-size:15px;font-weight:850;">{data.workspaces.length > 1 ? '创建另一个家庭' : '需要另一个家庭？'}</strong>
				<span style="display:block;font-size:12px;color:var(--fd-muted);">不同家庭的数据彼此独立</span>
			</span>
			<ChevronDown class="size-5" style="color:var(--fd-muted);" />
		</summary>
		<form method="post" action="?/createWorkspace" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }} style="border-top:1px solid var(--fd-line-soft);padding:16px;display:grid;gap:10px;">
			<div class="space-y-2">
				<Label for="new-workspace-name" style="font-size:12px;font-weight:700;">新家庭名称</Label>
				<Input id="new-workspace-name" name="workspaceName" value={workspaceNameValue} maxlength={80} placeholder="例如：爸妈家" required class="fd-text-input" />
			</div>
			<button type="submit" class="fd-primary-btn block" data-pending-label="创建中..."><Plus class="size-4" /> 创建并切换</button>
		</form>
	</details>

	<!-- 家庭成员 -->
	<section class="fd-section-head" id="family-members">
		<div>
			<h3>家庭成员</h3>
			<p>谁在一起维护饭单 · {data.members.length} 位</p>
		</div>
		{#if isOwner}<a href="/app/invitations" class="fd-ghost-btn"><UserPlus class="size-4" /> 邀请</a>{/if}
	</section>
	<section class="fd-card-list">
		{#each data.members as member (member.id)}
			<article class="fd-member-row" data-testid={`member-${member.id}`}>
				<img src={avatarImage} alt={member.name} />
				<span class="min-w-0">
					<strong>{member.name}{#if member.userId === data.user.id}（你）{/if}</strong>
					<span class="sub">{member.email} · {roleLabels[member.role]} · {formatDate(member.joinedAt)} 加入</span>
				</span>
				{#if member.role === 'owner'}
					<span class="fd-state-pill green"><Crown class="size-3.5" /> 所有者</span>
				{:else}
					<span class="fd-state-pill">成员</span>
					{#if isOwner}
						<form method="post" action="?/removeMember" use:enhanceWithFeedback={{ confirmMessage: `确定移除 ${member.name} 吗？对方将立即失去这个家庭的访问权限。`, pendingLabel: '移除中...' }}>
							<input type="hidden" name="membershipId" value={member.id} />
							<button type="submit" class="fd-icon-del" style="width:34px;height:34px;font-size:16px;" aria-label={`移除成员 ${member.name}`} data-pending-label="移除中...">
								<UserMinus class="size-4" />
							</button>
						</form>
					{/if}
				{/if}
			</article>
		{/each}
	</section>

	<!-- 邀请家人 -->
	{#if isOwner}
		<section class="fd-hero-card" id="invite" aria-label="邀请家人" style="margin-top:16px;">
			<div class="fd-hero-copy min-w-0">
				<h3>邀请家人一起用</h3>
				<p>发一个链接，对方加入后就能一起维护常做菜和买菜清单。</p>
				<div class="mini">
					<span class="fd-pill green">7 天有效</span>
					<span class="fd-pill">可随时撤销</span>
					{#if pendingInvitations.length > 0}<span class="fd-pill orange">{pendingInvitations.length} 待加入</span>{/if}
				</div>
				<form method="post" action="?/createInvitation" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }} style="margin-top:10px;">
					<button type="submit" class="fd-primary-btn" data-pending-label="创建中..."><Plus class="size-4" /> 创建邀请链接</button>
				</form>
			</div>
			<div class="fd-hero-media"><img src={avatarImage} alt="家庭晚餐" /></div>
		</section>

		{#if pendingInvitations.length > 0}
			<section class="fd-card-list" style="margin-top:12px;">
				{#each pendingInvitations as invitation (invitation.id)}
					<article class="fd-soft-card" data-testid={`invitation-${invitation.id}`}>
						<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
							<span class="fd-avatar-text" style="width:36px;height:36px;" data-accent="green"><Link2 class="size-4" /></span>
							<div class="min-w-0 flex-1">
								<strong style="display:block;font-size:14px;font-weight:850;">等待加入</strong>
								<span style="display:block;font-size:12px;color:var(--fd-muted);">{formatDate(invitation.expiresAt)} 到期</span>
							</div>
						</div>
						<div style="display:grid;grid-template-columns:1fr auto;gap:8px;">
							<button type="button" class="fd-primary-btn" onclick={() => copyInvitation(invitation.token, invitation.url)}>
								{#if copiedToken === invitation.token}<Check class="size-4" /> 已复制{:else}<Copy class="size-4" /> 复制链接{/if}
							</button>
							<form method="post" action="?/revokeInvitation" use:enhanceWithFeedback={{ confirmMessage: '撤销后，这个邀请链接将立即失效。确定撤销吗？', pendingLabel: '撤销中...' }}>
								<input type="hidden" name="invitationId" value={invitation.id} />
								<button type="submit" class="fd-ghost-btn" style="color:var(--fd-coral);" data-pending-label="撤销中..."><XCircle class="size-4" /> 撤销</button>
							</form>
						</div>
					</article>
				{/each}
			</section>
		{/if}
		<a href="/app/invitations" class="fd-ghost-btn block" style="margin-top:10px;">查看全部邀请记录 <ArrowRight class="size-4" /></a>
	{/if}

	<!-- 账号 -->
	<section class="fd-section-head">
		<div>
			<h3>账号</h3>
			<p>登录、家庭权限和数据</p>
		</div>
	</section>
	<section class="fd-soft-card" style="padding:4px 16px;">
		<div class="fd-setting-row">
			<div class="meta"><strong>我的账号</strong><span>{data.user.email}</span></div>
			<span class="end" style="color:var(--fd-muted);font-size:13px;">{data.user.name}</span>
		</div>
		<div class="fd-setting-row">
			<div class="meta"><strong>当前家庭</strong><span>{data.space.name}</span></div>
			<span class="fd-state-pill green">{roleLabels[data.space.role]}</span>
		</div>
		{#if data.workspaces.length > 1}
			<div class="fd-setting-row">
				<div class="meta"><strong>切换家庭</strong><span>有 {data.workspaces.length} 个家庭</span></div>
				<a href="#current-family" class="end" style="color:var(--fd-green-deep);font-size:13px;font-weight:700;">去切换</a>
			</div>
		{/if}
	</section>

	<!-- 家庭权限 -->
	<section class="fd-section-head">
		<div>
			<h3>家庭权限</h3>
			<p>{isOwner ? '所有者负责成员、邀请和危险操作' : '成员可共同维护，也可随时退出'}</p>
		</div>
	</section>
	<section class="fd-soft-card" style="display:flex;align-items:flex-start;gap:10px;">
		<ShieldCheck class="size-5 shrink-0" style="color:var(--fd-green);margin-top:2px;" />
		<p style="margin:0;font-size:13px;color:#595550;line-height:1.45;">
			{isOwner ? '转让所有权功能上线前，所有者不能退出。需要时可以创建另一个家庭。' : '你可以共同维护菜品、饭单和购物清单，也可以随时退出当前家庭。'}
		</p>
	</section>
	{#if !isOwner}
		<form method="post" action="?/leave" use:enhanceWithFeedback={{ confirmMessage: `确定退出「${data.space.name}」吗？退出后需要新的邀请才能再次加入。`, pendingLabel: '退出中...' }} style="margin-top:10px;">
			<button type="submit" class="fd-danger-btn block" data-pending-label="退出中..."><DoorOpen class="size-4" /> 退出这个家庭</button>
		</form>
	{/if}

	<!-- 退出登录 -->
	<section class="fd-soft-card" style="padding:4px 16px;margin-top:12px;">
		<form method="post" action="/logout" style="display:contents;">
			<button type="submit" class="fd-setting-row" style="width:100%;border:0;background:transparent;cursor:pointer;font:inherit;text-align:left;">
				<div class="meta"><strong style="color:var(--fd-coral);">退出登录</strong><span>不影响其他成员</span></div>
				<LogOut class="size-5" style="color:var(--fd-coral);" />
			</button>
		</form>
	</section>
</main>

<MobileBottomNav />
