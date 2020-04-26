<style>
  main {
    -moz-transition-duration: 0.5s;
    -webkit-transition-duration: 0.5s;
    font-family: "Satisfy", Helvetica, cursive;
    text-shadow: 1px 1px 7px black;
  }

  button {
    display: inline-block;
    border-radius: 4px;
    background-color: #f4511e;
    border: none;
    color: #ffffff;
    text-align: center;
    font-size: 28px;
    padding: 20px;
    width: 200px;
    transition: all 0.5s;
    cursor: pointer;
    margin: 5px;
  }

  button span {
    cursor: pointer;
    display: inline-block;
    position: relative;
    transition: 0.5s;
  }

  button span:after {
    content: "\00bb";
    position: absolute;
    opacity: 0;
    top: 0;
    right: -20px;
    transition: 0.5s;
  }

  button:hover span {
    padding-right: 25px;
  }

  button:hover span:after {
    opacity: 1;
    right: 0;
  }
</style>

<main>
  <br />
  <p>Comenzá y pasá el celular</p>
  <p>hasta que se agreguen todes</p>
  <button on:click>
    <span>comenzar</span>
  </button>

</main>
