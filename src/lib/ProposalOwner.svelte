<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import Text from '$lib/base/Text.svelte';

	let { owner } = $props();

	let {
		group_name,
		company_name,
		type_of_group,
		social_handles,
		submited_on_behalf,
		company_domain_name,
		proposal_public_champion,
		key_info_to_identify_group
	} = owner;

	// Function to format text with links
	function formatLinks(text) {
		if (!text) return '';

		// Check if it's a valid URL with protocol
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		if (urlRegex.test(text)) {
			return text.replace(
				urlRegex,
				'<a href="$1" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline">$1</a>'
			);
		}

		// Domain with path regex (matches x.com/reitcircles)
		const domainWithPathRegex =
			/^([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
		if (domainWithPathRegex.test(text)) {
			return `<a href="https://${text}" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline">${text}</a>`;
		}

		return text;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Proposal Ownership</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#if group_name}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Group Name</div>
						<div class="text-sm">{group_name}</div>
					</div>
				{/if}

				{#if company_name}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Company Name</div>
						<div class="text-sm">{company_name}</div>
					</div>
				{/if}

				{#if type_of_group}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Type of Group</div>
						<div class="text-sm">{type_of_group}</div>
					</div>
				{/if}

				{#if social_handles}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Social Handles</div>
						<div class="text-sm">{@html formatLinks(social_handles)}</div>
					</div>
				{/if}

				{#if company_domain_name}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Company Domain</div>
						<div class="text-sm">{@html formatLinks(company_domain_name)}</div>
					</div>
				{/if}

				{#if proposal_public_champion}
					<div>
						<div class="text-muted-foreground mb-1 text-xs font-medium">Public Champion</div>
						<div class="text-sm">{proposal_public_champion}</div>
					</div>
				{/if}
			</div>

			{#if submited_on_behalf}
				<div>
					<div class="text-muted-foreground mb-1 text-xs font-medium">Submitted on Behalf</div>
					<div class="text-sm">{submited_on_behalf}</div>
				</div>
			{/if}

			{#if key_info_to_identify_group}
				<div>
					<div class="text-muted-foreground mb-1 text-xs font-medium">Key Identification Info</div>
					<Text text={key_info_to_identify_group} />
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
