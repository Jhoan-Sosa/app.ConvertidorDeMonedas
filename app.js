const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const amount = document.getElementById("amount");
const convertBtn = document.getElementById("convert");
const swapBtn = document.getElementById("swap");
const result = document.getElementById("result");
const rateInfo = document.getElementById("rate");
const historyList = document.getElementById("history");
const toast = document.getElementById("toast");

let rates = {};

// Mostrar mensaje flotante
function showToast(message) {
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

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
  const inputVal = amount.value.trim();

  // Validar número y decimales (máx 2)
  const regex = /^\d+(\.\d{1,2})?$/;

  if (!regex.test(inputVal)) {
    showToast("⚠️ Ingrese solo números válidos (máx. 2 decimales)");
    return;
  }

  const amt = parseFloat(inputVal);

  // Validar negativos y cero
  if (amt <= 0) {
    showToast("⚠️ La cantidad debe ser mayor que 0");
    return;
  }

  const usdAmount = amt / rates[from]; 
  const converted = usdAmount * rates[to]; 

  // 👇 ahora SIEMPRE 2 decimales en tasa fija
  rateInfo.textContent = `1 ${from} = ${(rates[to] / rates[from]).toFixed(2)} ${to}`;

  // 👇 resultado final SIEMPRE con 2 decimales
  result.textContent = `${amt.toFixed(2)} ${from} = ${converted.toFixed(2)} ${to}`;

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
