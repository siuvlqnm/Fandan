<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import avatarImage from '$lib/assets/meal-ui/avatar.jpg';
	import logoImage from '$lib/assets/meal-ui/logo.png';
	import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Link2, Plus, ShieldCheck, UserPlus, XCircle } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let copiedToken = $state<string | null>(null);

	const stateLabels = {
		pending: '等待加入',
		accepted: '已加入',
		expired: '已过期',
		revoked: '已撤销'
	};

	const statePill = (state: PageData['invitations'][number]['state']) =>
		state === 'accepted' ? 'green' : state === 'pending' ? 'orange' : 'muted';

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

<main class="fd-screen" data-testid="invitations-page">
	<header class="fd-topbar with-back">
		<a href="/app/settings" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>邀请家人</h1>
				<p>{data.space.name}</p>
			</span>
		</a>
		<span class="fd-logo"><img src={logoImage} alt="" /></span>
	</header>

	{#if data.createdNow}
		<p class="fd-state-pill green" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">邀请链接已创建，可以复制发给家人。</p>
	{/if}
	{#if data.revokedNow}
		<p class="fd-state-pill muted" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">邀请已撤销，原链接不能再加入。</p>
	{/if}
	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	<!-- 邀请说明 + 创建 -->
	<section class="fd-hero-card" aria-label="邀请家人" style="margin-top:14px;">
		<div class="fd-hero-copy min-w-0">
			<h3>邀请家人一起用</h3>
			<p>发一个链接，对方加入后就能一起维护常做菜、安排饭和勾选买菜清单。</p>
			<div class="mini">
				<span class="fd-pill green">7 天有效</span>
				<span class="fd-pill">可随时撤销</span>
			</div>
			<form method="post" action="?/create" use:enhanceWithFeedback={{ pendingLabel: '创建中...' }} style="margin-top:10px;">
				<button type="submit" class="fd-primary-btn" data-pending-label="创建中..."><Plus class="size-4" /> 创建邀请链接</button>
			</form>
		</div>
		<div class="fd-hero-media"><img src={avatarImage} alt="家庭晚餐" /></div>
	</section>

	<!-- 邀请记录 -->
	<section class="fd-section-head">
		<div>
			<h3>邀请记录</h3>
			<p>{data.invitations.length} 条 · 7 天有效</p>
		</div>
	</section>

	{#if data.invitations.length === 0}
		<div class="fd-empty" style="margin-top:14px;">
			<span class="emoji"><UserPlus class="size-8" /></span>
			<h3>还没有邀请链接</h3>
			<p>创建后复制给要加入的家人，对方登录或注册就能进入这个家庭。</p>
		</div>
	{:else}
		<section class="fd-card-list">
			{#each data.invitations as invitation (invitation.id)}
				<article class="fd-soft-card" data-testid={`invitation-${invitation.id}`}>
					<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
						<span class="fd-avatar-text" style="width:40px;height:40px;" data-accent={invitation.state === 'pending' ? 'green' : ''}>
							{#if invitation.state === 'accepted'}<CheckCircle2 class="size-5" />
							{:else if invitation.state === 'revoked'}<XCircle class="size-5" />
							{:else}<Link2 class="size-5" />{/if}
						</span>
						<div class="min-w-0 flex-1">
							<strong style="display:block;font-size:15px;font-weight:850;">{stateLabels[invitation.state]}</strong>
							<span style="display:block;margin-top:2px;font-size:12px;color:var(--fd-muted);">{formatDate(invitation.expiresAt)} 到期</span>
						</div>
						<span class="fd-state-pill {statePill(invitation.state)}">{stateLabels[invitation.state]}</span>
					</div>
					{#if invitation.state === 'pending'}
						<div style="display:grid;grid-template-columns:1fr auto;gap:8px;">
							<button type="button" class="fd-primary-btn" onclick={() => copyInvitation(invitation.token, invitation.url)}>
								{#if copiedToken === invitation.token}<Check class="size-4" /> 已复制{:else}<Copy class="size-4" /> 复制链接{/if}
							</button>
							<form method="post" action="?/revoke" use:enhanceWithFeedback={{ confirmMessage: '撤销后，这个邀请链接将立即失效。确定撤销吗？', pendingLabel: '撤销中...' }}>
								<input type="hidden" name="invitationId" value={invitation.id} />
								<button type="submit" class="fd-ghost-btn" style="color:var(--fd-coral);" data-pending-label="撤销中..."><XCircle class="size-4" /> 撤销</button>
							</form>
						</div>
					{:else}
						<p style="margin:0;font-size:12px;color:var(--fd-muted);">{invitation.state === 'accepted' ? '家人已加入这个家庭。' : invitation.state === 'expired' ? '链接已过期，可创建新的邀请。' : '已撤销，链接不再可用。'}</p>
					{/if}
				</article>
			{/each}
		</section>
	{/if}

	<!-- 隐私 -->
	<section class="fd-soft-card" style="display:flex;align-items:flex-start;gap:10px;">
		<ShieldCheck class="size-5 shrink-0" style="color:var(--fd-green);margin-top:2px;" />
		<p style="margin:0;font-size:13px;color:#595550;line-height:1.45;">邀请页只显示家庭名称和加入状态，不会泄露菜单、菜品或成员信息。</p>
	</section>

	<a href="/app/settings" class="fd-ghost-btn block" style="margin-top:10px;">回「家」设置 <ArrowRight class="size-4" /></a>
</main>

<MobileBottomNav />
