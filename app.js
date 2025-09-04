const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const amount = document.getElementById("amount");
const convertBtn = document.getElementById("convert");
const swapBtn = document.getElementById("swap");
const result = document.getElementById("result");
const rateInfo = document.getElementById("rate");
const historyList = document.getElementById("history");
const toast = document.getElementById("toast");
const clearHistoryBtn = document.getElementById("clearHistory");
let rates = {};

// Diccionario de monedas principales
const currencyNames = {
  USD: "Estados Unidos",
  EUR: "Euro",
  GBP: "Reino Unido",
  JPY: "Japón",
  CHF: "Suiza",
  CAD: "Canadá",
  AUD: "Australia",
  NZD: "Nueva Zelanda",
  CNY: "China",
  HKD: "Hong Kong",
  SGD: "Singapur",
  PEN: "Perú",
  MXN: "México",
  CLP: "Chile",
  COP: "Colombia",
  ARS: "Argentina",
  BRL: "Brasil",
  UYU: "Uruguay",
  BOB: "Bolivia",
  PYG: "Paraguay",
  VES: "Venezuela"
};

// Mensaje flotante
function showToast(message) {
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

// Cargar monedas
async function loadCurrencies() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();

    if (data.result === "success") {
      rates = data.rates;
      const currencies = Object.keys(rates);

      currencies.forEach(cur => {
        if (currencyNames[cur]) {
          const displayName = `(${cur}) ${currencyNames[cur]}`;
          fromCurrency.innerHTML += `<option value="${cur}">${displayName}</option>`;
          toCurrency.innerHTML += `<option value="${cur}">${displayName}</option>`;
        }
      });

      fromCurrency.value = "USD";
      toCurrency.value = "PEN";
    } else {
      throw new Error("::NO SE CARGARON LAS MONEDAS CORRECTAMENTE::");
    }
  } catch {
    result.textContent = "::ERROR al obtener tasas de cambio::";
  }
}

loadCurrencies();

// --- 🔍 Búsqueda por teclado en selects ---
function enableSearchableSelect(selectElement) {
  let searchTerm = "";
  let searchTimeout;

  selectElement.addEventListener("keydown", (e) => {
    clearTimeout(searchTimeout);

    if (e.key.length === 1) {
      searchTerm += e.key.toUpperCase();

      for (const option of selectElement.options) {
        if (option.value.startsWith(searchTerm)) {
          selectElement.value = option.value;
          break;
        }
      }
    }

    searchTimeout = setTimeout(() => {
      searchTerm = "";
    }, 1000);
  });
}

enableSearchableSelect(fromCurrency);
enableSearchableSelect(toCurrency);

// Convertir
convertBtn.addEventListener("click", () => {
  const from = fromCurrency.value;
  const to = toCurrency.value;
  const inputVal = amount.value.trim();

  const regex = /^-?\d+(\.\d{1,2})?$/;
  if (!regex.test(inputVal)) {
    showToast("⚠️INGRESE SOLO NUMEROS VÁLIDOS (máx. 2 decimales)");
    return;
  }

  const amt = parseFloat(inputVal);
  if (amt <= 0) {
    showToast("⚠️LA CANTIDAD QUE INGRESA TIENE QUE SER MAYOR QUE 0");
    return;
  }
  const usdAmount = amt / rates[from];
  const converted = usdAmount * rates[to];

  rateInfo.textContent = `1 ${from} = ${(rates[to] / rates[from]).toFixed(2)} ${to}`;
  result.textContent = `${amt.toFixed(2)} ${from} = ${converted.toFixed(2)} ${to}`;

  const li = document.createElement("li");
  li.textContent = result.textContent;
  historyList.prepend(li);
});

//LIMPIAR HISTORIAL
clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  showToast("HISTORIAL LIMPIADO");
});

//INTERCAMBIAR MONEDAS
swapBtn.addEventListener("click", () => {
  const temp = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = temp;
});

//GRAFICO DE USD
const ctxUSD = document.getElementById("chartUSD").getContext("2d");
new Chart(ctxUSD, {
  type: "line",
  data: {
    labels: ["Dom", "Lun", "Mar", "Mie", "Jue"],
    datasets: [
      {
        label: "USD",
        data: [3.50, 3.53, 3.53, 3.54, 3.54, 3.53,3.55],
        borderColor: "#6366F1",
        fill: false,
        tension: 0
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: { enabled: true },
      legend: { display: true }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: value => `${value.toFixed(2)}`
        }
      }
    }
  }
});
//GRAFICO DE EURO
const ctxEUR = document.getElementById("chartEUR").getContext("2d");
new Chart(ctxEUR, {
  type: "line",
  data: {
    labels: ["Dom", "Lun", "Mar", "Mie", "Jue"],
    datasets: [
      {
        label: "EUR",
        data: [4.10,4.13, 4.14, 4.11, 4.12, 4.12, 4.15],
        borderColor: "#F43F5E",
        fill: false,
        tension: 0
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: { enabled: true },
      legend: { display: true }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: value => `${value.toFixed(2)}`
        }
      }
    }
  }
});
