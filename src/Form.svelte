<script>
  import { quintOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import Results from "./Results.svelte";

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

  let payments = [];
  let name = "";
  let pay;

  payments = [
    { id: 1, done: true, name: "Bufarra", pay: 40 },
    { id: 2, done: false, name: "Martin", pay: 600 },
    { id: 3, done: false, name: "Joni", pay: 150 },
    { id: 4, done: false, name: "Pedro", pay: 0 },
    { id: 5, done: false, name: "Cachi", pay: 0 },
    { id: 6, done: true, name: "Gisela", pay: 200 },
    { id: 7, done: true, name: "Eze", pay: 0 }
  ];

  /* let result = [
    {
      id: 2,
      name: "Martin",
      debtors: [
        { id: 3, name: "Bufarra", pay: 101, payment: 33 },
        { id: 3, name: "Pedro", pay: 141, payment: 33 },
        { id: 3, name: "Cachi", pay: 141, payment: 33 },
        { id: 3, name: "Eze", pay: 76, payment: 33 }
      ]
    },
    {
      name: "Gisela",
      debtors: [{ name: "Eze", pay: 54, payment: 33 }]
    },

    {
      name: "Joni",
      debtors: [{ name: "Eze", pay: 11, payment: 33 }]
    }
  ]; */

  function add() {
    if (validate(name)) {
      let uid = payments.length + 1;
      const payment = {
        id: uid++,
        done: false,
        name: name,
        pay: isNaN(pay) || pay === "" ? 0 : parseFloat(pay)
      };
      payments = [payment, ...payments];
      document.getElementById("myForm").reset();
      name = "";
      pay = "";
    }
  }

  function validate(nombre) {
    if (nombre === "") {
      document.form.name.focus();
      return false;
    } else {
      return true;
    }
  }

  function remove(payment) {
    payments = payments.filter(t => t !== payment);
  }

  $: calculate = function() {
    const output = { total: 0, individualPayment: 0, result: [] };
    let balance = arrangeInitialConditions(output);
    let { creditors, debtors } = devideList(balance);

    output.result = creditors.map(creditor => {
      debtors.map(debtor => {
        if (debtor.pay > 0 && creditor.pay < 0) {
          const payment = getDebtorPayment(debtor, creditor.pay);
          debtor.pay -= payment;
          creditor.pay += payment;
          composeOutputObj(creditor, debtor, payment);
        }
      });
      return creditor;
    });

    return output;
  };

  $: arrangeInitialConditions = function(output) {
    let payers = payments.filter(t => t.done);
    output.total = payers.reduce((acc, curr) => acc + +(curr.pay || 0).toFixed(2), 0);
    output.individualPayment = +(output.total / payers.length).toFixed(2);
    return payers.map(payment => {
      return {
        ...payment, //spread all props to new object except the one you need to change
        pay: output.individualPayment - payment.pay
      };
    });
  };

  $: devideList = function(balance) {
    return {
      creditors: balance
        .filter(e => e.pay < 0)
        .sort((a, b) => (a.pay > b.pay ? 1 : -1)),
      debtors: balance
        .filter(e => e.pay >= 0)
        .sort((a, b) => (a.pay > b.pay ? -1 : 1))
    };
  };

  $: getDebtorPayment = function(debtor, yetToPay) {
    const willCreditorStillOwed = debtor.pay + yetToPay < 0;
    return willCreditorStillOwed ? debtor.pay : yetToPay * -1;
  };

  $: composeOutputObj = function(creditor, debtor, payment) {
    const obj = { payment: payment.toFixed(2), ...debtor };
    if (creditor.hasOwnProperty("debtors")) {
      creditor.debtors.push(obj);
    } else {
      creditor["debtors"] = [obj];
    }
  };
</script>

<style>
  input {
    margin: 10px;
    border: 0;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 10px;
    color: white;
    font-size: 22px;
  }

  ::placeholder {
    opacity: 0.7;
  }

  input[type="checkbox"] {
    margin: 0;
    display: none;
  }

  .lists {
    display: inline-block;
    width: 100%;
  }

  .left,
  .right {
    float: left;
    width: 50%;
    padding: 0 0.2em 0 0.2em;
    box-sizing: border-box;
  }

  label {
    border: solid;
    border-radius: 2px;
    border-width: 2px;
    border-color: black;
    display: block;
    text-align: left;
    font-size: 0.9em;
    padding: 0.3em;
    margin: 0 auto 0.3em auto;
    background-color: rgba(0, 0, 0, 0.6);
  }

  .right label {
    background-color: rgba(4, 164, 4, 0.2);
    border-color: rgb(71, 155, 71);
  }

  button {
    font-size: 20px;
    display: inline-block;
    border-radius: 4px;
    background-color: #f4511e;
    border: none;
    color: #ffffff;
    text-align: center;
    font-size: 21px;
    transition: all 0.5s;
    padding: 10px 20px 13px 20px;
    margin-top: 10px;
  }

  .badge {
    float: right;
    position: relative;
    background: none;
    color: white;
    border: 0px;
    padding: 0px;
    font-size: 17px;
    margin-top: 4px;
  }
</style>

<div class="board">
  <form name="form" id="myForm">
    <input name="name" type="text" placeholder="Nombre" bind:value={name} />
    <input type="number" placeholder="¿cuánto gastó?" bind:value={pay} />
    <button on:click|preventDefault={add}>
      <span>Agregar al listado</span>
    </button>
  </form>
</div>

<div class="lists">
  <div class="left">
    <h2>Vinieron</h2>
    {#each payments.filter(t => !t.done) as payment (payment.id)}
      <label
        in:receive={{ key: payment.id }}
        out:send={{ key: payment.id }}
        animate:flip>
        <input
          type="checkbox"
          bind:checked={payment.done}
          on:click={calculate()} />
        {payment.name + ': ' + payment.pay}
        <button class="badge" on:click={() => remove(payment)}>
          <i class="fas fa-trash-alt" />
        </button>
      </label>
    {/each}
  </div>

  <div class="right">
    <h2>Pagan</h2>
    {#each payments.filter(t => t.done) as payment (payment.id)}
      <label
        in:receive={{ key: payment.id }}
        out:send={{ key: payment.id }}
        animate:flip>
        <input
          type="checkbox"
          bind:checked={payment.done}
          on:click={calculate} />
        {payment.name + ': ' + payment.pay}
        <button class="badge" on:click={() => remove(payment)}>
          <i class="fas fa-trash-alt" />
        </button>
      </label>
    {/each}
  </div>
</div>

{#if payments.filter(p => p.done).length > 0}
  <Results {...calculate()} />
{/if}
