<script>
  export let total;
  export let individualPayment;
  export let result;
</script>

<style>
  .box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-right: 80px;
    width: 100vw;
  }

  .box .debtors {
    padding-left: 80px;
    align-self: center;
  }
</style>

<p class="left">total: {total}</p>
<p class="right">pago individual: {individualPayment}</p>
<h1>Resultado:</h1>
<div class="box">

  {#each result as item}
    <div>
      A
      <b>{item.name}</b>
      le deben pagar
    </div>
    {#each item.debtors as d}
      <div class="debtors">{d.name + ': ' + d.pay}</div>
    {/each}
  {/each}

</div>
<br />
<br />
