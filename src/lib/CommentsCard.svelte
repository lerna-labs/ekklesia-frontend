<script>
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import Text from '$lib/base/Text.svelte';
  import { shortenString } from '$lib/utils.js';

  // Initialize the relativeTime plugin
  dayjs.extend(relativeTime);

  let { comment } = $props();

  // Use a derived value instead of modifying the prop
  let formattedTime = $derived(formatTimestamp(comment.createdAt));

  /**
   * Formats a timestamp into a human-readable string:
   * - Just now (less than 1 minute ago)
   * - X minutes ago (less than 1 hour)
   * - X hours ago (less than 24 hours)
   * - Yesterday (1 day ago)
   * - Last week (within last 7 days)
   * - Full date (older than a week)
   *
   * @param {string} timestamp - ISO format date string
   * @returns {string} Formatted time string
   */
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown date';

    const now = dayjs();
    const date = dayjs(timestamp);

    // Calculate the difference in various units
    const diffMinutes = now.diff(date, 'minute');
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');

    // Format based on how long ago it was
    if (diffMinutes < 5) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 8) {
      return 'Last week';
    } else {
      // For older dates, show the full date in a nice format
      return date.format('MMM D, YYYY');
    }
  }
</script>

<article class="mb-2">
  <div class="flex items-center justify-between">
    <div class="text-sm font-semibold">
      {shortenString(comment.voterId, 20, true)}
    </div>
    <div class="text-xs text-gray-500">{formattedTime}</div>
  </div>
  <div class="text-sm">
    <Text text={comment.content} />
  </div>
</article>
