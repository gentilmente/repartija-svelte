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
    align-items: flex-end;
    text-align: right;
    margin: -0.5em 0.5em 0.5em 0;
  }

  .box {
    font-size: 28px;
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

  em {
    color: rgb(153, 230, 153);
    letter-spacing: 0.032em;
    font-size: 1.3em;
  }
</style>

<h2>Resultado:</h2>
<div class="box">
  <p id="total">
    total: $
    <em>{total}</em>
  </p>
  <p id="indPay">
    pago individual: $
    <em>{individualPayment}</em>
  </p>

  {#each result as item}
    <div>
      A
      <em>{item.name}</em>
      <!--{item.debtors.length === 1 ? 'le debe pagar' : 'le deben pagar'}-->
      le debe{item.debtors.length === 1 ? '' : 'n'} pagar
    </div>
    {#each item.debtors as d}
      <div class="debtors">
        {d.name + ': $'}
        <em>{d.payment}</em>
      </div>
    {/each}
  {/each}

</div>
