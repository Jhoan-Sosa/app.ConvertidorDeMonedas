// app.js (reemplaza tu archivo actual por este)

let tasas = {};
let historialArray = []; // siempre manejado en memoria

// placeholder para elementos DOM (será poblado en DOMContentLoaded)
const DOM = {};

// ============================
//    UTILITARIOS
// ============================
function mostrarNotificacion(mensaje) {
    if (!DOM.notificacion) {
        // fallback mínimo si DOM aun no existe
        alert(mensaje);
        return;
    }
    DOM.notificacion.textContent = mensaje;
    DOM.notificacion.classList.add("show");
    // quitar la clase después de 3s
    clearTimeout(DOM._notifTimeout);
    DOM._notifTimeout = setTimeout(() => DOM.notificacion.classList.remove("show"), 3000);
}

function esCantidadValida(valor) {
    return /^\d+(\.\d{1,2})?$/.test(valor) && parseFloat(valor) > 0;
}

function formatearMoneda(valor) {
    return Number(valor).toFixed(2);
}

function crearOpcionMoneda(codigo) {
    return `<option value="${codigo}">(${codigo}) ${nombresMonedas[codigo]}</option>`;
}

function poblarSelect(selectElement, monedas) {
    if (!selectElement) return;
    selectElement.innerHTML = monedas
        .filter(codigo => nombresMonedas[codigo])
        .map(crearOpcionMoneda)
        .join("");
}

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
        if (DOM.textoResultado) DOM.textoResultado.textContent = ":: ERROR al obtener tasas de cambio ::";
        mostrarNotificacion("⚠️ No se pudieron obtener las tasas (modo ejemplo).");
        // fallback básico para que la app siga funcionando con un set limitado
        tasas = { USD: 1, PEN: 3.6, EUR: 0.92 };
        const monedas = Object.keys(tasas);
        if (DOM.monedaOrigen && DOM.monedaDestino) {
            poblarSelect(DOM.monedaOrigen, monedas);
            poblarSelect(DOM.monedaDestino, monedas);
            DOM.monedaOrigen.value = "USD";
            DOM.monedaDestino.value = "PEN";
        }
    }
}

// ============================
//    BÚSQUEDA EN SELECT
// ============================
function habilitarBusqueda(selectElement) {
    if (!selectElement) return;
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
    if (!DOM.monedaOrigen || !DOM.monedaDestino) return;
    [DOM.monedaOrigen.value, DOM.monedaDestino.value] =
        [DOM.monedaDestino.value, DOM.monedaOrigen.value];
}

// ============================
//    CONVERSIÓN DE MONEDA
// ============================
function convertirMoneda() {
    try {
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
    } catch (err) {
        mostrarNotificacion("⚠️ Error al convertir: " + err.message);
    }
}

// ============================
//            HISTORIAL
// ============================
function agregarHistorial(texto) {
    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();
    const liHtml = `${texto} <span class="date-time">${fecha} ${hora}</span>`;

    if (DOM.listaHistorial) {
        const li = document.createElement("li");
        li.innerHTML = liHtml;
        DOM.listaHistorial.prepend(li);
    }

    // mantener el historialArray sincronizado
    historialArray.unshift(liHtml);

    // opcional: activar/desactivar boton exportar
    if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = historialArray.length === 0;
}

function renderizarHistorial() {
    if (!DOM.listaHistorial) return;
    DOM.listaHistorial.innerHTML = "";
    historialArray.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = item;
        DOM.listaHistorial.appendChild(li);
    });
    if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = historialArray.length === 0;
}

function limpiarHistorial() {
    try {
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
            if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = true;
            mostrarNotificacion("🗑️ Historial limpiado");
            modal.remove();
        });

        document.getElementById("confirmNo").addEventListener("click", () => {
            modal.remove();
        });
    } catch (err) {
        mostrarNotificacion("⚠️ Error al limpiar historial");
    }
}

// ============================
//           GRÁFICOS
// ============================
function renderizarGrafico(idCanvas, etiqueta, datos, color) {
    if (!document.getElementById(idCanvas)) return;
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
//     EXPORTAR / IMPORTAR HISTORIAL
// ============================
function exportarHistorial() {
    try {
        if (!historialArray || historialArray.length === 0) {
            throw new Error("No hay datos en el historial para exportar");
        }

        const blob = new Blob([JSON.stringify(historialArray, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "historial.json";
        // para garantizar compatibilidad, añadir al DOM antes de click
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        // revocar URL después de un pequeño retraso
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        mostrarNotificacion("✅ Historial exportado correctamente");
    } catch (error) {
        mostrarNotificacion("⚠️ " + error.message);
    }
}

function importarHistorial(archivo) {
    try {
        if (!archivo) throw new Error("No se seleccionó ningún archivo");
        const lector = new FileReader();

        lector.onload = () => {
            try {
                const data = JSON.parse(lector.result);
                if (!Array.isArray(data)) throw new Error("Formato inválido: debe ser un arreglo");

                // normalizar elementos (aceptar strings o convertir)
                historialArray = data.map(item => {
                    if (typeof item === 'string') return item;
                    if (item && item.text) return item.text;
                    return String(item);
                });

                renderizarHistorial();
                mostrarNotificacion("✅ Historial cargado correctamente");
                // reset input file para permitir cargar el mismo archivo otra vez si se desea
                if (DOM.importarHistorial) DOM.importarHistorial.value = "";
            } catch (errorInterno) {
                mostrarNotificacion("⚠️ Archivo no válido: " + errorInterno.message);
            }
        };

        lector.onerror = () => {
            mostrarNotificacion("⚠️ Error al leer el archivo");
        };

        lector.readAsText(archivo);
    } catch (error) {
        mostrarNotificacion("⚠️ " + error.message);
    }
}

// ============================
// INICIALIZACIÓN (espera DOM)
// ============================
document.addEventListener("DOMContentLoaded", () => {
    // popular referencias DOM aquí para garantizar que existan
    DOM.monedaOrigen = document.getElementById("monedaOrigen");
    DOM.monedaDestino = document.getElementById("monedaDestino");
    DOM.inputCantidad = document.getElementById("cantidad");
    DOM.botonConvertir = document.getElementById("convertir");
    DOM.botonIntercambiar = document.getElementById("intercambiar");
    DOM.textoResultado = document.getElementById("resultado");
    DOM.textoTasa = document.getElementById("tasa");
    DOM.listaHistorial = document.getElementById("historial");
    DOM.notificacion = document.getElementById("notificacion");
    DOM.botonLimpiarHistorial = document.getElementById("limpiarHistorial");
    DOM.modoOscuroToggle = document.getElementById("modoOscuroToggle");

    // botones nuevo feature
    DOM.exportarHistorial = document.getElementById("exportarHistorial");
    DOM.importarHistorial = document.getElementById("importarHistorial");
    DOM.cargarHistorial = document.getElementById("cargarHistorial");

    // carga inicial
    cargarMonedas();

    // historial siempre inicia vacío según tu diseño
    historialArray = [];
    renderizarHistorial();

    // búsquedas en selects
    [DOM.monedaOrigen, DOM.monedaDestino].forEach(habilitarBusqueda);

    // gráficos ejemplo
    renderizarGrafico("graficoUSD", "USD", [3.50, 3.53, 3.53, 3.54, 3.54, 3.53, 3.52], "#6366F1");
    renderizarGrafico("graficoEUR", "EUR", [4.10, 4.13, 4.14, 4.11, 4.12, 4.12, 4.12], "#F43F5E");

    // listeners
    if (DOM.botonConvertir) DOM.botonConvertir.addEventListener("click", convertirMoneda);
    if (DOM.botonIntercambiar) DOM.botonIntercambiar.addEventListener("click", intercambiarMonedas);
    if (DOM.botonLimpiarHistorial) DOM.botonLimpiarHistorial.addEventListener("click", limpiarHistorial);

    // export / import
    if (DOM.exportarHistorial) {
        DOM.exportarHistorial.addEventListener("click", exportarHistorial);
        DOM.exportarHistorial.disabled = historialArray.length === 0;
    }
    if (DOM.cargarHistorial && DOM.importarHistorial) {
        DOM.cargarHistorial.addEventListener("click", () => DOM.importarHistorial.click());
        DOM.importarHistorial.addEventListener("change", (e) => {
            if (e.target.files.length > 0) importarHistorial(e.target.files[0]);
        });
    }

    // modo claro por defecto
    document.body.classList.remove("modo-oscuro");
    actualizarBotonModoOscuro();
    if (DOM.modoOscuroToggle) {
        DOM.modoOscuroToggle.addEventListener("click", alternarModoOscuro);
    }
});
