<script lang="ts">
	import DishVisual from '$lib/components/dish-visual.svelte';
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import FlowSteps from '$lib/components/flow-steps.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		CheckCircle2,
		Copy,
		ExternalLink,
		Heart,
		Link2,
		MoreHorizontal,
		Plus,
		RefreshCw,
		Search,
		Share2,
		ShoppingCart,
		ShieldOff,
		Star,
		ThumbsDown,
		Trash2,
		UsersRound
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Panel = 'menu' | 'confirm' | 'shopping' | 'edit';

	let activePanel = $state<Panel>('menu');
	let copiedShareId = $state<string | null>(null);
	let addDishQuery = $state('');
	let replacementDishId = $state('');

	$effect(() => {
		activePanel = data.initialPanel as Panel;
	});

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const isArchived = $derived(data.mealPlan.status === 'archived');
	const defaultDate = $derived(data.mealPlan.startDate ?? '');
	const currentItem = $derived(data.mealPlan.items[0] ?? null);
	const defaultItemDate = $derived(currentItem?.plannedDate ?? defaultDate);
	const defaultItemSlot = $derived(currentItem?.mealSlot ?? '');
	const defaultItemServings = $derived(currentItem?.servings ?? data.target?.peopleCount ?? 1);
	const feedbackTotals = $derived(data.feedbackSummary.totals);
	const dishCount = $derived(data.groups.reduce((total, group) => total + group.items.length, 0));
	const shoppingCount = $derived(data.shoppingList?.items.length ?? 0);
	const shoppingCompletionLabel = $derived(`${data.shoppingSummary.checked}/${data.shoppingSummary.total}`);
	const shoppingCompletionPercent = $derived(
		data.shoppingSummary.total === 0 ? 0 : Math.round((data.shoppingSummary.checked / data.shoppingSummary.total) * 100)
	);
	const activeShare = $derived(data.shareLinks.find((shareLink) => shareLink.active) ?? null);
	const activeShareUrl = $derived(activeShare ? `${data.origin}${activeShare.path}` : '');
	const canConfirmMealPlan = $derived(!isArchived && data.mealPlan.status !== 'confirmed' && data.mealPlan.status !== 'completed');
	const formatShoppingTime = (value: string | null) => {
		if (!value) return '';
		const normalized = value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
		return normalized.length >= 16 ? normalized.slice(5, 16) : normalized;
	};
	const shoppingActorLabel = (item: NonNullable<PageData['shoppingList']>['items'][number]) => {
		if (item.checked && item.checkedBy) {
			const timeLabel = formatShoppingTime(item.checkedAt);
			return timeLabel ? `${item.checkedBy.name} 标记已买 · ${timeLabel}` : `${item.checkedBy.name} 标记已买`;
		}
		if (item.updatedBy) return `${item.updatedBy.name} 更新`;
		if (item.createdBy) return `${item.createdBy.name} 添加`;
		return '购物项';
	};
	const formatShareExpiry = (value: string | null) =>
		value
			? new Intl.DateTimeFormat('zh-CN', {
					dateStyle: 'medium',
					timeStyle: 'short',
					timeZone: 'Asia/Shanghai'
				}).format(new Date(value))
			: '永久有效';
	const sharePermissionSummary = (shareLink: { canFeedback: boolean; canConfirm: boolean }) => {
		if (shareLink.canFeedback && shareLink.canConfirm) return '可反馈，可最终确认';
		if (shareLink.canFeedback) return '仅收集反馈';
		if (shareLink.canConfirm) return '仅允许最终确认';
		return '仅查看菜单';
	};
	const flowStateClass = (tone: string) =>
		tone === 'attention'
			? 'fd-state-pill attention'
			: tone === 'success'
				? 'fd-state-pill green'
				: tone === 'muted'
					? 'fd-state-pill muted'
					: 'fd-state-pill';
	const selectClass = 'fd-select';
	const textAreaClass = 'fd-textarea';
	const filteredAddDishes = $derived.by(() => {
		const query = addDishQuery.trim().toLowerCase();
		const source = query
			? data.dishes.filter((dish) => {
					const haystack = `${dish.name} ${dish.category ?? ''} ${dish.ingredients.map((ingredient) => ingredient.name).join(' ')}`.toLowerCase();
					return haystack.includes(query);
				})
			: data.dishes;
		return source.slice(0, 30);
	});
	const shareExpiryOptions = [
		{ value: 'never', label: '永久有效' },
		{ value: '24h', label: '24 小时' },
		{ value: '3d', label: '3 天' },
		{ value: '7d', label: '7 天' },
		{ value: 'custom', label: '自定义日期' }
	];
	const panels = $derived<{ id: Panel; label: string; helper: string }[]>([
		{ id: 'menu', label: '吃什么', helper: `${dishCount} 道菜` },
		{ id: 'confirm', label: '确认', helper: `${data.feedbackSummary.total} 条反馈` },
		{ id: 'shopping', label: '买什么', helper: shoppingCount ? `${shoppingCount} 项` : '待生成' },
		{ id: 'edit', label: '编辑', helper: '信息和加菜' }
	]);

	const copyShareLink = async (shareLinkId: string, url: string) => {
		await navigator.clipboard.writeText(url);
		copiedShareId = shareLinkId;
		window.setTimeout(() => {
			if (copiedShareId === shareLinkId) copiedShareId = null;
		}, 1800);
	};
	const showFeedbackPanel = () => {
		activePanel = 'confirm';
		requestAnimationFrame(() => {
			document.getElementById('meal-plan-feedback')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
		});
	};
	const primaryAction = $derived(
		data.mealPlan.flow.step === 'confirm' && !activeShare
			? { kind: 'createShare' as const }
			: data.mealPlan.flow.step === 'confirm'
				? { kind: 'reviewConfirm' as const }
				: data.mealPlan.flow.step === 'done'
					? { kind: 'done' as const }
				: data.mealPlan.flow.step === 'shop' && data.shoppingList
					? { kind: 'goShop' as const }
					: data.mealPlan.flow.step === 'shop'
						? { kind: 'generateShop' as const }
						: { kind: 'arrange' as const }
	);
</script>

<svelte:head>
	<title>{data.mealPlan.title} / 饭单</title>
</svelte:head>

<main class="fd-screen">
	<header class="fd-topbar with-back">
		<a href="/app/meal-plans" class="fd-brand with-back">
			<span class="fd-back-btn"><ArrowLeft class="size-5" /></span>
			<span class="min-w-0 leading-tight">
				<h1>这顿饭</h1>
				<p>安排 → 确认 → 买菜 → 完成</p>
			</span>
		</a>
		<button class="fd-icon-button" type="button" aria-label="更多"><MoreHorizontal class="size-5" /></button>
	</header>

	<!-- 详情头 -->
	<section class="fd-detail-card" style="margin-top:16px;">
		<div class="fd-detail-head">
			<DishVisual name={data.mealPlan.title} category={data.mealPlan.typeLabel} size="lg" />
			<div>
				<h2>{data.mealPlan.title}</h2>
				<p>{data.mealPlan.targetName} · {data.mealPlan.startDate || '未设置日期'}</p>
				<div class="tags">
					<span class="fd-pill">{dishCount} 道菜</span>
					<span class="fd-pill green">{data.mealPlan.typeLabel}</span>
					<span class={flowStateClass(data.mealPlan.flow.tone)}>{data.mealPlan.flow.label}</span>
				</div>
			</div>
		</div>
		<FlowSteps step={data.mealPlan.flow.step} archived={isArchived} />
		<p style="margin:12px 0 0;color:#595550;font-size:13px;line-height:1.35;">{data.mealPlan.flow.summary}</p>
		{#if data.mealPlan.updatedBy}
			<p style="margin:6px 0 0;color:var(--fd-muted);font-size:11px;">由 {data.mealPlan.updatedBy.name} 更新</p>
		{/if}
	</section>

	{#if form?.message}
		<p class="fd-state-pill coral" style="justify-content:flex-start;padding:8px 12px;margin-top:12px;">{form.message}</p>
	{/if}

	{#if isArchived}
		<p class="fd-soft-card" style="margin-top:12px;font-size:13px;color:var(--fd-muted);">这顿饭已经收起，当前页面保持只读。</p>
	{/if}

	<section class="fd-flow-cta" aria-label="下一步操作">
		<div class="min-w-0">
			<span class={flowStateClass(data.mealPlan.flow.tone)}>当前：{data.mealPlan.flow.label}</span>
			{#if primaryAction.kind === 'arrange'}
				<h3>先把菜单定下来</h3>
				<p>{dishCount > 0 ? `已经有 ${dishCount} 道菜，可以继续加菜，也可以去确认。` : '先加几道菜，再发给家人确认。'}</p>
			{:else if primaryAction.kind === 'createShare'}
				<h3>发给家人确认</h3>
				<p>把菜单发出去，收集忌口、喜欢和最终确认。</p>
			{:else if primaryAction.kind === 'reviewConfirm'}
				<h3>{data.feedbackSummary.total > 0 ? '看完反馈就确认菜单' : '确认后进入买菜'}</h3>
				<p>{data.feedbackSummary.total > 0 ? `已收到 ${data.feedbackSummary.total} 条反馈，确认后反馈会继续保留。` : '链接已准备好；不等反馈时也可以直接确认这份菜单。'}</p>
			{:else if primaryAction.kind === 'generateShop'}
				<h3>生成买菜清单</h3>
				<p>{data.feedbackSummary.total > 0 ? `反馈已保留 ${data.feedbackSummary.total} 条。去买什么里生成并检查食材。` : '根据当前菜单把食材整理成一张买菜清单。'}</p>
			{:else if primaryAction.kind === 'goShop'}
				<h3>去买菜</h3>
				<p>清单已经生成，就在买什么里边买边勾。</p>
			{:else}
				<h3>{data.mealPlan.status === 'completed' ? '这顿饭已完成' : '买菜已完成'}</h3>
				<p>{data.shoppingSummary.total > 0 ? `${data.shoppingSummary.checked}/${data.shoppingSummary.total} 项已经买齐，可以回看菜单或完成记录。` : '这顿饭已经完成，可以回看菜单和反馈。'}</p>
			{/if}
		</div>
		<div class="fd-flow-cta-actions">
			{#if primaryAction.kind === 'arrange'}
				<button type="button" class="fd-ghost-btn" onclick={() => (activePanel = 'edit')}><Plus class="size-4" /> 加菜</button>
				<button type="button" class="fd-primary-btn" onclick={() => (activePanel = 'confirm')}><Share2 class="size-4" /> 去确认</button>
			{:else if primaryAction.kind === 'createShare'}
				<form method="post" action="?/createShareLink" use:enhanceWithFeedback>
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<button type="submit" class="fd-primary-btn" disabled={isArchived} data-pending-label="创建中..."><Link2 class="size-4" /> 发给家人</button>
				</form>
			{:else if primaryAction.kind === 'reviewConfirm'}
				<button type="button" class="fd-ghost-btn" onclick={showFeedbackPanel}><UsersRound class="size-4" /> 看反馈</button>
				{#if canConfirmMealPlan}
					<form method="post" action="?/setStatus" use:enhanceWithFeedback>
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<input type="hidden" name="status" value="confirmed" />
						<button type="submit" class="fd-primary-btn" data-pending-label="确认中..."><CheckCircle2 class="size-4" /> 确认菜单</button>
					</form>
				{:else}
					<a href="?panel=shopping" class="fd-primary-btn"><ShoppingCart class="size-4" /> 去买菜</a>
				{/if}
			{:else if primaryAction.kind === 'generateShop'}
				{#if data.feedbackSummary.total > 0}
					<button type="button" class="fd-ghost-btn" onclick={showFeedbackPanel}><UsersRound class="size-4" /> 回看反馈</button>
				{/if}
				<button type="button" class="fd-primary-btn" onclick={() => (activePanel = 'shopping')}><ShoppingCart class="size-4" /> 去生成</button>
			{:else if primaryAction.kind === 'done'}
				<button type="button" class="fd-ghost-btn" onclick={() => (activePanel = 'menu')}><ArrowLeft class="size-4" /> 看菜单</button>
				{#if data.mealPlan.status !== 'completed' && !isArchived}
					<form method="post" action="?/setStatus" use:enhanceWithFeedback>
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<input type="hidden" name="status" value="completed" />
						<button type="submit" class="fd-primary-btn" data-pending-label="完成中..."><CheckCircle2 class="size-4" /> 标记完成</button>
					</form>
				{:else if data.shoppingList}
					<button type="button" class="fd-primary-btn" onclick={() => (activePanel = 'shopping')}><CheckCircle2 class="size-4" /> 看清单</button>
				{/if}
			{:else}
				<button type="button" class="fd-primary-btn" onclick={() => (activePanel = 'shopping')}><ShoppingCart class="size-4" /> 去买菜</button>
			{/if}
		</div>
	</section>

	<!-- 面板切换 -->
	<div class="fd-segmented" style="grid-template-columns:repeat(4,1fr);margin-top:14px;">
		{#each panels as panel}
			<button
				type="button"
				class="fd-segment {activePanel === panel.id ? 'active' : ''}"
				aria-pressed={activePanel === panel.id}
				onclick={() => (activePanel = panel.id)}
			>
				{panel.label}
			</button>
		{/each}
	</div>

	{#if activePanel === 'menu'}
		<section style="margin-top:4px;" data-testid="meal-plan-items">
			<div class="fd-section-head">
				<div>
					<h3>吃什么</h3>
					<p>这顿菜单，可以放多道菜</p>
				</div>
				<button type="button" class="fd-ghost-btn" onclick={() => (activePanel = 'edit')}><Plus class="size-4" /> 加菜</button>
			</div>

			{#if data.groups.length === 0}
				<div class="fd-empty" style="margin-top:14px;">
					<span class="emoji"><Plus class="size-8" /></span>
					<h3>还没有菜品</h3>
					<p>先去编辑区添加已有菜品，或快速新建一道菜。</p>
					<button type="button" class="fd-primary-btn lg block" onclick={() => (activePanel = 'edit')}>去加菜</button>
				</div>
			{:else}
				{#each data.groups as group}
					<div class="fd-section-head" style="margin-top:14px;">
						<div>
							<h3 style="font-size:16px;">{group.dateLabel}</h3>
							<p>{group.slotLabel}</p>
						</div>
					</div>
					<div class="fd-card-list">
						{#each group.items as item}
							<article class="fd-plan-item single" data-testid={`meal-plan-item-${item.id}`}>
								<DishVisual name={item.dishName} category={item.dishCategory} size="sm" />
								<div class="pi-copy min-w-0">
									<strong>{item.dishName}</strong>
									<span>{item.dishCategory ?? '未分类'} · {item.servings} 份 · {item.dishIngredientCount} 种食材</span>
									{#if item.recommendationRating}
										<span class="fd-pill green" style="margin-top:4px;"><Star class="size-3 fill-current" /> 推荐 {item.recommendationRating} 星</span>
									{/if}
									{#if item.notes}
										<span class="fd-pill" style="margin-top:4px;">{item.notes}</span>
									{/if}
									<div class="fd-plan-actions">
										{#if item.dishId}
											<a href={`/app/dishes/${item.dishId}`} class="fd-ghost-btn">看做法 <ArrowRight class="size-4" /></a>
										{/if}
										<form method="post" action="?/removeItem" use:enhanceWithFeedback>
											<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
											<input type="hidden" name="itemId" value={item.id} />
											<button type="submit" class="fd-danger-btn" disabled={isArchived} data-confirm={`从饭单中移除「${item.dishName}」？`}><Trash2 class="size-4" /> 移除</button>
										</form>
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/each}
			{/if}
		</section>
	{:else if activePanel === 'confirm'}
		<section id="meal-plan-feedback" style="margin-top:4px;scroll-margin-top:16px;" data-testid="meal-plan-feedback">
			<div class="fd-section-head">
				<div>
					<h3>家人反馈</h3>
					<p>{data.feedbackSummary.total} 条 · {data.feedbackSummary.total > 0 ? '已收集' : '还没人看'}</p>
				</div>
				{#if !activeShare}
					<form method="post" action="?/createShareLink" use:enhanceWithFeedback>
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<button type="submit" class="fd-primary-btn" disabled={isArchived} data-pending-label="创建中...">
							<Link2 class="size-4" /> 发给家人
						</button>
					</form>
				{:else}
					<button type="button" class="fd-ghost-btn" onclick={() => {}}><Share2 class="size-4" /> 已分享</button>
				{/if}
			</div>

			<section class="fd-detail-card" style="margin-top:12px;" data-testid="meal-plan-share">
				{#if activeShare}
					<div style="display:grid;gap:12px;">
						<div style="display:flex;align-items:center;gap:8px;">
							<Link2 class="size-5" style="color:var(--fd-green);" />
							<strong style="font-size:15px;font-weight:850;">当前分享链接</strong>
						</div>
						<Input value={activeShareUrl} readonly class="fd-text-input" style="height:40px;font-size:12px;" />
						<div style="display:flex;gap:8px;flex-wrap:wrap;">
							<span class="fd-pill">{sharePermissionSummary(activeShare)}</span>
							<span class="fd-pill"><CheckCircle2 class="size-3.5" /> {formatShareExpiry(activeShare.expiresAt)}</span>
						</div>
						<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
							<button type="button" class="fd-primary-btn" onclick={() => copyShareLink(activeShare.id, activeShareUrl)}>
								<Copy class="size-4" /> {copiedShareId === activeShare.id ? '已复制' : '复制链接'}
							</button>
							<a href={activeShare.path} target="_blank" class="fd-ghost-btn"><ExternalLink class="size-4" /> 访客页</a>
						</div>
						<form method="post" action="?/revokeShareLink" use:enhanceWithFeedback>
							<input type="hidden" name="shareLinkId" value={activeShare.id} />
							<button type="submit" class="fd-danger-btn block" data-confirm="停止分享后，当前链接将立即失效。确认继续？" data-pending-label="停止中...">
								<ShieldOff class="size-4" /> 停止分享
							</button>
						</form>
					</div>
				{:else}
					<form method="post" action="?/createShareLink" use:enhanceWithFeedback style="display:grid;gap:14px;">
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<input type="hidden" name="shareOptionsSubmitted" value="1" />
						<p style="margin:0;color:#595550;font-size:13px;line-height:1.4;">发一个链接给家人，收集忌口、换菜和最终确认。</p>
						<div style="display:grid;gap:8px;">
							<label style="display:flex;min-height:48px;align-items:center;gap:10px;border:1px solid var(--fd-line);border-radius:14px;background:rgba(255,255,255,.86);padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">
								<input type="checkbox" name="canFeedback" checked class="size-5" />
								<span>允许反馈（标记喜欢、换菜、忌口）</span>
							</label>
							<label style="display:flex;min-height:48px;align-items:center;gap:10px;border:1px solid var(--fd-line);border-radius:14px;background:rgba(255,255,255,.86);padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">
								<input type="checkbox" name="canConfirm" checked class="size-5" />
								<span>允许最终确认</span>
							</label>
						</div>
						<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
							<div class="space-y-2">
								<Label for="share-expiry-preset" style="font-size:12px;font-weight:700;">有效期</Label>
								<select id="share-expiry-preset" name="expiryPreset" class={selectClass} disabled={isArchived}>
									{#each shareExpiryOptions as option}
										<option value={option.value} selected={option.value === 'never'}>{option.label}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-2">
								<Label for="share-custom-expires-on" style="font-size:12px;font-weight:700;">自定义到期</Label>
								<Input id="share-custom-expires-on" name="customExpiresOn" type="date" class="fd-text-input" disabled={isArchived} />
							</div>
						</div>
						{#if form?.action === 'createShareLink' && errors.customExpiresOn?.[0]}
							<p class="fd-state-pill coral" style="justify-content:flex-start;">{errors.customExpiresOn[0]}</p>
						{/if}
						<button type="submit" class="fd-primary-btn block" disabled={isArchived} data-pending-label="创建中...">
							<Link2 class="size-4" /> 发给家人确认
						</button>
					</form>
				{/if}
			</section>

			<!-- 反馈统计 -->
			<div class="fd-soft-card" style="margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);text-align:center;padding:14px 8px;">
				<p><Heart class="mx-auto mb-1 size-5" style="color:var(--fd-coral);" /><span class="block text-xl font-bold">{feedbackTotals.like}</span><span style="font-size:11px;color:var(--fd-muted);">喜欢</span></p>
				<p><ThumbsDown class="mx-auto mb-1 size-5" style="color:var(--fd-muted);" /><span class="block text-xl font-bold">{feedbackTotals.dislike}</span><span style="font-size:11px;color:var(--fd-muted);">不喜欢</span></p>
				<p><RefreshCw class="mx-auto mb-1 size-5" style="color:var(--fd-orange);" /><span class="block text-xl font-bold">{feedbackTotals.replace}</span><span style="font-size:11px;color:var(--fd-muted);">替换</span></p>
				<p><CheckCircle2 class="mx-auto mb-1 size-5" style="color:var(--fd-green);" /><span class="block text-xl font-bold">{feedbackTotals.confirm}</span><span style="font-size:11px;color:var(--fd-muted);">确认</span></p>
			</div>

			{#if data.feedbackSummary.total === 0}
				<p class="fd-soft-card" style="margin-top:12px;font-size:13px;color:var(--fd-muted);">暂无反馈。创建分享链接并发给家人后，这里会聚合确认、忌口和每道菜的意见。</p>
			{:else}
				<div class="fd-confirm-inline">
					<div>
						<strong>反馈已收到</strong>
						<span>{data.feedbackSummary.total} 条反馈会一直保留在这顿饭里。</span>
					</div>
					{#if canConfirmMealPlan}
						<form method="post" action="?/setStatus" use:enhanceWithFeedback>
							<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
							<input type="hidden" name="status" value="confirmed" />
							<button type="submit" class="fd-primary-btn" data-pending-label="确认中..."><CheckCircle2 class="size-4" /> 确认菜单</button>
						</form>
					{:else}
						<span class="fd-state-pill green"><CheckCircle2 class="size-3.5" /> 已确认</span>
					{/if}
				</div>
				{#if data.feedbackSummary.dietaryNotes.length > 0 || data.feedbackSummary.globalNotes.length > 0}
					<div class="fd-section-head"><div><h3>全局备注</h3></div></div>
					<div class="fd-card-list">
						{#each data.feedbackSummary.dietaryNotes as note}
							<article class="fd-feedback-row">
								<span class="who">{note.guestName.slice(0, 1)}</span>
								<span class="fb-copy"><strong>{note.guestName} 的忌口</strong><span>{note.dietaryNote}</span></span>
								<span class="fb-emoji" style="color:var(--fd-coral);">⚠</span>
							</article>
						{/each}
						{#each data.feedbackSummary.globalNotes as note}
							<article class="fd-feedback-row">
								<span class="who">{note.guestName.slice(0, 1)}</span>
								<span class="fb-copy"><strong>{note.guestName} · {note.reactionLabel}</strong><span>{note.note}</span></span>
							</article>
						{/each}
					</div>
				{/if}

				{#if data.feedbackSummary.itemTotal > 0}
					<div class="fd-section-head"><div><h3>菜品反馈</h3></div></div>
					<div class="fd-card-list">
						{#each data.groups as group}
							{#each group.items as item}
								{#if item.feedbackTotal > 0}
									<article class="fd-soft-card">
										<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
											<strong style="font-size:15px;font-weight:850;">{item.dishName}</strong>
											<span class="fd-pill green">{item.feedbackTotal} 条</span>
										</div>
										<div style="display:flex;flex-wrap:wrap;gap:6px;">
											{#if item.feedback.counts.like}<span class="fd-pill green">喜欢 {item.feedback.counts.like}</span>{/if}
											{#if item.feedback.counts.dislike}<span class="fd-pill coral">不喜欢 {item.feedback.counts.dislike}</span>{/if}
											{#if item.feedback.counts.replace}<span class="fd-pill orange">想替换 {item.feedback.counts.replace}</span>{/if}
											{#if item.feedback.counts.note}<span class="fd-pill">备注 {item.feedback.counts.note}</span>{/if}
										</div>
										{#each item.feedback.notes as note}
											<p style="margin:8px 0 0;font-size:13px;"><strong>{note.guestName}：</strong><span style="color:var(--fd-muted);">{note.note}</span></p>
										{/each}
									</article>
								{/if}
							{/each}
						{/each}
					</div>
				{/if}
			{/if}

		</section>
	{:else if activePanel === 'shopping'}
		<section style="margin-top:4px;">
			<div class="fd-section-head">
				<div>
					<h3>买什么</h3>
					<p>{data.shoppingList ? `已生成 ${shoppingCount} 项，可以直接勾选` : '根据这顿菜单生成清单'}</p>
				</div>
			</div>

			{#if data.shoppingList}
				<section class="fd-detail-card" style="margin-top:12px;display:grid;gap:12px;">
					<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
						<strong style="font-size:16px;font-weight:850;">买菜进度</strong>
						<span style="color:var(--fd-muted);font-size:13px;font-weight:760;">{shoppingCompletionLabel}</span>
					</div>
					<div style="height:10px;border-radius:999px;background:var(--fd-line);overflow:hidden;">
						<div style="width:{shoppingCompletionPercent}%;height:100%;background:var(--fd-green);"></div>
					</div>
					<div style="display:flex;flex-wrap:wrap;gap:6px;">
						<span class="fd-pill orange">待买 {data.shoppingSummary.pending}</span>
						<span class="fd-pill green">已买 {data.shoppingSummary.checked}</span>
						<span class="fd-pill">{data.mealPlan.title}</span>
					</div>
				</section>

				{#if data.shoppingList.items.length === 0}
					<div class="fd-empty" style="margin-top:14px;">
						<span class="emoji"><ShoppingCart class="size-8" /></span>
						<h3>清单还是空的</h3>
						<p>这顿菜可能还没有录食材，可以打开完整清单临时加购物项。</p>
						<a href={`/app/shopping-lists/${data.shoppingList.id}`} class="fd-ghost-btn block">添加购物项 <ArrowRight class="size-4" /></a>
					</div>
				{:else}
					<section style="margin-top:8px;" data-testid="meal-shopping-list-items">
						{#each data.shoppingGroups as group}
							<section class="fd-shopping-group">
								<div class="fd-shopping-group-head">
									<div>
										<h3>{group.category}</h3>
										<p>{group.items.length - group.checkedCount} 个待买 · {group.checkedCount} 个已买</p>
									</div>
									<span class="fd-shopping-status">{group.checkedCount}/{group.items.length}</span>
								</div>
								<section class="fd-shopping-items">
									{#each group.items as item}
										<article class="fd-check-card shopping {item.checked ? 'is-done' : ''}" data-testid={`meal-shopping-list-item-${item.id}`}>
											<form method="post" action="?/toggleShoppingItem" use:enhanceWithFeedback style="display:contents;">
												<input type="hidden" name="shoppingListId" value={data.shoppingList.id} />
												<input type="hidden" name="itemId" value={item.id} />
												<input type="hidden" name="checked" value={item.checked ? 'false' : 'true'} />
												<button type="submit" class="fd-check" aria-label={item.checked ? '标记未购买' : '标记已购买'}><Check class="size-4" strokeWidth={3} /></button>
											</form>
											<div class="fd-check-copy min-w-0">
												<strong>{item.name}</strong>
												<span>{item.quantity || '未填数量'}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}</span>
												<span style="font-size:11px;color:var(--fd-muted);">{shoppingActorLabel(item)}</span>
											</div>
											<a href={`/app/shopping-lists/${data.shoppingList.id}`} class="fd-icon-del" aria-label="编辑购物项">
												<MoreHorizontal class="size-4" />
											</a>
										</article>
									{/each}
								</section>
							</section>
						{/each}
					</section>
				{/if}
			{:else}
				<div class="fd-soft-card" style="margin-top:12px;display:flex;align-items:center;gap:12px;">
					<span class="fd-empty" style="margin:0;padding:0;place-items:center;">
						<span class="emoji" style="width:48px;height:48px;font-size:22px;border-radius:16px;"><ShoppingCart class="size-6" /></span>
					</span>
					<div class="min-w-0">
						<strong style="display:block;font-size:15px;font-weight:850;">还没生成买菜清单</strong>
						<span style="display:block;margin-top:2px;color:var(--fd-muted);font-size:12px;">家人确认后，一键从菜里带出食材。</span>
					</div>
				</div>
			{/if}

			<form method="post" action="?/generateShoppingList" use:enhanceWithFeedback style="margin-top:12px;">
				<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
				<input type="hidden" name="expectedShoppingListUpdatedAt" value={data.shoppingList?.updatedAt ?? ''} />
				<button
					type="submit"
					class="fd-primary-btn {data.shoppingList ? '' : 'orange'} block lg"
					data-confirm={data.shoppingList ? '重新生成会替换当前购物清单项目，确认继续？' : undefined}
					data-pending-label={data.shoppingList ? '重新生成中...' : '生成中...'}
				>
					<ShoppingCart class="size-4" /> {data.shoppingList ? '重新生成清单' : '生成购物清单'}
				</button>
			</form>
			{#if data.shoppingList}
				<a href={`/app/shopping-lists/${data.shoppingList.id}`} class="fd-ghost-btn block" style="margin-top:10px;">
					临时加项和编辑数量 <ArrowRight class="size-4" />
				</a>
			{/if}

			<div class="fd-section-head"><div><h3 style="font-size:16px;">这顿偏好</h3></div></div>
			<div class="fd-soft-card" style="margin-top:10px;">
				{#if data.target}
					<div class="fd-setting-row"><div class="meta"><strong>人数</strong><span>{data.target.peopleCount} 人</span></div></div>
					<div class="fd-setting-row"><div class="meta"><strong>口味</strong><span>{data.target.tasteNotes || '未记录'}</span></div></div>
					<div class="fd-setting-row"><div class="meta"><strong>忌口</strong><span>{data.target.dietaryRestrictions || '未记录'}</span></div></div>
					<div class="fd-setting-row"><div class="meta"><strong>预算备注</strong><span>{data.target.budgetNotes || '未记录'}</span></div></div>
					<a href={`/app/targets/${data.target.id}`} class="fd-ghost-btn block" style="margin-top:12px;">打开偏好</a>
				{:else}
					<p style="margin:0;font-size:13px;color:var(--fd-muted);">默认使用当前家庭。需要聚餐或特殊口味时，再补充偏好。</p>
				{/if}
			</div>
		</section>
	{:else}
		<section style="margin-top:4px;">
			<details class="fd-form-card" open style="padding:0 17px 14px;">
				<summary style="cursor:pointer;padding:14px 0;font-size:16px;font-weight:850;border-bottom:1px solid var(--fd-line-soft);list-style:none;">这顿信息</summary>
				<form method="post" action="?/updateMeta" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} style="margin-top:4px;">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<div class="fd-field">
						<div class="fd-field-label"><strong>名称</strong></div>
						<Input id="meal-plan-title" name="title" value={data.mealPlan.title} placeholder="例如：周三晚餐" required disabled={isArchived} class="fd-text-input" />
						{#if form?.action === 'updateMeta' && errors.title?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.title[0]}</p>{/if}
					</div>
					<div class="fd-field">
						<div class="fd-field-label"><strong>类型</strong></div>
						<select id="meal-plan-type" name="type" class={selectClass} disabled={isArchived}>
							{#each data.typeOptions as option}<option value={option.value} selected={data.mealPlan.type === option.value}>{option.label}</option>{/each}
						</select>
					</div>
					<div class="fd-field">
						<div class="fd-field-label"><strong>用餐偏好</strong></div>
						<select id="meal-plan-target" name="targetId" class={selectClass} disabled={isArchived}>
							<option value="" selected={!data.mealPlan.targetId}>当前家庭</option>
							{#each data.targets as target}<option value={target.id} selected={data.mealPlan.targetId === target.id}>{target.name}</option>{/each}
						</select>
						{#if form?.action === 'updateMeta' && errors.targetId?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.targetId[0]}</p>{/if}
					</div>
					<div class="fd-field" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid var(--fd-line-soft);">
						<div style="padding:13px 0;">
							<div class="fd-field-label"><strong>开始</strong></div>
							<Input id="start-date" name="startDate" type="date" value={data.mealPlan.startDate ?? ''} disabled={isArchived} class="fd-text-input" />
						</div>
						<div style="padding:13px 0;">
							<div class="fd-field-label"><strong>结束</strong></div>
							<Input id="end-date" name="endDate" type="date" value={data.mealPlan.endDate ?? ''} disabled={isArchived} class="fd-text-input" />
						</div>
					</div>
					<div class="fd-field">
						<div class="fd-field-label"><strong>备注</strong></div>
						<textarea id="meal-plan-notes" name="notes" class={textAreaClass} disabled={isArchived}>{data.mealPlan.notes ?? ''}</textarea>
					</div>
					<button type="submit" class="fd-primary-btn block" disabled={isArchived} data-pending-label="保存中..."><CheckCircle2 class="size-4" /> 保存这顿饭</button>
				</form>
			</details>

			<details class="fd-form-card" style="padding:0 17px 14px;">
				<summary style="cursor:pointer;padding:14px 0;font-size:16px;font-weight:850;border-bottom:1px solid var(--fd-line-soft);list-style:none;">从常做菜里加菜</summary>
				<form method="post" action="?/addDish" use:enhanceWithFeedback={{ pendingLabel: '添加中...' }} style="margin-top:4px;">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<input type="hidden" name="plannedDate" value={defaultItemDate ?? ''} />
					<input type="hidden" name="mealSlot" value={defaultItemSlot ?? ''} />
					<input type="hidden" name="servings" value={defaultItemServings} />
					<input type="hidden" name="recommendationRating" value="" />
					<input type="hidden" name="notes" value="" />
					<div class="fd-choice-panel">
						<label class="fd-search">
							<Search class="size-4" />
							<input bind:value={addDishQuery} type="search" placeholder="搜菜名、分类、食材" disabled={isArchived || data.dishes.length === 0} />
						</label>
						<div class="fd-choice-list">
							{#each filteredAddDishes as dish}
								<label class="fd-choice-card">
									<input bind:group={replacementDishId} class="fd-choice-radio" type="radio" name="dishId" value={dish.id} disabled={isArchived} required />
									<DishVisual name={dish.name} category={dish.category} size="sm" soft />
									<span class="min-w-0">
										<strong>{dish.name}</strong>
										<span>{dish.category ?? '常做菜'} · {dish.ingredients.length} 种食材 · 基准 {dish.baseServings} 人份</span>
									</span>
									{#if replacementDishId === dish.id}<CheckCircle2 class="size-4" style="color:var(--fd-green);" />{/if}
								</label>
							{/each}
						</div>
						{#if filteredAddDishes.length === 0}
							<p style="margin:0;color:var(--fd-muted);font-size:12px;">没找到，下面可以快速新建一道。</p>
						{:else if data.dishes.length > filteredAddDishes.length}
							<p style="margin:0;color:var(--fd-muted);font-size:11px;">已显示前 {filteredAddDishes.length} 道，继续输入关键词可以缩小范围。</p>
						{/if}
						{#if form?.action === 'addDish' && errors.dishId?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.dishId[0]}</p>{/if}
					</div>
					<button type="submit" class="fd-primary-btn block" style="margin-top:12px;" disabled={isArchived || data.dishes.length === 0} data-pending-label="添加中..."><Plus class="size-4" /> 加到这顿菜单</button>
				</form>
			</details>

			<details class="fd-form-card" style="padding:0 17px 14px;">
				<summary style="cursor:pointer;padding:14px 0;font-size:16px;font-weight:850;border-bottom:1px solid var(--fd-line-soft);list-style:none;">快速新建菜品</summary>
				<form method="post" action="?/quickAddDish" use:enhanceWithFeedback={{ pendingLabel: '新建中...' }} style="margin-top:4px;">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<input type="hidden" name="plannedDate" value={defaultItemDate ?? ''} />
					<input type="hidden" name="mealSlot" value={defaultItemSlot ?? ''} />
					<input type="hidden" name="servings" value={defaultItemServings} />
					<input type="hidden" name="recommendationRating" value="" />
					<input type="hidden" name="notes" value="" />
					<div class="fd-field">
						<div class="fd-field-label"><strong>菜品名称</strong></div>
						<Input id="quick-dish-name" name="name" placeholder="例如：番茄炒蛋" disabled={isArchived} required class="fd-text-input" />
						{#if form?.action === 'quickAddDish' && errors.name?.[0]}<p class="fd-state-pill coral" style="justify-content:flex-start;margin-top:6px;">{errors.name[0]}</p>{/if}
					</div>
					<div class="fd-field">
						<div class="fd-field-label"><strong>分类</strong></div>
						<Input id="quick-dish-category" name="category" placeholder="家常菜" disabled={isArchived} class="fd-text-input" />
					</div>
					<button type="submit" class="fd-primary-btn block" style="margin-top:12px;" disabled={isArchived} data-pending-label="新建中..."><Plus class="size-4" /> 新建并加入</button>
				</form>
			</details>
		</section>
	{/if}
</main>

<MobileBottomNav />
