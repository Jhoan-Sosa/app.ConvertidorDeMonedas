// CONFIG: si quieres usar API pon la URL, si no deja null para usar localStorage.
const API_URL = null; // ej: "http://localhost:3000"

// -----------------------------
// Estado global
// -----------------------------
let tasas = {};
let historialArray = []; // historial general
let perfiles = []; // arreglo de perfiles
let usuarioActivoId = null;

// referencias DOM (serán pobladas en DOMContentLoaded)
const DOM = {};

// -----------------------------
// Utilitarios (tu código original con pequeñas integraciones)
// -----------------------------
function mostrarNotificacion(mensaje) {
  if (!DOM.notificacion) {
    alert(mensaje); return;
  }
  DOM.notificacion.textContent = mensaje;
  DOM.notificacion.classList.add("show");
  clearTimeout(DOM._notifTimeout);
  DOM._notifTimeout = setTimeout(() => DOM.notificacion.classList.remove("show"), 3000);
}

function esCantidadValida(valor) {
  return /^\d+(\.\d{1,2})?$/.test(valor) && parseFloat(valor) > 0;
}
function formatearMoneda(valor) { return Number(valor).toFixed(2); }
function crearOpcionMoneda(codigo) { return `<option value="${codigo}">(${codigo}) ${nombresMonedas[codigo]||codigo}</option>`; }
function poblarSelect(selectElement, monedas) {
  if (!selectElement) return;
  selectElement.innerHTML = monedas
    .filter(codigo => nombresMonedas[codigo] || codigo)
    .map(crearOpcionMoneda)
    .join("");
}

// -----------------------------
// Nombres monedas (igual que tu original)
// -----------------------------
const nombresMonedas = {
  USD: "Estados Unidos", EUR: "Euro", GBP: "Reino Unido", JPY: "Japón",
  CHF: "Suiza", CAD: "Canadá", AUD: "Australia", NZD: "Nueva Zelanda",
  CNY: "China", HKD: "Hong Kong", SGD: "Singapur", PEN: "Perú",
  MXN: "México", CLP: "Chile", COP: "Colombia", ARS: "Argentina",
  BRL: "Brasil", UYU: "Uruguay", BOB: "Bolivia", PYG: "Paraguay", VES: "Venezuela"
};

// -----------------------------
// CARGAR TASAS (igual que tu original)
// -----------------------------
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

// -----------------------------
// CONVERSIÓN (ahora guarda en perfil activo)
// -----------------------------
function convertirMoneda() {
  try {
    const origen = DOM.monedaOrigen.value;
    const destino = DOM.monedaDestino.value;
    const textoCantidad = DOM.inputCantidad.value.trim();

    if (!esCantidadValida(textoCantidad)) {
      mostrarNotificacion("⚠️ Ingrese un número válido (máx. 2 decimales, mayor que 0)");
      return;
    }
    if (origen === destino) { mostrarNotificacion("⚠️ Seleccione dos monedas diferentes"); return; }
    if (!tasas || !tasas[origen] || !tasas[destino]) {
      mostrarNotificacion("⚠️ Tasas no disponibles. Intente nuevamente más tarde."); return;
    }

    const cantidad = parseFloat(textoCantidad);
    const cantidadUSD = cantidad / tasas[origen];
    const resultado = cantidadUSD * tasas[destino];
    const tasaCambio = tasas[destino] / tasas[origen];

    DOM.textoTasa.textContent = `1 ${origen} = ${tasaCambio.toFixed(4)} ${destino}`;
    DOM.textoResultado.textContent = `${formatearMoneda(cantidad)} ${origen} = ${formatearMoneda(resultado)} ${destino}`;

    const registro = {
      texto: DOM.textoResultado.textContent,
      origen, destino, cantidad: formatearMoneda(cantidad),
      resultado: formatearMoneda(resultado),
      tasa: tasaCambio.toFixed(6),
      fecha: new Date().toISOString()
    };

    agregarHistorialLocal(registro);
    agregarHistorial(registroToDisplay(registro));
  } catch (err) {
    mostrarNotificacion("⚠️ Error al convertir: " + err.message);
  }
}
function registroToDisplay(reg) {
  const d = new Date(reg.fecha);
  return `${reg.cantidad} ${reg.origen} = ${reg.resultado} ${reg.destino} <span class="date-time">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span>`;
}

// -----------------------------
// HISTORIAL (ajustado)
// -----------------------------
function agregarHistorial(texto) {
  const liHtml = texto;
  if (DOM.listaHistorial) {
    const li = document.createElement("li");
    li.innerHTML = liHtml;
    DOM.listaHistorial.prepend(li);
  }
  historialArray.unshift(liHtml);
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
    if (historialArray.length === 0) { mostrarNotificacion("No hay historial para limpiar"); return; }
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
    document.getElementById("confirmNo").addEventListener("click", () => { modal.remove(); });
  } catch (err) { mostrarNotificacion("⚠️ Error al limpiar historial"); }
}

// -----------------------------
// Guardar historial en perfil activo (local o API)
// -----------------------------
async function agregarHistorialLocal(registro) {
  // sincroniza con perfil activo
  if (!usuarioActivoId) return; // no hay usuario seleccionado
  const perfil = perfiles.find(p => p.id === usuarioActivoId);
  if (!perfil) return;
  perfil.historial = perfil.historial || [];
  perfil.historial.unshift(registro);

  // actualizar persistencia
  if (API_URL) {
    try {
      await fetch(`${API_URL}/users/${usuarioActivoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil)
      });
    } catch (e) {
      console.warn("No se pudo guardar en API:", e);
    }
  } else {
    // localStorage
    localStorage.setItem('perfiles', JSON.stringify(perfiles));
  }
  renderPerfilCard(usuarioActivoId);
}

// -----------------------------
// PERFILES: CRUD (localStorage o API)
// -----------------------------
function generarId() { return 'u_' + Math.random().toString(36).slice(2,9); }

async function cargarPerfiles() {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/users`);
      perfiles = await res.json();
    } catch (err) { console.warn("Error cargando perfiles desde API:", err); perfiles = []; }
  } else {
    const raw = localStorage.getItem('perfiles');
    perfiles = raw ? JSON.parse(raw) : [];
  }
  // si hay perfiles, mantener el seleccionado
  const storedActive = localStorage.getItem('usuarioActivoId');
  if (storedActive && perfiles.find(p => p.id === storedActive)) {
    usuarioActivoId = storedActive;
  } else if (perfiles.length > 0) {
    usuarioActivoId = perfiles[0].id;
  } else usuarioActivoId = null;
  renderSelectUsuarios();
  renderPerfilCard(usuarioActivoId);
}

async function crearPerfil(payload) {
  payload.id = generarId();
  payload.created = new Date().toISOString();
  payload.historial = payload.historial || [];
  if (API_URL) {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const nuevo = await res.json();
    perfiles.push(nuevo);
  } else {
    perfiles.push(payload);
    localStorage.setItem('perfiles', JSON.stringify(perfiles));
  }
  usuarioActivoId = payload.id;
  localStorage.setItem('usuarioActivoId', usuarioActivoId);
  renderSelectUsuarios();
  renderPerfilCard(usuarioActivoId);
}

async function actualizarPerfil(id, cambios) {
  const idx = perfiles.findIndex(p => p.id === id);
  if (idx === -1) return;
  perfiles[idx] = { ...perfiles[idx], ...cambios };
  if (API_URL) {
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(perfiles[idx])
      });
    } catch (err) { console.warn("error actualizando en api", err); }
  } else {
    localStorage.setItem('perfiles', JSON.stringify(perfiles));
  }
  renderSelectUsuarios();
  renderPerfilCard(id);
}

async function eliminarPerfil(id) {
  perfiles = perfiles.filter(p => p.id !== id);
  if (API_URL) {
    try { await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' }); } catch (e) { console.warn(e); }
    // recargar desde API sería ideal, pero simplificamos
  } else {
    localStorage.setItem('perfiles', JSON.stringify(perfiles));
  }
  if (usuarioActivoId === id) usuarioActivoId = perfiles.length ? perfiles[0].id : null;
  localStorage.setItem('usuarioActivoId', usuarioActivoId || '');
  renderSelectUsuarios();
  renderPerfilCard(usuarioActivoId);
}

// -----------------------------
// RENDER: select de usuarios y tarjeta
// -----------------------------
function renderSelectUsuarios() {
  if (!DOM.selectUsuarios) return;
  DOM.selectUsuarios.innerHTML = perfiles.map(p =>
    `<option value="${p.id}">${p.name} ${p.email ? '('+p.email+')' : ''}</option>`
  ).join("");
  DOM.selectUsuarios.value = usuarioActivoId || '';
  DOM.selectUsuarios.disabled = perfiles.length === 0;
}

function renderPerfilCard(id) {
  if (!DOM.perfilCard) return;
  if (!id) {
    DOM.perfilCard.innerHTML = `<p>No hay usuario seleccionado. Crea uno nuevo.</p>`;
    return;
  }
  const p = perfiles.find(x => x.id === id);
  if (!p) { DOM.perfilCard.innerHTML = `<p>Usuario no encontrado.</p>`; return; }
  const nombre = p.name || '-';
  const email = p.email || '-';
  const prefCurrency = p.prefCurrency || '-';
  const histCount = (p.historial && p.historial.length) ? p.historial.length : 0;

  DOM.perfilCard.innerHTML = `
    <h3>${nombre}</h3>
    <div class="profile-field"><strong>Email:</strong> ${email}</div>
    <div class="profile-field"><strong>Moneda preferida:</strong> ${prefCurrency}</div>
    <div class="profile-field"><strong>Creado:</strong> ${new Date(p.created).toLocaleString()}</div>
    <div class="profile-field"><strong>Entradas historial:</strong> ${histCount}</div>
    <div class="profile-actions">
      <button id="verHistorialUsuario">Ver historial usuario</button>
      <button id="seleccionarComoDefault">Seleccionar como activo</button>
    </div>
  `;

  document.getElementById('verHistorialUsuario').addEventListener('click', () => {
    mostrarHistorialUsuario(p);
  });
  document.getElementById('seleccionarComoDefault').addEventListener('click', () => {
    usuarioActivoId = p.id;
    localStorage.setItem('usuarioActivoId', usuarioActivoId);
    renderSelectUsuarios();
    mostrarNotificacion(`Usuario ${p.name} activo`);
  });
}

function mostrarHistorialUsuario(p) {
  if (!p.historial || p.historial.length === 0) {
    mostrarNotificacion("Este usuario no tiene historial");
    return;
  }
  // Mostrar modal simple con lista
  const modal = document.createElement('div');
  modal.id = 'histUsuarioModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Historial de ${p.name}</h3>
      <div style="max-height:300px; overflow:auto; text-align:left; margin-top:10px;">
        ${p.historial.map(h => {
          const d = new Date(h.fecha);
          return `<div style="padding:6px 0; border-bottom:1px solid #eee;">
                    <div>${h.texto || (h.cantidad + ' ' + h.origen + ' → ' + h.resultado + ' ' + h.destino)}</div>
                    <div style="font-size:12px;color:#666;">${d.toLocaleString()}</div>
                  </div>`;
        }).join('')}
      </div>
      <div style="margin-top:10px; text-align:center;">
        <button id="closeHistUsuario">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=> modal.classList.add('show'), 10);
  document.getElementById('closeHistUsuario').addEventListener('click', () => modal.remove());
}

// -----------------------------
// UI: crear/editar via prompt (simple)
// -----------------------------
function promptNuevoUsuario() {
  const name = prompt("Nombre completo del usuario:");
  if (!name) { mostrarNotificacion("Creación cancelada"); return; }
  const email = prompt("Email (opcional):", "");
  const prefCurrency = prompt("Moneda preferida (ej: USD, PEN) (opcional):", "");
  crearPerfil({ name, email, prefCurrency });
}

function promptEditarUsuario(id) {
  const p = perfiles.find(x => x.id === id);
  if (!p) { mostrarNotificacion("Usuario no encontrado"); return; }
  const name = prompt("Nombre completo:", p.name) || p.name;
  const email = prompt("Email:", p.email) || p.email;
  const prefCurrency = prompt("Moneda preferida:", p.prefCurrency) || p.prefCurrency;
  actualizarPerfil(id, { name, email, prefCurrency });
}

// -----------------------------
// Búsqueda en selects y swap moneda (igual que tu original)
// -----------------------------
function habilitarBusqueda(selectElement) {
  if (!selectElement) return;
  let terminoBusqueda = "";
  let tiempoBusqueda;
  selectElement.addEventListener("keydown", (e) => {
    clearTimeout(tiempoBusqueda);
    if (e.key.length === 1) {
      terminoBusqueda += e.key.toUpperCase();
      const match = [...selectElement.options].find(opt => opt.value.startsWith(terminoBusqueda));
      if (match) selectElement.value = match.value;
    }
    tiempoBusqueda = setTimeout(() => (terminoBusqueda = ""), 1000);
  });
}
function intercambiarMonedas() {
  if (!DOM.monedaOrigen || !DOM.monedaDestino) return;
  [DOM.monedaOrigen.value, DOM.monedaDestino.value] =
    [DOM.monedaDestino.value, DOM.monedaOrigen.value];
}

// -----------------------------
// Export/import historial (igual que tu original)
// -----------------------------
function exportarHistorial() {
  try {
    if (!historialArray || historialArray.length === 0) throw new Error("No hay datos en el historial para exportar");
    const blob = new Blob([JSON.stringify(historialArray, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url; enlace.download = "historial.json";
    document.body.appendChild(enlace);
    enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarNotificacion("✅ Historial exportado correctamente");
  } catch (error) { mostrarNotificacion("⚠️ " + error.message); }
}
function importarHistorial(archivo) {
  try {
    if (!archivo) throw new Error("No se seleccionó ningún archivo");
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const data = JSON.parse(lector.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido: debe ser un arreglo");
        historialArray = data.map(item => (typeof item === 'string') ? item : (item.text || String(item)));
        renderizarHistorial();
        mostrarNotificacion("✅ Historial cargado correctamente");
        if (DOM.importarHistorial) DOM.importarHistorial.value = "";
      } catch (errorInterno) {
        mostrarNotificacion("⚠️ Archivo no válido: " + errorInterno.message);
      }
    };
    lector.onerror = () => { mostrarNotificacion("⚠️ Error al leer el archivo"); };
    lector.readAsText(archivo);
  } catch (error) { mostrarNotificacion("⚠️ " + error.message); }
}

// -----------------------------
// Inicialización DOMContentLoaded
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // referencias DOM
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
  DOM.exportarHistorial = document.getElementById("exportarHistorial");
  DOM.importarHistorial = document.getElementById("importarHistorial");
  DOM.cargarHistorial = document.getElementById("cargarHistorial");

  // perfil DOM
  DOM.selectUsuarios = document.getElementById("selectUsuarios");
  DOM.btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
  DOM.btnEditarUsuario = document.getElementById("btnEditarUsuario");
  DOM.btnEliminarUsuario = document.getElementById("btnEliminarUsuario");
  DOM.perfilCard = document.getElementById("perfilCard");

  // carga inicial
  await cargarMonedas();
  historialArray = []; renderizarHistorial();
  [DOM.monedaOrigen, DOM.monedaDestino].forEach(habilitarBusqueda);

  // gráficos (mantén tu código de gráficos si quieres)
  renderizarGrafico("graficoUSD", "USD", [3.50, 3.53, 3.53, 3.54, 3.54, 3.53, 3.52], "#6366F1");
  renderizarGrafico("graficoEUR", "EUR", [4.10, 4.13, 4.14, 4.11, 4.12, 4.12, 4.12], "#F43F5E");

  // listeners
  if (DOM.botonConvertir) DOM.botonConvertir.addEventListener("click", convertirMoneda);
  if (DOM.botonIntercambiar) DOM.botonIntercambiar.addEventListener("click", intercambiarMonedas);
  if (DOM.botonLimpiarHistorial) DOM.botonLimpiarHistorial.addEventListener("click", limpiarHistorial);
  if (DOM.exportarHistorial) { DOM.exportarHistorial.addEventListener("click", exportarHistorial); DOM.exportarHistorial.disabled = historialArray.length === 0; }
  if (DOM.cargarHistorial && DOM.importarHistorial) {
    DOM.cargarHistorial.addEventListener("click", () => DOM.importarHistorial.click());
    DOM.importarHistorial.addEventListener("change", (e) => { if (e.target.files.length > 0) importarHistorial(e.target.files[0]); });
  }

  if (DOM.modoOscuroToggle) {
    document.body.classList.remove("modo-oscuro");
    actualizarBotonModoOscuro();
    DOM.modoOscuroToggle.addEventListener("click", alternarModoOscuro);
  }

  // perfiles: listeners
  if (DOM.btnNuevoUsuario) DOM.btnNuevoUsuario.addEventListener("click", promptNuevoUsuario);
  if (DOM.btnEditarUsuario) DOM.btnEditarUsuario.addEventListener("click", () => {
    if (!DOM.selectUsuarios.value) { mostrarNotificacion("Seleccione un usuario"); return; }
    promptEditarUsuario(DOM.selectUsuarios.value);
  });
  if (DOM.btnEliminarUsuario) DOM.btnEliminarUsuario.addEventListener("click", () => {
    if (!DOM.selectUsuarios.value) { mostrarNotificacion("Seleccione un usuario"); return; }
    if (!confirm("¿Eliminar usuario? Esto borrará su historial localmente.")) return;
    eliminarPerfil(DOM.selectUsuarios.value);
  });
  if (DOM.selectUsuarios) DOM.selectUsuarios.addEventListener('change', (e) => {
    usuarioActivoId = e.target.value;
    localStorage.setItem('usuarioActivoId', usuarioActivoId);
    renderPerfilCard(usuarioActivoId);
  });

  // cargar perfiles guardados
  await cargarPerfiles();
});

// -----------------------------
// Funciones de UI que ya tenías (modo oscuro y gráficos)
// -----------------------------
function alternarModoOscuro() {
  const activado = document.body.classList.toggle("modo-oscuro");
  actualizarBotonModoOscuro();
  document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, label, li, span").forEach(el => {
    el.style.color = activado ? "#f5f5f5" : "#111111";
  });
}
function actualizarBotonModoOscuro() {
  if (!DOM.modoOscuroToggle) return;
  DOM.modoOscuroToggle.textContent = document.body.classList.contains("modo-oscuro") ? "☀️Modo Claro" : "🌙Modo Oscuro";
}

// renderizar grafico (mantén tu código)
function renderizarGrafico(idCanvas, etiqueta, datos, color) {
  if (!document.getElementById(idCanvas)) return;
  const ctx = document.getElementById(idCanvas).getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
      datasets: [{ label: etiqueta, data: datos, borderColor: color, fill: false, tension: 0 }]
    },
    options: { responsive: true, plugins: { tooltip: { enabled: true }, legend: { display: true } }, scales: { y: { beginAtZero: false, ticks: { callback: value => value.toFixed(2) } } } }
  });
}
