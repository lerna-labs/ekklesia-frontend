<script>
	let { vote } = $props();
</script>

<div class="flex flex-col items-end gap-0.5 md:max-w-[30vw] md:flex-row md:flex-wrap md:items-end md:justify-end md:gap-0.5">
		{#each vote as label}
									<div
										class="mb-0.5 w-full overflow-hidden whitespace-nowrap rounded-md px-3 py-1 text-center text-xs md:inline-flex md:w-auto {label ===
										'Yes'
											? 'bg-green-500 text-green-100'
											: label === 'No'
												? 'bg-red-500 text-red-100'
												: 'bg-slate-500 text-slate-100'}"
									>
										{isNaN(Number(label)) ? label.charAt(0).toUpperCase() + label.slice(1) : label}
									</div>
								{/each}
							</div>