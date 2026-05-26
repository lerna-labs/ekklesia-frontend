<script>
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table/index.js';
	import { goto } from '$app/navigation';
	import { shortenString, convertTimestamp, voterDisplayName } from '$lib/utils.js';
	import Search from '$lib/base/Search.svelte';
	import Sort from '$lib/base/Sort.svelte';
	import Filter from '$lib/base/Filter.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
	import { content } from '$lib/content.js';
	let search = $state('');
	let { data } = $props();

	let voters = $derived(data.voters);
	const intro = content.voterDirectory.intro;
</script>

<h1>{intro?.data.title ?? 'Voter Directory'}</h1>

{#if intro?.body}
	<MarkdownBrief markdown={intro.body} />
{/if}

<section class="relative mt-6">
	<header class="mb-4 items-center justify-between sm:flex">
		<h2 class="mb-3">Active Voters ({data.pagination.total})</h2>
		<div class="flex justify-between gap-1">
			<Search />
			<Sort
				sortOptions={[
					{ label: 'Votes', value: 'votes' },
					{ label: 'Voter ID', value: 'userId' },
					{ label: 'Last Vote', value: 'lastVoteAt' },
					{ label: 'Last Login', value: 'lastLogin' }
				]}
			/>
			<!-- <Filter filterOptions={data.filterOptions} /> -->
		</div>
	</header>
</section>

{#if data.voters.length > 0}
	<section class="mt-2">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[40px] pl-0">Votes</Table.Head>
					<Table.Head>Voter</Table.Head>
					<Table.Head class="pr-0 text-right sm:pr-4">Last Vote</Table.Head>
					<Table.Head class="hidden pr-0 text-right sm:table-cell">Last Login</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body class="border-b">
				{#each voters as voter (voter.userId)}
					{@const displayName = voterDisplayName(voter)}
					<Table.Row>
						<Table.Cell class="pl-0 align-top">{voter.votes}</Table.Cell>
						<Table.Cell class="align-top">
							<a
								href={`/voter-directory/${voter.userId}`}
								class="block leading-tight hover:text-brand"
							>
								{#if displayName}
									<span class="text-sm font-semibold">{displayName}</span>
									<span class="block font-mono text-xs text-muted-foreground">
										{shortenString(voter.userId, 20, true)}
									</span>
								{:else}
									<span class="font-mono text-sm font-semibold">
										{shortenString(voter.userId, 20, true)}
									</span>
								{/if}
							</a>
						</Table.Cell>
						<Table.Cell class="pr-0 align-top text-right sm:pr-4">
							{voter.lastVoteAt ? convertTimestamp(voter.lastVoteAt) : ''}
						</Table.Cell>
						<Table.Cell class="hidden pr-0 align-top text-right sm:table-cell">
							{voter.lastLogin ? convertTimestamp(voter.lastLogin) : ''}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		{#if data.pagination.totalPages > 1}
			<div class="mt-4 flex justify-center">
				<Pagination
					count={data.pagination.total}
					perPage={data.perPage}
					currentPage={data.currentPage}
					{...data.pagination}
				/>
			</div>
		{/if}
	</section>
{/if}

<div class="mt-12"></div>
