<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		AlertCircle,
		CalendarDays,
		CheckCircle2,
		ChefHat,
		Heart,
		MessageCircle,
		MessageSquareText,
		RefreshCw,
		Send,
		Star,
		ThumbsDown,
		UsersRound,
		Utensils
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const formValues = $derived((form?.values ?? {}) as Record<string, unknown>);
	const guestNameValue = $derived(String(formValues.guestName ?? ''));
	const dietaryNoteValue = $derived(String(formValues.dietaryNote ?? ''));
	const confirmNoteValue = $derived(String(formValues.note ?? ''));
	const disabledByConfirmed = $derived(data.share?.mealPlan.status === 'confirmed' || data.share?.mealPlan.status === 'completed');
	const canFeedback = $derived(Boolean(data.share?.shareLink.canFeedback) && !disabledByConfirmed);
	const canConfirm = $derived(Boolean(data.share?.shareLink.canConfirm));
	const reactionOptions = [
		{ value: 'like', label: '喜欢', icon: Heart },
		{ value: 'dislike', label: '不喜欢', icon: ThumbsDown },
		{ value: 'replace', label: '想替换', icon: RefreshCw },
		{ value: 'note', label: '备注', icon: MessageSquareText }
	];
	const textAreaClass = 'app-input min-h-24 py-3';
</script>

<svelte:head>
	<title>{data.share ? `${data.share.mealPlan.title} / 分享确认` : '分享链接不可用 / 饭单'}</title>
</svelte:head>

<main class="mx-auto flex min-h-svh max-w-md flex-col gap-5 px-4 pb-8 pt-6 md:max-w-4xl md:px-6 md:py-10">
	{#if data.pageError}
		<section class="app-panel space-y-5 p-5 md:p-8">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
				<AlertCircle class="size-6" />
			</span>
			<div class="space-y-2">
				<p class="app-chip bg-muted text-muted-foreground">分享链接</p>
				<h1 class="text-2xl font-semibold tracking-normal md:text-3xl">{data.pageError.title}</h1>
				<p class="text-sm leading-6 text-muted-foreground">{data.pageError.message}</p>
			</div>
		</section>
	{:else if data.share}
		<section class="app-panel overflow-hidden border-destructive/20">
			<div class="space-y-5 bg-[linear-gradient(135deg,oklch(1_0_0),oklch(0.985_0.02_25))] p-5">
				<div class="flex flex-wrap items-center gap-2">
					<p class="app-chip bg-destructive/10 text-destructive">饭单确认</p>
					<p class="app-chip bg-white text-muted-foreground">{data.share.mealPlan.typeLabel}</p>
					<p class="app-chip bg-white text-primary">{data.share.mealPlan.statusLabel}</p>
				</div>
				<div class="space-y-2">
					<h1 class="break-words text-3xl font-semibold leading-tight">{data.share.mealPlan.title}</h1>
					<p class="text-sm leading-6 text-muted-foreground">
						请看一下菜品安排，有不喜欢、想替换或忌口的地方可以直接标出来。
					</p>
				</div>
				<div class="grid grid-cols-3 divide-x divide-border/70 rounded-2xl bg-white p-3 text-center text-sm">
					<p>
						<CalendarDays class="mx-auto mb-1 size-5 text-primary" />
						<span class="block truncate text-muted-foreground">{data.share.mealPlan.dateRangeLabel}</span>
					</p>
					<p>
						<UsersRound class="mx-auto mb-1 size-5 text-primary" />
						<span class="block truncate text-muted-foreground">
							{data.share.mealPlan.target?.name ?? '当前家庭'}
						</span>
					</p>
					<p>
						<ChefHat class="mx-auto mb-1 size-5 text-primary" />
						<span class="block text-muted-foreground">{data.share.mealPlan.items.length} 道菜</span>
					</p>
				</div>
			</div>
		</section>

		{#if form?.message}
			<p
				class:!bg-secondary={form?.success}
				class:!text-secondary-foreground={form?.success}
				class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
			>
				{form.message}
			</p>
		{/if}
		{#if data.confirmedNow}
			<p class="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">已确认这份饭单，创建者会收到确认结果。</p>
		{/if}
		{#if errors.form?.[0]}
			<p class="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{errors.form[0]}</p>
		{/if}

		{#if data.share.mealPlan.target}
			<section class="app-soft-panel space-y-3 p-5">
				<div class="flex items-center gap-2">
					<UsersRound class="size-5 text-primary" />
					<h2 class="text-xl font-semibold">已记录偏好</h2>
				</div>
				<div class="grid gap-2 text-sm">
					<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">口味</span>{data.share.mealPlan.target.tasteNotes || '未记录'}</p>
					<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">忌口</span>{data.share.mealPlan.target.dietaryRestrictions || '未记录'}</p>
					<p class="rounded-2xl bg-white p-3"><span class="block text-muted-foreground">预算备注</span>{data.share.mealPlan.target.budgetNotes || '未记录'}</p>
				</div>
			</section>
		{/if}

		<section class="app-panel p-5">
			<div class="mb-5 space-y-1">
				<div class="flex items-center gap-2">
					<MessageCircle class="size-5 text-primary" />
					<h2 class="text-xl font-semibold">菜品反馈</h2>
				</div>
				<p class="text-sm text-muted-foreground">只填写有意见的菜；没有意见时，直接底部确认。</p>
			</div>
			{#if disabledByConfirmed}
				<div class="rounded-2xl bg-secondary/60 p-4 text-sm leading-6 text-secondary-foreground">
					这份饭单已经确认，反馈已停止收集。如需调整，请联系饭单创建者重新发起确认。
				</div>
			{:else if !canFeedback}
				<div class="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
					创建者这次只开放查看或最终确认，没有开放菜品反馈。
				</div>
			{:else}
			<form method="post" action="?/feedback" use:enhanceWithFeedback={{ pendingLabel: '提交中...' }} class="space-y-5">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="guest-name">你的称呼</Label>
						<Input id="guest-name" name="guestName" value={guestNameValue} placeholder="例如：张女士" autocomplete="name" disabled={!canFeedback} class="app-input" />
					</div>
					<div class="space-y-2">
						<Label for="dietary-note">全局忌口或补充</Label>
						<Input
							id="dietary-note"
							name="dietaryNote"
							value={dietaryNoteValue}
							placeholder="例如：老人不吃辣，孩子少盐"
							disabled={!canFeedback}
							class="app-input"
						/>
					</div>
				</div>

				{#if data.groups.length === 0}
					<div class="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
						这份饭单暂时还没有菜品。
					</div>
				{:else}
					{#each data.groups as group}
						<section class="space-y-3">
							<div class="flex flex-wrap items-center gap-2 text-sm font-medium">
								<span class="app-chip bg-secondary text-primary">
									<CalendarDays class="size-4" />
									{group.dateLabel}
								</span>
								<span class="app-chip bg-muted text-muted-foreground">{group.slotLabel}</span>
							</div>

							<div class="space-y-3">
								{#each group.items as item, index}
									<article class="rounded-2xl border border-border/80 bg-white p-3" data-testid={`share-item-${item.id}`}>
										<input type="hidden" name="mealPlanItemId" value={item.id} />
										<div class="space-y-3">
											<div class="flex items-start gap-3">
												<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
												<div class="min-w-0 flex-1">
													<div class="flex min-w-0 flex-wrap items-center gap-2">
														<h3 class="break-words text-lg font-semibold">{item.dishName ?? '未关联菜品'}</h3>
														{#if item.dishCategory}
															<span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{item.dishCategory}</span>
														{/if}
													</div>
													{#if item.recommendationRating}
														<p class="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
															<Star class="size-3.5 fill-current" />
															主理人推荐 {item.recommendationRating} 星
														</p>
													{/if}
													<p class="text-sm text-muted-foreground">
														{item.servings} 份{item.notes ? ` · ${item.notes}` : ''}
													</p>
												</div>
											</div>

											<div class="grid grid-cols-2 gap-2">
												{#each reactionOptions as option}
													{@const Icon = option.icon}
													<label
														class="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border bg-white px-2 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
													>
														<input
															class="sr-only"
															type="radio"
															name={`reaction-${item.id}`}
															value={option.value}
															disabled={!canFeedback}
														/>
														<Icon class="size-4" />
														{option.label}
													</label>
												{/each}
											</div>

											<div class="space-y-2">
												<Label for={`note-${item.id}`}>这道菜备注</Label>
												<textarea
													id={`note-${item.id}`}
													name={`note-${item.id}`}
													class={textAreaClass}
													placeholder="例如：这道少辣，或者换成清淡一点的菜"
													disabled={!canFeedback}
												></textarea>
											</div>
										</div>
									</article>
								{/each}
							</div>
						</section>
					{/each}
				{/if}

				<Button type="submit" variant="outline" class="h-12 w-full rounded-2xl bg-white" disabled={!canFeedback} data-pending-label="提交中...">
					<Send class="size-4" />
					提交反馈
				</Button>
			</form>
			{/if}
		</section>

		{#if canConfirm}
			<section class="app-panel space-y-4 border-primary/20 p-4">
				{#if disabledByConfirmed}
					<div class="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
						<CheckCircle2 class="size-6 shrink-0 text-primary" />
						<div>
							<p class="font-semibold">这份饭单已确认</p>
							<p class="text-sm opacity-80">创建者已经收到确认结果。</p>
						</div>
					</div>
				{:else}
				<form method="post" action="?/confirm" use:enhanceWithFeedback={{ pendingLabel: '确认中...' }} class="space-y-3">
					<div class="space-y-2">
						<Label for="confirm-guest-name">你的称呼</Label>
						<Input id="confirm-guest-name" name="guestName" placeholder="例如：张女士" autocomplete="name" class="app-input" />
					</div>
					<div class="space-y-2">
						<Label for="confirm-note">确认备注</Label>
						<textarea
							id="confirm-note"
							name="note"
							class={textAreaClass}
							placeholder="例如：都可以，孩子那份少盐"
						>{confirmNoteValue}</textarea>
						{#if errors.note?.[0]}
							<p class="text-sm text-destructive">{errors.note[0]}</p>
						{/if}
					</div>
					<Button type="submit" class="h-12 w-full rounded-2xl text-base" data-pending-label="确认中...">
						<CheckCircle2 class="size-4" />
						确认这份饭单
					</Button>
				</form>
				{/if}
			</section>
		{/if}
	{/if}
</main>
