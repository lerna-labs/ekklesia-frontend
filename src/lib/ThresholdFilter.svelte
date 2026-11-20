<script>
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { goto } from '$app/navigation';

  import { page } from '$app/stores';

  const LABELS = { All: 'All', true: 'Reached', false: 'Not reached' };
  const param = $derived($page.url.searchParams.get('thresholdReached'));
  const current = $derived(param === 'true' || param === 'false' ? param : 'All');

  function apply(value) {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    if (value === 'true' || value === 'false') {
      url.searchParams.set('thresholdReached', value);
    } else {
      url.searchParams.delete('thresholdReached');
    }
    goto(url.toString(), { replaceState: true, keepFocus: true });
  }
</script>

<div class="flex items-center gap-2">
  <Label for="thresholdReached" class="text-xs">Threshold</Label>
  <Select.Root type="single" value={current} onValueChange={(v) => v !== current && apply(v)}>
    <Select.Trigger id="thresholdReached" class="h-8 w-32 text-xs">{LABELS[current]}</Select.Trigger
    >
    <Select.Content>
      <Select.Item value="All">All</Select.Item>
      <Select.Item value="true">Reached</Select.Item>
      <Select.Item value="false">Not reached</Select.Item>
    </Select.Content>
  </Select.Root>
</div>
