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
  let total;
  let individualPayment = 0;
  let name = "";
  let pay;
  let debtorss = [];
  let credAccum;
  let actualCreditorAmount;

  payments = [
    {
      id: 1,
      done: true,
      name: "Bufarra",
      pay: 40
    },
    {
      id: 2,
      done: true,
      name: "Martin",
      pay: 600
    },
    {
      id: 3,
      done: true,
      name: "Joni",
      pay: 150
    },
    {
      id: 4,
      done: true,
      name: "Pedro",
      pay: 0
    },
    {
      id: 5,
      done: true,
      name: "Cachi",
      pay: 0
    },
    {
      id: 6,
      done: true,
      name: "Gisela",
      pay: 200
    },
    {
      id: 7,
      done: true,
      name: "Eze",
      pay: 0
    }
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
    let uid = payments.length + 1;
    const payment = {
      id: uid++,
      done: false,
      name: name,
      pay: pay
    };
    payments = [payment, ...payments];
  }

  function remove(payment) {
    payments = payments.filter(t => t !== payment);
  }

  $: calculate = function() {
    let balance = prepareDataSet();
    let { creditors, debtors } = devideList(balance);

    let result = creditors.map(cred => collect(cred, debtors));
    console.log(result);
    return {
      total,
      individualPayment,
      result
    };
  };

  let prepareDataSet = function() {
    let payers = payments.filter(t => t.done);
    total = payers.reduce((a, b) => a + (b["pay"] || 0), 0);
    individualPayment = Math.round(total / payers.length);
    return payers.map(payment => {
      return {
        ...payment, //spread all props to new object except the one you need to change
        pay: individualPayment - payment.pay
      };
    });
  };

  let devideList = function(balance) {
    return {
      creditors: balance
        .filter(e => e.pay < 0)
        .sort((a, b) => (a.pay > b.pay ? 1 : -1)),
      debtors: balance
        .filter(e => e.pay >= 0)
        .sort((a, b) => (a.pay > b.pay ? -1 : 1))
    };
  };

  let collect = function(creditor, debtors) {
    actualCreditorAmount = creditor.pay;
    credAccum = 0;
    debtors.map(debtor => toPay(debtor, creditor));
    return creditor; //construir un objeto custom para output.
  };

  let toPay = function(debtor, creditor) {
    //no actualizar listas hacerlas const (inmutables?)
    const credAmount = creditor.pay;
    if (debtor.pay > 0 && actualCreditorAmount < 0) {
      credAccum += debtor.pay;
      let yetToPay = credAccum + credAmount;
      if (yetToPay > 0 && yetToPay < individualPayment) {
        let payment = debtor.pay - yetToPay;
        setBalance(creditor, debtor, payment);
      } else if (debtor.pay < individualPayment) {
        setBalance(creditor, debtor, debtor.pay);
      } else if (yetToPay <= 0) {
        setBalance(creditor, debtor, individualPayment);
      }
    }
  };

  let setBalance = function(creditor, debtor, payment) {
    creditor.pay += payment;
    actualCreditorAmount = creditor.pay;
    generateOutput(creditor, debtor, payment);
  };

  let generateOutput = function(creditor, debtor, payment) {
    if (creditor.hasOwnProperty("debtors")) {
      creditor.debtors.push({ ...debtor, payment: payment });
    } else {
      creditor["debtors"] = [{ ...debtor, payment: payment }];
    }
  };
</script>

<style>
  .board {
    max-width: 36em;
    margin: 0 auto;
  }

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

  input[type="button"] {
    background: red;
    color: white;
  }

  input[type="checkbox"] {
    margin: 0;
    display: none;
  }

  .left,
  .right {
    float: left;
    width: 50%;
    padding: 0 0.5em 0 0;
    box-sizing: border-box;
  }

  h2 {
    font-size: 2em;
    font-weight: 200;
  }

  label {
    top: 0;
    left: 0;
    display: block;
    text-align: left;
    font-size: 0.9em;
    line-height: 1;
    padding: 0.3em;
    margin: 0 auto 0.3em auto;
    border-radius: 2px;
    background-color: black;
    user-select: none;
  }

  .right label {
    background-color: rgb(92, 160, 2);
  }

  .badge {
    float: right;
    position: relative;
    top: -4px;
    padding: 5px 10px;
    border-radius: 50%;
    background: red;
    color: white;
    border: 0px;
  }
</style>

<div class="board">
  <div>
    <input type="text" placeholder="Nombre" bind:value={name} />
  </div>
  <div>
    <input type="number" placeholder="¿cuánto gastó?" bind:value={pay} />
  </div>
  <div>
    <input type="button" value="Agregar al listado" on:click={add} />
  </div>

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
        <button class="badge" on:click={() => remove(payment)}>X</button>
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
        <button class="badge" on:click={() => remove(payment)}>X</button>
      </label>
    {/each}
  </div>
  {#if payments.filter(p => p.done).length > 0}
    <Results {...calculate()} />
  {/if}
</div>
