const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const amount = document.getElementById("amount");
const convertBtn = document.getElementById("convert");
const swapBtn = document.getElementById("swap");
const result = document.getElementById("result");
const rateInfo = document.getElementById("rate");
const historyList = document.getElementById("history");

let rates = {};

// cargar monedas
async function loadCurrencies() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();

    if (data.result === "success") {
      rates = data.rates;
      const currencies = Object.keys(rates);

      currencies.forEach(cur => {
        fromCurrency.innerHTML += `<option value="${cur}">${cur}</option>`;
        toCurrency.innerHTML += `<option value="${cur}">${cur}</option>`;
      });

      fromCurrency.value = "USD";
      toCurrency.value = "PEN"; // Soles
    } else {
      throw new Error("No se pudieron cargar las monedas");
    }
  } catch (error) {
    result.textContent = "❌ Error al obtener tasas de cambio";
  }
}

loadCurrencies();

// convertir
convertBtn.addEventListener("click", () => {
  const from = fromCurrency.value;
  const to = toCurrency.value;
  const amt = parseFloat(amount.value);

  if (!amt || isNaN(amt)) {
    result.textContent = "Por favor ingrese una cantidad válida";
    return;
  }

  const usdAmount = amt / rates[from]; 
  const converted = usdAmount * rates[to]; 

  rateInfo.textContent = `1 ${from} = ${(rates[to] / rates[from]).toFixed(4)} ${to}`;
  result.textContent = `${amt} ${from} = ${converted.toFixed(2)} ${to}`;

  const li = document.createElement("li");
  li.textContent = result.textContent;
  historyList.prepend(li);
});

// invertir monedas
swapBtn.addEventListener("click", () => {
  const temp = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = temp;
});
