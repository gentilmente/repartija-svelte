<script>
  export let total;
  export let individualPayment;
  export let result;
</script>

<style>
  #total {
    text-align: left;
    margin-left: 0.5em;
  }

  #indPay {
    text-align: right;
    margin: -0.5em 0.5em 0.5em 0;
  }

  .box {
    font-size: 25px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100vw;
    padding-left: 5%;
    margin-bottom: 2em;
  }

  .box .debtors {
    padding-left: 10%;
  }
</style>

<h2>Resultado:</h2>
<p id="total">total: ${total}</p>
<p id="indPay">pago individual: ${individualPayment}</p>
<div class="box">

  {#each result as item}
    <div>
      A
      <b>{item.name}</b>
      le deben pagar
    </div>
    {#each item.debtors as d}
      <div class="debtors">{d.name + ': $' + d.payment}</div>
    {/each}
  {/each}

</div>
