<script>
  export let total;
  export let individualPayment;
  export let debtors;
  export let creditors;
</script>

<div>
  <p class="left">total: {total}</p>
  <p class="right">pago individual: {individualPayment}</p>
  <h1>deudores</h1>
  <p>
    {#each debtors as debt}
      <label>{debt.name + ': ' + debt.pay}</label>
      <br />
    {/each}
  </p>
  <h1>acreedores</h1>
  <p>
    {#each creditors as cred}
      <label>{cred.name + ': ' + cred.pay}</label>
      <br />
    {/each}
  </p>
</div>
