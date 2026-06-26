<script lang="ts">
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		Archive,
		ArrowDown,
		ArrowLeft,
		ArrowRight,
		ArrowUp,
		CalendarDays,
		CheckCircle2,
		ChefHat,
		ClipboardList,
		Copy,
		ExternalLink,
		Heart,
		Link2,
		MessageSquareText,
		Plus,
		RefreshCw,
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

	$effect(() => {
		activePanel = data.initialPanel as Panel;
	});

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const isArchived = $derived(data.mealPlan.status === 'archived');
	const defaultDate = $derived(data.mealPlan.startDate ?? '');
	const feedbackTotals = $derived(data.feedbackSummary.totals);
	const dishCount = $derived(data.mealPlan.items.length);
	const shoppingCount = $derived(data.shoppingList?.items.length ?? 0);
	const activeShare = $derived(data.shareLinks.find((shareLink) => shareLink.active) ?? null);
	const activeShareUrl = $derived(activeShare ? `${data.origin}${activeShare.path}` : '');
	const flowChipClass = (tone: string) =>
		tone === 'attention'
			? 'bg-destructive/10 text-destructive'
			: tone === 'success'
				? 'bg-secondary text-primary'
				: tone === 'muted'
					? 'bg-muted text-muted-foreground'
					: 'bg-white text-primary';
	const selectClass = 'app-input h-11 text-sm';
	const textAreaClass = 'app-input min-h-24 py-3';
	const recommendationOptions = [
		{ value: '', label: '不标注' },
		{ value: 5, label: '5 星强推荐' },
		{ value: 4, label: '4 星推荐' },
		{ value: 3, label: '3 星可选' },
		{ value: 2, label: '2 星普通' },
		{ value: 1, label: '1 星备选' }
	];
	const panels = $derived<{ id: Panel; label: string; helper: string }[]>([
		{ id: 'menu', label: '菜单', helper: `${dishCount} 道菜` },
		{ id: 'confirm', label: '确认', helper: `${data.feedbackSummary.total} 条反馈` },
		{ id: 'shopping', label: '清单', helper: shoppingCount ? `${shoppingCount} 项` : '待生成' },
		{ id: 'edit', label: '编辑', helper: '信息和加菜' }
	]);

	const copyShareLink = async (shareLinkId: string, url: string) => {
		await navigator.clipboard.writeText(url);
		copiedShareId = shareLinkId;
		window.setTimeout(() => {
			if (copiedShareId === shareLinkId) copiedShareId = null;
		}, 1800);
	};
</script>

<svelte:head>
	<title>{data.mealPlan.title} / 饭单</title>
</svelte:head>

<main class="app-page app-bottom-safe">
	<section class="space-y-4">
		<Button href="/app/meal-plans" variant="ghost" size="sm" class="h-11 justify-start px-0 text-muted-foreground">
			<ArrowLeft class="size-4" />
			返回饭单列表
		</Button>

		<section class="app-panel overflow-hidden">
			<div class="space-y-4 bg-[linear-gradient(135deg,oklch(1_0_0),oklch(0.975_0.025_151))] p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 space-y-2">
						<p class="app-chip {flowChipClass(data.mealPlan.flow.tone)}">
							{data.mealPlan.flow.label}
						</p>
						<h1 class="break-words text-3xl font-semibold leading-tight">{data.mealPlan.title}</h1>
						<p class="text-sm leading-6 text-muted-foreground">{data.mealPlan.flow.summary}</p>
						<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
							<span class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" />{data.mealPlan.startDate || '未设置日期'}</span>
							<span>{data.mealPlan.targetName}</span>
						</p>
						<p class="text-xs text-muted-foreground">
							{data.mealPlan.updatedBy ? `最近由 ${data.mealPlan.updatedBy.name} 更新` : '历史饭单，暂无操作归属'}
						</p>
					</div>
				</div>

				<div class="grid grid-cols-3 divide-x divide-border/70 rounded-2xl bg-white p-3 text-center text-sm">
					<p><span class="block text-2xl font-semibold">{dishCount}</span><span class="text-xs text-muted-foreground">菜品</span></p>
					<p><span class="block text-2xl font-semibold">{data.feedbackSummary.total}</span><span class="text-xs text-muted-foreground">反馈</span></p>
					<p><span class="block text-2xl font-semibold">{shoppingCount}</span><span class="text-xs text-muted-foreground">清单项</span></p>
				</div>

					<div class="grid grid-cols-[1fr_1.35fr] gap-3">
					<Button onclick={() => (activePanel = 'menu')} variant="outline" class="h-12 rounded-2xl bg-white">
						<ChefHat class="size-4" />
						看菜单
					</Button>
					{#if data.mealPlan.flow.step === 'confirm' && !activeShare}
						<form method="post" action="?/createShareLink" use:enhanceWithFeedback>
							<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
							<Button type="submit" class="h-12 w-full rounded-2xl text-base" disabled={isArchived} data-pending-label="创建中...">
								<Link2 class="size-4" />
								发给家人确认
							</Button>
						</form>
					{:else if data.mealPlan.flow.step === 'confirm'}
						<Button onclick={() => (activePanel = 'confirm')} class="h-12 rounded-2xl text-base">
							<MessageSquareText class="size-4" />
							继续确认
						</Button>
					{:else if data.mealPlan.flow.step === 'shop' && data.shoppingList}
						<Button href={`/app/shopping-lists/${data.shoppingList.id}`} class="h-12 rounded-2xl text-base">
							<ShoppingCart class="size-4" />
							去买菜
						</Button>
					{:else if data.mealPlan.flow.step === 'shop'}
						<form method="post" action="?/generateShoppingList" use:enhanceWithFeedback>
							<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
							<input type="hidden" name="expectedShoppingListUpdatedAt" value={data.shoppingList?.updatedAt ?? ''} />
							<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="生成中...">
								<ShoppingCart class="size-4" />
								生成购物清单
							</Button>
						</form>
					{:else}
						<Button onclick={() => (activePanel = 'edit')} class="h-12 rounded-2xl text-base">
							<Plus class="size-4" />
							继续安排
						</Button>
					{/if}
				</div>
			</div>
		</section>
	</section>

	{#if form?.message}
		<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	{#if isArchived}
		<p class="rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
			这份饭单已归档，当前详情页保持只读。
		</p>
	{/if}

	<section class="sticky top-0 z-20 -mx-4 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:px-0">
		<div class="grid grid-cols-4 gap-2 rounded-2xl border border-border/80 bg-white p-1 shadow-sm">
			{#each panels as panel}
				<button
					type="button"
					class="rounded-xl px-2 py-2 text-center transition {activePanel === panel.id ? 'bg-secondary text-primary' : 'text-muted-foreground'}"
					aria-pressed={activePanel === panel.id}
					onclick={() => (activePanel = panel.id)}
				>
					<span class="block text-sm font-semibold">{panel.label}</span>
					<span class="block truncate text-[11px]">{panel.helper}</span>
				</button>
			{/each}
		</div>
	</section>

	{#if activePanel === 'menu'}
		<section class="space-y-4" data-testid="meal-plan-items">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold">菜单安排</h2>
					<p class="text-sm text-muted-foreground">先看这顿饭吃什么，排序和删除也在这里。</p>
				</div>
				<Button onclick={() => (activePanel = 'edit')} variant="outline" size="sm" class="h-11 rounded-xl bg-white">
					<Plus class="size-4" />
					加菜
				</Button>
			</div>

			{#if data.groups.length === 0}
				<div class="app-panel space-y-4 p-5 text-center">
					<ChefHat class="mx-auto size-8 text-primary" />
					<div class="space-y-1">
						<h3 class="text-xl font-semibold">还没有菜品</h3>
						<p class="text-sm leading-6 text-muted-foreground">先去编辑区添加已有菜品，或快速新建一道菜。</p>
					</div>
					<Button onclick={() => (activePanel = 'edit')} class="h-12 rounded-2xl">去加菜</Button>
				</div>
			{:else}
				{#each data.groups as group}
					<section class="app-panel overflow-hidden">
						<div class="flex flex-wrap items-center gap-2 border-b border-border/70 bg-secondary/40 px-4 py-3 text-sm font-medium">
							<span class="inline-flex items-center gap-1.5 text-primary">
								<CalendarDays class="size-4" />
								{group.dateLabel}
							</span>
							<span class="rounded-full bg-white px-2.5 py-1 text-muted-foreground">{group.slotLabel}</span>
						</div>
						<div class="divide-y divide-border/70">
							{#each group.items as item, index}
								<article class="p-4" data-testid={`meal-plan-item-${item.id}`}>
									<div class="flex items-start gap-3">
										<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
										<div class="min-w-0 flex-1 space-y-1">
											<div class="flex min-w-0 flex-wrap items-center gap-2">
												<h3 class="break-words text-lg font-semibold">{item.dishName}</h3>
												{#if item.dishCategory}
													<span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{item.dishCategory}</span>
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">{item.servings} 份 · {item.dishIngredientCount} 种食材</p>
											<p class="text-xs text-muted-foreground">
												{item.updatedBy ? `由 ${item.updatedBy.name} 处理` : '暂无条目归属'}
											</p>
											{#if item.recommendationRating}
												<p class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
													<Star class="size-3.5 fill-current" />
													主理人推荐 {item.recommendationRating} 星
												</p>
											{/if}
											{#if item.notes}
												<p class="rounded-xl bg-muted/60 p-2 text-sm text-muted-foreground">{item.notes}</p>
											{/if}
										</div>
									</div>
									<div class="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
										<form method="post" action="?/updateRecommendationRating" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
											<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
											<input type="hidden" name="itemId" value={item.id} />
											<div class="space-y-1">
												<Label for={`recommendation-${item.id}`} class="text-xs text-muted-foreground">推荐星级</Label>
												<select id={`recommendation-${item.id}`} name="recommendationRating" class={selectClass} disabled={isArchived}>
													{#each recommendationOptions as option}
														<option value={option.value} selected={item.recommendationRating === option.value || (!item.recommendationRating && option.value === '')}>{option.label}</option>
													{/each}
												</select>
											</div>
											<Button type="submit" variant="outline" size="sm" class="mt-5 h-11 rounded-xl bg-white" disabled={isArchived} data-pending-label="保存中...">
												<Star class="size-4" />
												保存
											</Button>
										</form>
										<div class="flex flex-wrap justify-end gap-2">
										<form method="post" action="?/moveItem">
											<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
											<input type="hidden" name="itemId" value={item.id} />
											<input type="hidden" name="direction" value="up" />
											<Button type="submit" variant="outline" size="icon-sm" class="size-11 rounded-xl bg-white" disabled={isArchived || !item.canMoveUp} aria-label="上移">
												<ArrowUp class="size-4" />
											</Button>
										</form>
										<form method="post" action="?/moveItem">
											<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
											<input type="hidden" name="itemId" value={item.id} />
											<input type="hidden" name="direction" value="down" />
											<Button type="submit" variant="outline" size="icon-sm" class="size-11 rounded-xl bg-white" disabled={isArchived || !item.canMoveDown} aria-label="下移">
												<ArrowDown class="size-4" />
											</Button>
										</form>
										{#if item.dishId}
											<Button href={`/app/dishes/${item.dishId}`} variant="ghost" size="sm" class="h-11">菜品</Button>
										{/if}
										<form method="post" action="?/removeItem" use:enhanceWithFeedback>
											<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
											<input type="hidden" name="itemId" value={item.id} />
											<Button
												type="submit"
												variant="destructive"
												size="icon-sm"
												class="size-11"
												disabled={isArchived}
												aria-label="移除"
												data-confirm={`从饭单中移除「${item.dishName}」？`}
											>
												<Trash2 class="size-4" />
											</Button>
										</form>
										</div>
									</div>
								</article>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		</section>
	{:else if activePanel === 'confirm'}
		<section class="space-y-4" data-testid="meal-plan-feedback">
			<section class="app-panel space-y-4 p-4" data-testid="meal-plan-share">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h2 class="flex items-center gap-2 text-xl font-semibold"><Link2 class="size-5 text-primary" />发给家人确认</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">把链接发给家人，收集忌口、换菜和最终确认。</p>
					</div>
				</div>

				{#if activeShare}
					<div class="space-y-3 rounded-2xl bg-secondary/45 p-3">
						<Label for="active-share-link">当前分享链接</Label>
						<Input id="active-share-link" value={activeShareUrl} readonly class="app-input bg-white text-sm" />
						<div class="grid grid-cols-2 gap-2">
							<Button type="button" onclick={() => copyShareLink(activeShare.id, activeShareUrl)} class="h-11 rounded-2xl">
								<Copy class="size-4" />
								{copiedShareId === activeShare.id ? '已复制' : '复制链接'}
							</Button>
							<Button href={activeShare.path} variant="outline" class="h-11 rounded-2xl bg-white" target="_blank">
								<ExternalLink class="size-4" />
								打开访客页
							</Button>
						</div>
						<form method="post" action="?/revokeShareLink" use:enhanceWithFeedback>
							<input type="hidden" name="shareLinkId" value={activeShare.id} />
							<Button
								type="submit"
								variant="ghost"
								class="h-10 w-full rounded-xl text-muted-foreground"
								data-confirm="停止分享后，当前链接将立即失效。确认继续？"
								data-pending-label="停止中..."
							>
								<ShieldOff class="size-4" />
								停止分享
							</Button>
						</form>
					</div>
				{:else}
					<form method="post" action="?/createShareLink" use:enhanceWithFeedback>
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<Button type="submit" class="h-12 w-full rounded-2xl text-base" disabled={isArchived} data-pending-label="创建中...">
							<Link2 class="size-4" />
							发给家人确认
						</Button>
					</form>
				{/if}
			</section>

			<details class="app-panel overflow-hidden">
				<summary class="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
					<span>高级状态</span>
					<span>{data.mealPlan.statusLabel}</span>
				</summary>
				<div class="border-t border-border/70 p-4">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div>
							<h2 class="text-xl font-semibold">系统状态</h2>
							<p class="text-sm text-muted-foreground">通常不用手动改；需要结束反馈或归档时再处理。</p>
						</div>
						{#if data.feedbackSummary.latestConfirmation}
							<span class="app-chip bg-secondary text-primary">
								<CheckCircle2 class="size-4" />
								{data.feedbackSummary.latestConfirmation.guestName} 已确认
							</span>
						{/if}
					</div>
					<div class="flex gap-2 overflow-x-auto pb-1">
						{#each data.statusOptions as option}
							<form method="post" action="?/setStatus" use:enhanceWithFeedback class="shrink-0">
								<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
								<input type="hidden" name="status" value={option.value} />
								<Button
									type="submit"
									variant={data.mealPlan.status === option.value ? 'secondary' : 'outline'}
									size="sm"
									class="rounded-xl bg-white"
									disabled={isArchived || data.mealPlan.status === option.value}
									data-confirm={option.value === 'archived' ? '归档后详情页会保持只读，确认归档这份饭单？' : undefined}
									data-pending-label="更新中..."
								>
									{#if option.value === 'archived'}
										<Archive class="size-4" />
									{:else if option.value === 'completed'}
										<CheckCircle2 class="size-4" />
									{:else}
										<ClipboardList class="size-4" />
									{/if}
									{option.label}
								</Button>
							</form>
						{/each}
					</div>
				</div>
			</details>

			<div class="app-soft-panel grid grid-cols-4 divide-x divide-border/70 p-3 text-center">
				<p><Heart class="mx-auto mb-1 size-5 text-primary" /><span class="block text-2xl font-semibold">{feedbackTotals.like}</span><span class="text-xs text-muted-foreground">喜欢</span></p>
				<p><ThumbsDown class="mx-auto mb-1 size-5 text-primary" /><span class="block text-2xl font-semibold">{feedbackTotals.dislike}</span><span class="text-xs text-muted-foreground">不喜欢</span></p>
				<p><RefreshCw class="mx-auto mb-1 size-5 text-primary" /><span class="block text-2xl font-semibold">{feedbackTotals.replace}</span><span class="text-xs text-muted-foreground">替换</span></p>
				<p><CheckCircle2 class="mx-auto mb-1 size-5 text-primary" /><span class="block text-2xl font-semibold">{feedbackTotals.confirm}</span><span class="text-xs text-muted-foreground">确认</span></p>
			</div>

			{#if data.feedbackSummary.total === 0}
				<div class="app-panel p-5 text-sm leading-6 text-muted-foreground">
					暂无访客反馈。创建分享链接并发给家人或客户后，这里会聚合确认状态、忌口和每道菜的意见。
				</div>
			{:else}
				{#if data.feedbackSummary.dietaryNotes.length > 0 || data.feedbackSummary.globalNotes.length > 0}
					<section class="space-y-3">
						<h3 class="text-lg font-semibold">全局备注</h3>
						{#each data.feedbackSummary.dietaryNotes as note}
							<article class="app-panel p-4 text-sm">
								<p class="font-semibold">{note.guestName} 的忌口备注</p>
								<p class="mt-1 break-words text-muted-foreground">{note.dietaryNote}</p>
							</article>
						{/each}
						{#each data.feedbackSummary.globalNotes as note}
							<article class="app-panel p-4 text-sm">
								<p class="font-semibold">{note.guestName} · {note.reactionLabel}</p>
								<p class="mt-1 break-words text-muted-foreground">{note.note}</p>
							</article>
						{/each}
					</section>
				{/if}

				{#if data.feedbackSummary.itemTotal > 0}
					<section class="space-y-3">
						<h3 class="text-lg font-semibold">菜品反馈</h3>
						{#each data.groups as group}
							{#each group.items as item}
								{#if item.feedbackTotal > 0}
									<article class="app-panel space-y-3 p-4">
										<div class="flex items-start justify-between gap-3">
											<div>
												<h4 class="font-semibold">{item.dishName}</h4>
												<p class="text-sm text-muted-foreground">{group.dateLabel} · {group.slotLabel}</p>
											</div>
											<span class="app-chip bg-secondary text-primary">{item.feedbackTotal} 条</span>
										</div>
										<div class="flex flex-wrap gap-2 text-xs">
											{#if item.feedback.counts.like}<span class="app-chip bg-secondary text-primary">喜欢 {item.feedback.counts.like}</span>{/if}
											{#if item.feedback.counts.dislike}<span class="app-chip bg-destructive/10 text-destructive">不喜欢 {item.feedback.counts.dislike}</span>{/if}
											{#if item.feedback.counts.replace}<span class="app-chip bg-accent text-accent-foreground">想替换 {item.feedback.counts.replace}</span>{/if}
											{#if item.feedback.counts.note}<span class="app-chip bg-muted text-muted-foreground">备注 {item.feedback.counts.note}</span>{/if}
										</div>
										{#each item.feedback.notes as note}
											<p class="rounded-xl bg-muted/55 p-3 text-sm"><span class="font-semibold">{note.guestName}：</span><span class="break-words text-muted-foreground">{note.note}</span></p>
										{/each}
									</article>
								{/if}
							{/each}
						{/each}
					</section>
				{/if}
			{/if}
		</section>
	{:else if activePanel === 'shopping'}
		<section class="space-y-4">
			<div class="app-panel p-5">
				<div class="mb-4 flex items-center gap-2">
					<ShoppingCart class="size-5 text-primary" />
					<h2 class="text-xl font-semibold">购物清单</h2>
				</div>
				<p class="mb-4 text-sm leading-6 text-muted-foreground">
					{#if data.shoppingList}
						已生成 {data.shoppingList.items.length} 项，可继续勾选和调整。
					{:else}
						根据当前饭单菜品食材生成买菜清单。
					{/if}
				</p>
				<div class="grid gap-3">
					{#if data.shoppingList}
						<Button href={`/app/shopping-lists/${data.shoppingList.id}`} class="h-12 rounded-2xl">
							<ShoppingCart class="size-4" />
							打开购物清单
						</Button>
					{/if}
					<form method="post" action="?/generateShoppingList" use:enhanceWithFeedback>
						<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
						<input type="hidden" name="expectedShoppingListUpdatedAt" value={data.shoppingList?.updatedAt ?? ''} />
						<Button
							type="submit"
							variant={data.shoppingList ? 'outline' : 'default'}
							class="h-12 w-full rounded-2xl bg-white"
							data-confirm={data.shoppingList ? '重新生成会替换当前购物清单项目，确认继续？' : undefined}
							data-pending-label={data.shoppingList ? '重新生成中...' : '生成中...'}
						>
							<ShoppingCart class="size-4" />
							{data.shoppingList ? '重新生成清单' : '生成购物清单'}
						</Button>
					</form>
				</div>
			</div>

			<div class="app-soft-panel space-y-3 p-5 text-sm">
				<div class="flex items-center gap-2">
					<UsersRound class="size-5 text-primary" />
					<h2 class="text-xl font-semibold">对象偏好</h2>
				</div>
					{#if data.target}
						<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">人数</span>{data.target.peopleCount} 人</p>
						<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">口味</span>{data.target.tasteNotes || '未记录'}</p>
						<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">忌口</span>{data.target.dietaryRestrictions || '未记录'}</p>
						<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">预算备注</span>{data.target.budgetNotes || '未记录'}</p>
					<Button href={`/app/targets/${data.target.id}`} variant="outline" class="h-11 rounded-2xl bg-white">打开用餐档案</Button>
				{:else}
					<p class="rounded-2xl bg-white p-3 text-muted-foreground">默认使用当前家庭。需要客户、聚餐或特殊偏好时，再补充用餐档案。</p>
				{/if}
			</div>
		</section>
	{:else}
		<section class="space-y-4">
			<details class="app-panel overflow-hidden" open>
				<summary class="cursor-pointer border-b border-border/70 bg-secondary/40 px-5 py-4 text-lg font-semibold">
					基础信息
				</summary>
				<form method="post" action="?/updateMeta" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-4 p-5">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<div class="space-y-2">
						<Label for="meal-plan-title">饭单标题</Label>
						<Input id="meal-plan-title" name="title" value={data.mealPlan.title} placeholder="例如：周三晚餐" required disabled={isArchived} class="app-input" />
						{#if form?.action === 'updateMeta' && errors.title?.[0]}
							<p class="text-sm text-destructive">{errors.title[0]}</p>
						{/if}
					</div>

					<div class="grid gap-3">
						<div class="space-y-2">
							<Label for="meal-plan-type">饭单类型</Label>
							<select id="meal-plan-type" name="type" class={selectClass} disabled={isArchived}>
								{#each data.typeOptions as option}
									<option value={option.value} selected={data.mealPlan.type === option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label for="meal-plan-target">用餐对象</Label>
							<select id="meal-plan-target" name="targetId" class={selectClass} disabled={isArchived}>
								<option value="" selected={!data.mealPlan.targetId}>未选择对象</option>
								{#each data.targets as target}
									<option value={target.id} selected={data.mealPlan.targetId === target.id}>{target.name}</option>
								{/each}
							</select>
							{#if form?.action === 'updateMeta' && errors.targetId?.[0]}
								<p class="text-sm text-destructive">{errors.targetId[0]}</p>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="start-date">开始日期</Label>
							<Input id="start-date" name="startDate" type="date" value={data.mealPlan.startDate ?? ''} disabled={isArchived} class="app-input" />
						</div>
						<div class="space-y-2">
							<Label for="end-date">结束日期</Label>
							<Input id="end-date" name="endDate" type="date" value={data.mealPlan.endDate ?? ''} disabled={isArchived} class="app-input" />
						</div>
					</div>

					<div class="space-y-2">
						<Label for="meal-plan-notes">备注</Label>
						<textarea id="meal-plan-notes" name="notes" class={textAreaClass} disabled={isArchived}>{data.mealPlan.notes ?? ''}</textarea>
					</div>

					<Button type="submit" class="h-12 w-full rounded-2xl" disabled={isArchived} data-pending-label="保存中...">
						<CheckCircle2 class="size-4" />
						保存基础信息
					</Button>
				</form>
			</details>

			<details class="app-panel overflow-hidden">
				<summary class="cursor-pointer border-b border-border/70 bg-secondary/40 px-5 py-4 text-lg font-semibold">
					添加已有菜品
				</summary>
				<form method="post" action="?/addDish" use:enhanceWithFeedback={{ pendingLabel: '添加中...' }} class="space-y-4 p-5">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<div class="space-y-2">
						<Label for="dish-id">菜品</Label>
						<select id="dish-id" name="dishId" class={selectClass} disabled={isArchived || data.dishes.length === 0} required>
							<option value="" selected>选择菜品</option>
							{#each data.dishes as dish}
								<option value={dish.id}>{dish.name}</option>
							{/each}
						</select>
						{#if form?.action === 'addDish' && errors.dishId?.[0]}
							<p class="text-sm text-destructive">{errors.dishId[0]}</p>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="add-planned-date">日期</Label>
							<Input id="add-planned-date" name="plannedDate" type="date" value={defaultDate} disabled={isArchived} class="app-input" />
						</div>
						<div class="space-y-2">
							<Label for="add-meal-slot">餐别</Label>
							<select id="add-meal-slot" name="mealSlot" class={selectClass} disabled={isArchived}>
								<option value="" selected>未设置</option>
								{#each data.mealSlotOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="add-servings">份数</Label>
						<Input id="add-servings" name="servings" type="number" min="1" max="999" value="1" disabled={isArchived} class="app-input" />
						{#if form?.action === 'addDish' && errors.servings?.[0]}
							<p class="text-sm text-destructive">{errors.servings[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="add-recommendation-rating">推荐星级</Label>
						<select id="add-recommendation-rating" name="recommendationRating" class={selectClass} disabled={isArchived}>
							{#each recommendationOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="add-notes">条目备注</Label>
						<textarea id="add-notes" name="notes" class={textAreaClass} disabled={isArchived}></textarea>
					</div>

					<Button type="submit" class="h-12 w-full rounded-2xl" disabled={isArchived || data.dishes.length === 0} data-pending-label="添加中...">
						<Plus class="size-4" />
						添加菜品
					</Button>
				</form>
			</details>

			<details class="app-panel overflow-hidden">
				<summary class="cursor-pointer border-b border-border/70 bg-secondary/40 px-5 py-4 text-lg font-semibold">
					快速新建菜品
				</summary>
				<form method="post" action="?/quickAddDish" use:enhanceWithFeedback={{ pendingLabel: '新建中...' }} class="space-y-4 p-5">
					<input type="hidden" name="expectedUpdatedAt" value={data.mealPlan.updatedAt} />
					<div class="space-y-2">
						<Label for="quick-dish-name">菜品名称</Label>
						<Input id="quick-dish-name" name="name" placeholder="例如：番茄炒蛋" disabled={isArchived} required class="app-input" />
						{#if form?.action === 'quickAddDish' && errors.name?.[0]}
							<p class="text-sm text-destructive">{errors.name[0]}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="quick-dish-category">分类</Label>
						<Input id="quick-dish-category" name="category" placeholder="家常菜" disabled={isArchived} class="app-input" />
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-2">
							<Label for="quick-planned-date">日期</Label>
							<Input id="quick-planned-date" name="plannedDate" type="date" value={defaultDate} disabled={isArchived} class="app-input" />
						</div>
						<div class="space-y-2">
							<Label for="quick-meal-slot">餐别</Label>
							<select id="quick-meal-slot" name="mealSlot" class={selectClass} disabled={isArchived}>
								<option value="" selected>未设置</option>
								{#each data.mealSlotOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="quick-servings">份数</Label>
						<Input id="quick-servings" name="servings" type="number" min="1" max="999" value="1" disabled={isArchived} class="app-input" />
					</div>

					<div class="space-y-2">
						<Label for="quick-recommendation-rating">推荐星级</Label>
						<select id="quick-recommendation-rating" name="recommendationRating" class={selectClass} disabled={isArchived}>
							{#each recommendationOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="quick-notes">条目备注</Label>
						<textarea id="quick-notes" name="notes" class={textAreaClass} disabled={isArchived}></textarea>
					</div>

					<Button type="submit" class="h-12 w-full rounded-2xl" disabled={isArchived} data-pending-label="新建中...">
						<Plus class="size-4" />
						新建并加入
					</Button>
				</form>
			</details>
		</section>
	{/if}
</main>

<MobileBottomNav />
