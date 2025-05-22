<script>
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table/index.js';
	import { goto } from '$app/navigation';
	import { shortenString, convertTimestamp } from '$lib/utils.js';
	import Search from '$lib/base/Search.svelte';
	import Sort from '$lib/base/Sort.svelte';
	import Filter from '$lib/base/Filter.svelte';
	import Pagination from '$lib/base/Pagination.svelte';
	let search = $state('');
	let { data } = $props();

	let voters = $derived(data.voters);
</script>

<h1>Voter Directory</h1>

<p>
	Search for voters by stake address, DRep-Id or Pool-Id. The list below shows all active voters on
	all ballots accumulated.
</p>

<section class="relative mt-6">
	<header class="mb-4 items-center justify-between sm:flex">
		<h2 class="mb-3">Active Voters ({data.pagination.total})</h2>
		<div class="flex justify-between gap-1">
			<Search />
			<Sort
				sortOptions={[
					{ label: 'Votes', value: 'votes' },
					{ label: 'VoterId', value: 'voterId' },
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
					<Table.Head class="w-[100px]">VoterId</Table.Head>
					<Table.Head class="pr-0 text-right">Last Login</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body class="border-b">
				{#each voters as voter}
					<Table.Row>
						<Table.Cell class="pl-0 align-top">{voter.votes}</Table.Cell>
						<Table.Cell class="align-top font-medium">
							<a href={`/voters/${voter.voterId}`} class="text-sm font-semibold">
								{shortenString(voter.voterId, 20, true)}
							</a>
						</Table.Cell>
						<Table.Cell class="pr-0 text-right">
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
