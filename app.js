// ============================
//  REFERENCIAS DEL DOM
// ============================
const DOM = {
    monedaOrigen: document.getElementById("monedaOrigen"),
    monedaDestino: document.getElementById("monedaDestino"),
    inputCantidad: document.getElementById("cantidad"),
    botonConvertir: document.getElementById("convertir"),
    botonIntercambiar: document.getElementById("intercambiar"),
    textoResultado: document.getElementById("resultado"),
    textoTasa: document.getElementById("tasa"),
    listaHistorial: document.getElementById("historial"),
    notificacion: document.getElementById("notificacion"),
    botonLimpiarHistorial: document.getElementById("limpiarHistorial"),
    modoOscuroToggle: document.getElementById("modoOscuroToggle"),
    graficoUSD: document.getElementById("graficoUSD"),
    graficoEUR: document.getElementById("graficoEUR"),
};

let tasas = {};
let historialArray = []; // 🔹 Ya no se carga de localStorage

// ============================
//    NOMBRES DE MONEDAS
// ============================
const nombresMonedas = {
    USD: "Estados Unidos", EUR: "Euro", GBP: "Reino Unido", JPY: "Japón",
    CHF: "Suiza", CAD: "Canadá", AUD: "Australia", NZD: "Nueva Zelanda",
    CNY: "China", HKD: "Hong Kong", SGD: "Singapur", PEN: "Perú",
    MXN: "México", CLP: "Chile", COP: "Colombia", ARS: "Argentina",
    BRL: "Brasil", UYU: "Uruguay", BOB: "Bolivia", PYG: "Paraguay", VES: "Venezuela"
};
// ============================
//    UTILITARIOS
// ============================
function mostrarNotificacion(mensaje) {
    DOM.notificacion.textContent = mensaje;
    DOM.notificacion.className = "show";
    setTimeout(() => DOM.notificacion.classList.remove("show"), 3000);
}

function esCantidadValida(valor) {
    return /^\d+(\.\d{1,2})?$/.test(valor) && parseFloat(valor) > 0;
}

function formatearMoneda(valor) {
    return Number(valor).toFixed(2);
}
// ============================
//    OPCIONES EN SELECT
// ============================
function crearOpcionMoneda(codigo) {
    return `<option value="${codigo}">(${codigo}) ${nombresMonedas[codigo]}</option>`;
}

function poblarSelect(selectElement, monedas) {
    selectElement.innerHTML = monedas
        .filter(codigo => nombresMonedas[codigo])
        .map(crearOpcionMoneda)
        .join("");
}
// ============================
// API: cargar tasas y poblar selects
// ============================
async function cargarMonedas() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data.result !== "success") throw new Error("API no retorno success");
        tasas = data.rates;
        const monedas = Object.keys(tasas);

        poblarSelect(DOM.monedaOrigen, monedas);
        poblarSelect(DOM.monedaDestino, monedas);

        DOM.monedaOrigen.value = "USD";
        DOM.monedaDestino.value = "PEN";
    } catch (err) {
        DOM.textoResultado.textContent = ":: ERROR al obtener tasas de cambio ::";
    }
}
// ============================
//    BÚSQUEDA EN SELECT
// ============================
function habilitarBusqueda(selectElement) {
    let terminoBusqueda = "";
    let tiempoBusqueda;
    selectElement.addEventListener("keydown", (e) => {
        clearTimeout(tiempoBusqueda);

        if (e.key.length === 1) {
            terminoBusqueda += e.key.toUpperCase();
            const match = [...selectElement.options].find(opt =>
                opt.value.startsWith(terminoBusqueda)
            );
            if (match) selectElement.value = match.value;
        }

        tiempoBusqueda = setTimeout(() => (terminoBusqueda = ""), 1000);
    });
}
// ============================
//    INTERCAMBIAR MONEDAS
// ============================
function intercambiarMonedas() {
    [DOM.monedaOrigen.value, DOM.monedaDestino.value] =
        [DOM.monedaDestino.value, DOM.monedaOrigen.value];
}
// ============================
//    CONVERSIÓN DE MONEDA
// ============================
function convertirMoneda() {
    const origen = DOM.monedaOrigen.value;
    const destino = DOM.monedaDestino.value;
    const textoCantidad = DOM.inputCantidad.value.trim();

    if (!esCantidadValida(textoCantidad)) {
        mostrarNotificacion("⚠️ Ingrese un número válido (máx. 2 decimales, mayor que 0)");
        return;
    }

    if (origen === destino) {
        mostrarNotificacion("⚠️ Seleccione dos monedas diferentes");
        return;
    }

    if (!tasas || !tasas[origen] || !tasas[destino]) {
        mostrarNotificacion("⚠️ Tasas no disponibles. Intente nuevamente más tarde.");
        return;
    }

    const cantidad = parseFloat(textoCantidad);
    const cantidadUSD = cantidad / tasas[origen];
    const resultado = cantidadUSD * tasas[destino];
    const tasaCambio = tasas[destino] / tasas[origen];

    DOM.textoTasa.textContent = `1 ${origen} = ${tasaCambio.toFixed(4)} ${destino}`;
    DOM.textoResultado.textContent =
        `${formatearMoneda(cantidad)} ${origen} = ${formatearMoneda(resultado)} ${destino}`;

    agregarHistorial(DOM.textoResultado.textContent);
}
// ============================
//            HISTORIAL
// ============================
function agregarHistorial(texto) {
    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();
    const li = document.createElement("li");
    li.innerHTML = `${texto} <span class="date-time">${fecha} ${hora}</span>`;
    DOM.listaHistorial.prepend(li);

    historialArray.unshift(li.innerHTML);
}

function renderizarHistorial() {
    DOM.listaHistorial.innerHTML = "";
    historialArray.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = item;
        DOM.listaHistorial.appendChild(li);
    });
}

function limpiarHistorial() {
    if (historialArray.length === 0) {
        mostrarNotificacion("No hay historial para limpiar");
        return;
    }

    if (document.getElementById("confirmModal")) return;

    const modal = document.createElement("div");
    modal.id = "confirmModal";
    modal.innerHTML = `
    <div class="modal-content">
        <p>¿Seguro que quieres limpiar el historial?</p>
        <div class="modal-buttons">
        <button id="confirmYes">Sí</button>
        <button id="confirmNo">No</button>
        </div>
    </div>`;
    document.body.appendChild(modal);

    setTimeout(() => modal.classList.add("show"), 10);

    document.getElementById("confirmYes").addEventListener("click", () => {
        DOM.listaHistorial.innerHTML = "";
        historialArray = [];
        mostrarNotificacion("🗑️ Historial limpiado");
        modal.remove();
    });

    document.getElementById("confirmNo").addEventListener("click", () => {
        modal.remove();
    });
}

// ============================
//           GRÁFICOS
// ============================
function renderizarGrafico(idCanvas, etiqueta, datos, color) {
    const ctx = document.getElementById(idCanvas).getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
            datasets: [{
                label: etiqueta,
                data: datos,
                borderColor: color,
                fill: false,
                tension: 0
            }]
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
                    ticks: { callback: value => value.toFixed(2) }
                }
            }
        }
    });
}

// ============================
//        MODO OSCURO
// ============================
function alternarModoOscuro() {
    const activado = document.body.classList.toggle("modo-oscuro");
    actualizarBotonModoOscuro();

    document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, label, li, span").forEach(el => {
        el.style.color = activado ? "#f5f5f5" : "#111111";
    });
}

function actualizarBotonModoOscuro() {
    if (!DOM.modoOscuroToggle) return;
    DOM.modoOscuroToggle.textContent = document.body.classList.contains("modo-oscuro")
        ? "☀️Modo Claro"
        : "🌙Modo Oscuro";
}

// ============================
// INICIALIZACIÓN
// ============================
document.addEventListener("DOMContentLoaded", () => {
    cargarMonedas();

    // 🔹 Siempre inicia sin historial
    historialArray = [];
    renderizarHistorial();

    [DOM.monedaOrigen, DOM.monedaDestino].forEach(habilitarBusqueda);

    renderizarGrafico("graficoUSD", "USD", [3.50, 3.53, 3.53, 3.54, 3.54, 3.53, 3.52], "#6366F1");
    renderizarGrafico("graficoEUR", "EUR", [4.10, 4.13, 4.14, 4.11, 4.12, 4.12, 4.12], "#F43F5E");

    DOM.botonConvertir.addEventListener("click", convertirMoneda);
    DOM.botonIntercambiar.addEventListener("click", intercambiarMonedas);
    DOM.botonLimpiarHistorial.addEventListener("click", limpiarHistorial);

    // 🔹 Siempre inicia en modo claro
    document.body.classList.remove("modo-oscuro");
    actualizarBotonModoOscuro();
    if (DOM.modoOscuroToggle) {
        DOM.modoOscuroToggle.addEventListener("click", alternarModoOscuro);
    }
});
