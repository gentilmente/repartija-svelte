<script>
	import Start from './Start.svelte';
	import Form from './Form.svelte';

	export let menu = 1;
</script>

<main>
	<h1><a href='/'>Repartija</a></h1>
	<p class="subtitle">No mas ebrios haciendo cuentas</p>

	{#if menu === 1}
		<Start on:click = {()=> menu = 2} />
	{:else if menu === 2}
		<Form/>
		<!--{console.log(menu)}-->
	{:else}
		<h1>
			Page Not Found
		</h1>
	{/if}
		
</main>

<style>
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>