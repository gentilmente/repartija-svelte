<script>
	import Start from './Start.svelte';
</script>

<main>
	<h1><a href='/'>Repartija</a></h1>
	<p class="subtitle">No mas ebrios haciendo cuentas</p>
</main>
<Start/>


<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>