<script>
  import { toast } from 'svelte-sonner';
  import { loggedIn } from '$stores/sessionManager.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { api } from '$stores/sessionManager.js';
  import CommentsCard from '$lib/CommentsCard.svelte';
  let { proposal, ballot, inline = false, outline } = $props();
  let comments = $state([]);
  let comment = $state('');
  let commentCount = $derived(proposal.commentCount || 0);
  let loading = $state(true);

  async function fetchComments() {
    const response = await api.fetch(fetch, '/proposals/' + proposal._id + '/comments');
    const data = await response.json();
    comments = data;
    if (!response.ok) {
      toast.error('Failed to fetch comments');
      return;
    }
  }

  async function postComment() {
    try {
      const response = await api.fetch(fetch, '/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment, proposalId: proposal._id }),
      });
      const data = await response.json();
      comments = [data, ...comments];
      commentCount = comments.length;
      comment = '';
      toast.success('Comment posted successfully');

      if (!response.ok) {
        let error = await response.json();
        toast.error(error.message);
        return;
      }
    } catch (error) {
      toast.error('Error posting comment: ' + error.body.message);
      console.error('Error posting comment:', error);
      return;
    }
  }
</script>

<Dialog.Root
  onOpenChange={async (open) => {
    if (open) {
      loading = true;
      await fetchComments();
      loading = false;
    } else {
      comments = [];
      comment = '';
    }
  }}
>
  <Dialog.Trigger
    class={outline
      ? buttonVariants({ variant: 'outline', size: 'sm' })
      : buttonVariants({ variant: 'secondary', size: 'sm' })}
  >
    Comments ({commentCount})
  </Dialog.Trigger>
  {#if !loading}
    <Dialog.Content class="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[480px]">
      <Dialog.Header>
        <Dialog.Title>Comments</Dialog.Title>
      </Dialog.Header>

      {#each comments as commentItem, index (commentItem._id)}
        <CommentsCard comment={commentItem} {index} />
      {/each}

      {#if comments.length == 0}
        <p class="text-muted-foreground">No comments yet.</p>
      {/if}

      {#if ballot.status != 'live' && ballot.status != 'upcoming'}
        <p class="text-sm text-red-600">Voting no this ballot has ended and comments are closed.</p>
      {:else if !$loggedIn || ($loggedIn && !ballot.voterValidated)}
        <p class="text-sm text-red-600">
          You must be a valid voter on this ballot and logged in to post comments on this proposal.
        </p>
      {:else}
        <div class="relative">
          <div class="absolute bottom-[24px] right-0 text-xs text-slate-500">
            {comment.length}/1000
          </div>
          <Textarea
            placeholder="Type your comment here."
            bind:value={comment}
            rows="6"
            class="mb-0"
            maxlength="1000"
          />
          <Button
            class="mt-2"
            onclick={postComment}
            disabled={comment.length < 3 || comment.length > 1000}
          >
            Post Comment
          </Button>
        </div>
      {/if}
    </Dialog.Content>
  {/if}
</Dialog.Root>
