<script>
  import * as Table from '$lib/components/ui/table/index.js';
  import { shortenString, convertTimestamp } from '$lib/utils.js';
  import Search from '$lib/base/Search.svelte';
  import Sort from '$lib/base/Sort.svelte';
  import Pagination from '$lib/base/Pagination.svelte';
  import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
  import { content } from '$lib/content.js';
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
          { label: 'Last Login', value: 'lastLogin' },
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
          <Table.Head class="w-[100px]">Voter ID</Table.Head>
          <Table.Head class="pr-0 text-right">Last Login</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body class="border-b">
        {#each voters as voter}
          <Table.Row>
            <Table.Cell class="pl-0 align-top">{voter.votes}</Table.Cell>
            <Table.Cell class="align-top font-medium">
              <a href={`/voter-directory/${voter.userId}`} class="text-sm font-semibold">
                {shortenString(voter.userId, 20, true)}
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
