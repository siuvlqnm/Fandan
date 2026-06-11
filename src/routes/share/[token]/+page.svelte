<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		AlertCircle,
		CalendarDays,
		CheckCircle2,
		ChefHat,
		Heart,
		MessageSquareText,
		RefreshCw,
		Send,
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
	const canFeedback = $derived(Boolean(data.share?.shareLink.canFeedback));
	const canConfirm = $derived(Boolean(data.share?.shareLink.canConfirm));
	const disabledByConfirmed = $derived(data.share?.mealPlan.status === 'confirmed' || data.share?.mealPlan.status === 'completed');
	const reactionOptions = [
		{ value: 'like', label: '喜欢', icon: Heart },
		{ value: 'dislike', label: '不喜欢', icon: ThumbsDown },
		{ value: 'replace', label: '想替换', icon: RefreshCw },
		{ value: 'note', label: '备注', icon: MessageSquareText }
	];
	const textAreaClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm';
</script>

<svelte:head>
	<title>{data.share ? `${data.share.mealPlan.title} / 分享确认` : '分享链接不可用 / 饭单'}</title>
</svelte:head>

<main class="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 md:gap-6 md:py-10">
	{#if data.pageError}
		<section class="rounded-lg border bg-card p-5 shadow-xs md:p-8">
			<div class="flex flex-col gap-4">
				<span class="flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
					<AlertCircle class="size-6" />
				</span>
				<div class="space-y-2">
					<p class="text-sm text-muted-foreground">分享链接</p>
					<h1 class="text-2xl font-semibold tracking-normal md:text-3xl">{data.pageError.title}</h1>
					<p class="max-w-2xl text-muted-foreground">{data.pageError.message}</p>
				</div>
			</div>
		</section>
	{:else if data.share}
		<section class="space-y-4">
			<div class="rounded-lg border bg-card p-5 shadow-xs md:p-7">
				<div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
					<div class="min-w-0 space-y-3">
						<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<span class="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
								<Utensils class="size-4" />
								饭单确认
							</span>
							<span>{data.share.mealPlan.typeLabel}</span>
							<span>{data.share.mealPlan.statusLabel}</span>
						</div>
						<div class="space-y-2">
							<h1 class="break-words text-3xl font-semibold tracking-normal md:text-4xl">{data.share.mealPlan.title}</h1>
							<p class="max-w-2xl text-muted-foreground">
								请看一下菜品安排，有不喜欢、想替换或忌口的地方可以直接标出来。
							</p>
						</div>
					</div>
					{#if canConfirm}
						<form method="post" action="?/confirm" use:enhanceWithFeedback={{ pendingLabel: '确认中...' }} class="hidden md:block">
							<Button type="submit" disabled={disabledByConfirmed} data-pending-label="确认中...">
								<CheckCircle2 class="size-4" />
								{disabledByConfirmed ? '已确认' : '确认饭单'}
							</Button>
						</form>
					{/if}
				</div>
			</div>

			<section class="grid gap-3 md:grid-cols-3">
				<Card.Root class="rounded-lg">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<CalendarDays class="size-4" />
							日期
						</Card.Title>
						<p class="text-sm text-muted-foreground">{data.share.mealPlan.dateRangeLabel}</p>
					</Card.Header>
				</Card.Root>
				<Card.Root class="rounded-lg">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<UsersRound class="size-4" />
							用餐对象
						</Card.Title>
						<p class="text-sm text-muted-foreground">
							{data.share.mealPlan.target?.name ?? '未设置对象'}
							{#if data.share.mealPlan.target}
								· {data.share.mealPlan.target.peopleCount} 人
							{/if}
						</p>
					</Card.Header>
				</Card.Root>
				<Card.Root class="rounded-lg">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base">
							<ChefHat class="size-4" />
							菜品
						</Card.Title>
						<p class="text-sm text-muted-foreground">{data.share.mealPlan.items.length} 道菜</p>
					</Card.Header>
				</Card.Root>
			</section>

			{#if data.share.mealPlan.target}
				<Card.Root class="rounded-lg">
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<UsersRound class="size-5" />
							已记录偏好
						</Card.Title>
					</Card.Header>
					<Card.Content class="grid gap-3 text-sm md:grid-cols-3">
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">口味</span>
							{data.share.mealPlan.target.tasteNotes || '未记录'}
						</p>
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">忌口</span>
							{data.share.mealPlan.target.dietaryRestrictions || '未记录'}
						</p>
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">预算备注</span>
							{data.share.mealPlan.target.budgetNotes || '未记录'}
						</p>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if form?.message}
				<p
					class:!bg-secondary={form?.success}
					class:!text-secondary-foreground={form?.success}
					class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
				>
					{form.message}
				</p>
			{/if}
			{#if errors.form?.[0]}
				<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errors.form[0]}</p>
			{/if}

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<MessageSquareText class="size-5" />
						菜品反馈
					</Card.Title>
					<Card.Description>可只填写有意见的菜。没有意见时，直接点底部确认即可。</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/feedback" use:enhanceWithFeedback={{ pendingLabel: '提交中...' }} class="space-y-5">
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="guest-name">你的称呼</Label>
								<Input id="guest-name" name="guestName" value={guestNameValue} placeholder="例如：张女士" autocomplete="name" disabled={!canFeedback} />
							</div>
							<div class="space-y-2">
								<Label for="dietary-note">全局忌口或补充</Label>
								<Input
									id="dietary-note"
									name="dietaryNote"
									value={dietaryNoteValue}
									placeholder="例如：老人不吃辣，孩子少盐"
									disabled={!canFeedback}
								/>
							</div>
						</div>

						{#if data.groups.length === 0}
							<div class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
								这份饭单暂时还没有菜品。
							</div>
						{:else}
							{#each data.groups as group}
								<section class="space-y-3">
									<div class="flex flex-wrap items-center gap-2 text-sm font-medium">
										<span class="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
											<CalendarDays class="size-4" />
											{group.dateLabel}
										</span>
										<span class="rounded-md border px-2 py-1">{group.slotLabel}</span>
									</div>

									<div class="space-y-3">
										{#each group.items as item}
											<article class="rounded-md border p-3" data-testid={`share-item-${item.id}`}>
												<input type="hidden" name="mealPlanItemId" value={item.id} />
												<div class="space-y-3">
													<div class="min-w-0">
														<div class="flex min-w-0 flex-wrap items-center gap-2">
															<h2 class="break-words text-lg font-medium">{item.dishName ?? '未关联菜品'}</h2>
															{#if item.dishCategory}
																<span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.dishCategory}</span>
															{/if}
														</div>
														<p class="text-sm text-muted-foreground">
															{item.servings} 份{item.notes ? ` · ${item.notes}` : ''}
														</p>
													</div>

													<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
														{#each reactionOptions as option}
															{@const Icon = option.icon}
															<label
																class="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
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

						<div class="flex justify-end">
							<Button type="submit" disabled={!canFeedback} data-pending-label="提交中...">
								<Send class="size-4" />
								提交反馈
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<CheckCircle2 class="size-5" />
						确认饭单
					</Card.Title>
					<Card.Description>确认后，创建者会看到这份饭单已确认。</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/confirm" use:enhanceWithFeedback={{ pendingLabel: '确认中...' }} class="space-y-4">
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="confirm-guest-name">你的称呼</Label>
								<Input id="confirm-guest-name" name="guestName" value={guestNameValue} placeholder="例如：张女士" disabled={!canConfirm || disabledByConfirmed} />
							</div>
							<div class="space-y-2">
								<Label for="confirm-dietary-note">确认时补充忌口</Label>
								<Input
									id="confirm-dietary-note"
									name="dietaryNote"
									value={dietaryNoteValue}
									placeholder="没有可留空"
									disabled={!canConfirm || disabledByConfirmed}
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="confirm-note">确认备注</Label>
							<textarea
								id="confirm-note"
								name="note"
								class={textAreaClass}
								placeholder="例如：就按这份菜单准备"
								disabled={!canConfirm || disabledByConfirmed}
							>{confirmNoteValue}</textarea>
						</div>
						<Button type="submit" class="w-full" disabled={!canConfirm || disabledByConfirmed} data-pending-label="确认中...">
							<CheckCircle2 class="size-4" />
							{disabledByConfirmed ? '这份饭单已确认' : '确认这份饭单'}
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</section>
	{/if}
</main>
