<script>
	import { Button } from '$lib/components/ui/button/index.js';
	let { data, filename = 'download' } = $props();
	function downloadJson() {
		// Convert data to a JSON string with pretty formatting
		const jsonString = JSON.stringify(data, null, 2);

		// Create a blob from the JSON string
		const blob = new Blob([jsonString], { type: 'application/json' });

		// Create a URL for the blob
		const url = URL.createObjectURL(blob);

		// Create a temporary anchor element to trigger the download
		const a = document.createElement('a');
		a.href = url;
		a.download = `${filename}.json`;

		// Append the anchor to the document, click it, and then remove it
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 0);
	}
</script>

<Button onclick={downloadJson}>Download Transaction Data</Button>
