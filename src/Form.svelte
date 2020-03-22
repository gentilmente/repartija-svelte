<script>
  import { quintOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";

  const [send, receive] = crossfade({
    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: 600,
        easing: quintOut,
        css: t => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
      };
    }
  });

  let payments = [
    {
      id: 1,
      done: false,
      name: "Gise"
    },
    {
      id: 2,
      done: false,
      name: "Coral"
    },
    {
      id: 3,
      done: true,
      name: "María"
    },
    {
      id: 4,
      done: false,
      name: "Minna"
    },
    {
      id: 5,
      done: false,
      name: "Carlos"
    },
    {
      id: 6,
      done: false,
      name: "Vanesa"
    }
  ];

  let uid = payments.length + 1;

  function add(input) {
    const payment = {
      id: uid++,
      done: false,
      name: input.value
    };

    payments = [payment, ...payments];
    input.value = "";
  }

  function remove(payment) {
    payments = payments.filter(t => t !== payment);
  }
</script>

<div class="board">
  <div>
    <input
      class="new-payment"
      type="text"
      name="user_name"
      placeholder="Nombre"
    />
  </div>
  <div>
    <input type="number" name="cantidad" placeholder="¿cuánto gastó?" />
  </div>

  <div>
    <input
      type="submit"
      value="Agregar al listado"
      on:keydown="{event => event.which === 13 && add(event.target)}"
    />
  </div>

  <div class="left">
    <h2>Vinieron</h2>
    {#each payments.filter(t => !t.done) as payment (payment.id)}
    <label
      in:receive="{{key: payment.id}}"
      out:send="{{key: payment.id}}"
      animate:flip
    >
      <input type="checkbox" bind:checked="{payment.done}" />
      {payment.name}
      <button on:click="{() => remove(payment)}">x</button>
    </label>
    {/each}
  </div>

  <div class="right">
    <h2>Pagan</h2>
    {#each payments.filter(t => t.done) as payment (payment.id)}
    <label
      in:receive="{{key: payment.id}}"
      out:send="{{key: payment.id}}"
      animate:flip
    >
      <input type="checkbox" bind:checked="{payment.done}" />
      {payment.name}
      <button on:click="{() => remove(payment)}">x</button>
    </label>
    {/each}
  </div>
</div>

<style>
  /*

  .new-payment {
    font-size: 1.4em;
    width: 100%;
    margin: 2em 0 1em 0;
  }
  */
  input {
    position: relative;
    opacity: 0.8;
    margin: 10px;
    border: 0;
    background-color: black;
    padding: 10px;
    color: white;
    font-size: 22px;
  }

  input[type="submit"] {
    background: red;
    color: white;
  }

  .board {
    max-width: 36em;
    margin: 0 auto;
  }

  .left,
  .right {
    float: left;
    width: 50%;
    padding: 0 1em 0 0;
    box-sizing: border-box;
    opacity: 0.8;
  }

  h2 {
    font-size: 2em;
    font-weight: 200;
    user-select: none;
  }

  label {
    top: 0;
    left: 0;
    display: block;
    font-size: 1em;
    line-height: 1;
    padding: 0.5em;
    margin: 0 auto 0.5em auto;
    border-radius: 2px;
    background-color: black;
    user-select: none;
  }

  .right label {
    background-color: rgb(92, 160, 2);
  }

  button {
    float: right;
    height: 1em;
    box-sizing: border-box;
    padding: 0 0.5em;
    line-height: 1;
    background-color: transparent;
    border: none;
    color: rgb(170, 30, 30);
    opacity: 0;
    transition: opacity 0.2s;
  }

  label:hover button {
    opacity: 1;
  }
</style>
