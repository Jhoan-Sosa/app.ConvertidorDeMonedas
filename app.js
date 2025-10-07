
const API_URL = "http://localhost:5000"; // pon null si prefieres forzar solo localStorage

// -----------------------------
// Estado global
// -----------------------------
const state = {
  tasas: {},
  historialArray: [],
  perfiles: [],
  usuarioActivoId: null
};

// referencias DOM
const DOM = {};

// -----------------------------
// Utilidades
// -----------------------------
function log(...args) { console.log("[app]", ...args); }

function mostrarNotificacion(mensaje) {
  if (!DOM.notificacion) { alert(mensaje); return; }
  DOM.notificacion.textContent = mensaje;
  DOM.notificacion.classList.add("show");
  clearTimeout(DOM._notifTimeout);
  DOM._notifTimeout = setTimeout(() => DOM.notificacion.classList.remove("show"), 3000);
}

function esCantidadValida(valor) {
  return /^\d+(\.\d{1,2})?$/.test(valor) && parseFloat(valor) > 0;
}
function formatearMoneda(valor) { return Number(valor).toFixed(2); }
function generarId() { return 'u_' + Math.random().toString(36).slice(2,9); }

// -----------------------------
// Nombres de monedas
// -----------------------------
const nombresMonedas = {
  USD: "Estados Unidos", EUR: "Euro", GBP: "Reino Unido", JPY: "Japón",
  CHF: "Suiza", CAD: "Canadá", AUD: "Australia", NZD: "Nueva Zelanda",
  CNY: "China", HKD: "Hong Kong", SGD: "Singapur", PEN: "Perú",
  MXN: "México", CLP: "Chile", COP: "Colombia", ARS: "Argentina",
  BRL: "Brasil", UYU: "Uruguay", BOB: "Bolivia", PYG: "Paraguay", VES: "Venezuela"
};

// -----------------------------
// DOM helpers y render
// -----------------------------
function crearOpcionMoneda(codigo) {
  return `<option value="${codigo}">(${codigo}) ${nombresMonedas[codigo]||codigo}</option>`;
}
function poblarSelect(selectElement, monedas) {
  if (!selectElement) return;
  selectElement.innerHTML = monedas
    .filter(codigo => nombresMonedas[codigo] || codigo)
    .map(crearOpcionMoneda)
    .join("");
}

// Historial UI
function agregarHistorial(texto) {
  if (!texto) return;
  const li = document.createElement("li");
  li.innerHTML = texto;
  if (DOM.listaHistorial) DOM.listaHistorial.prepend(li);
  state.historialArray.unshift(texto);
  if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = state.historialArray.length === 0;
}
function renderizarHistorial() {
  if (!DOM.listaHistorial) return;
  DOM.listaHistorial.innerHTML = "";
  state.historialArray.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = item;
    DOM.listaHistorial.appendChild(li);
  });
  if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = state.historialArray.length === 0;
}

// Select Usuarios y tarjeta de perfil
function renderSelectUsuarios() {
  if (!DOM.selectUsuarios) return;
  DOM.selectUsuarios.innerHTML = state.perfiles.map(p =>
    `<option value="${p.id}">${p.name} ${p.email ? '('+p.email+')' : ''}</option>`
  ).join("");
  DOM.selectUsuarios.value = state.usuarioActivoId || '';
  DOM.selectUsuarios.disabled = state.perfiles.length === 0;
}
function renderPerfilCard(id) {
  if (!DOM.perfilCard) return;
  if (!id) { DOM.perfilCard.innerHTML = `<p>No hay usuario seleccionado. Crea uno nuevo.</p>`; return; }
  const p = state.perfiles.find(x => x.id === id);
  if (!p) { DOM.perfilCard.innerHTML = `<p>Usuario no encontrado.</p>`; return; }

  const nombre = p.name || '-';
  const email = p.email || '-';
  const prefCurrency = p.prefCurrency || '-';
  const histCount = (p.historial && p.historial.length) ? p.historial.length : 0;

  DOM.perfilCard.innerHTML = `
    <h3>${nombre}</h3>
    <div class="profile-field"><strong>Email:</strong> ${email}</div>
    <div class="profile-field"><strong>Moneda preferida:</strong> ${prefCurrency}</div>
    <div class="profile-field"><strong>Creado:</strong> ${p.created ? new Date(p.created).toLocaleString() : '-'}</div>
    <div class="profile-field"><strong>Entradas historial:</strong> ${histCount}</div>
    <div class="profile-actions">
      <button id="verHistorialUsuario">Ver historial usuario</button>
      <button id="seleccionarComoDefault">Seleccionar como activo</button>
    </div>
  `;

  document.getElementById('verHistorialUsuario').addEventListener('click', () => mostrarHistorialUsuario(p));
  document.getElementById('seleccionarComoDefault').addEventListener('click', () => {
    state.usuarioActivoId = p.id;
    localStorage.setItem('usuarioActivoId', state.usuarioActivoId);
    renderSelectUsuarios();
    mostrarNotificacion(`Usuario ${p.name} activo`);
  });
}

// -----------------------------
// Historial usuario (modal)
// -----------------------------
function mostrarHistorialUsuario(p) {
  if (!p.historial || p.historial.length === 0) {
    mostrarNotificacion("Este usuario no tiene historial");
    return;
  }
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
  setTimeout(()=> modal.classList.add("show"), 10);
  document.getElementById('closeHistUsuario').addEventListener('click', () => modal.remove());
}

// -----------------------------
// API: Creación, lectura, actualización, borrado (fallback local)
// -----------------------------
async function apiGetUsers() {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("apiGetUsers error:", err);
    return null;
  }
}
async function apiCreateUser(payload) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(()=>({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn("apiCreateUser error:", err);
    return null;
  }
}
async function apiUpdateUser(id, payload) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.warn("PUT responded:", res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("apiUpdateUser error:", err);
    return null;
  }
}
async function apiDeleteUser(id) {
  if (!API_URL) return false;
  try {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn("apiDeleteUser error:", err);
    return false;
  }
}

// -----------------------------
// Cargar perfiles (API o local)
// -----------------------------
async function cargarPerfiles() {
  if (API_URL) {
    const usuarios = await apiGetUsers();
    if (Array.isArray(usuarios)) {
      state.perfiles = usuarios;
    } else {
      const raw = localStorage.getItem('perfiles');
      state.perfiles = raw ? JSON.parse(raw) : [];
      mostrarNotificacion("⚠️ No se pudieron cargar usuarios del servidor. Usando datos locales.");
    }
  } else {
    const raw = localStorage.getItem('perfiles');
    state.perfiles = raw ? JSON.parse(raw) : [];
  }

  // restaurar usuario activo
  const storedActive = localStorage.getItem('usuarioActivoId');
  if (storedActive && state.perfiles.find(p => p.id === storedActive)) {
    state.usuarioActivoId = storedActive;
  } else if (state.perfiles.length > 0) {
    state.usuarioActivoId = state.perfiles[0].id;
  } else state.usuarioActivoId = null;

  renderSelectUsuarios();
  renderPerfilCard(state.usuarioActivoId);
}

// -----------------------------
// Crear perfil (usa API si está disponible)
// -----------------------------
async function crearPerfil(payload) {
  payload = payload || {};
  payload.name = payload.name || "Usuario";
  payload.created = payload.created || new Date().toISOString();
  payload.historial = payload.historial || [];

  if (API_URL) {
    const nuevo = await apiCreateUser({
      name: payload.name,
      email: payload.email || "",
      prefCurrency: payload.prefCurrency || "",
      historial: payload.historial || []
    });
    if (nuevo && nuevo.id) {
      state.perfiles.push(nuevo);
      state.usuarioActivoId = nuevo.id;
      localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
      localStorage.setItem('usuarioActivoId', state.usuarioActivoId);
      renderSelectUsuarios();
      renderPerfilCard(state.usuarioActivoId);
      mostrarNotificacion(`✅ Usuario ${nuevo.name} creado`);
      return;
    } else {
      // fallback local
      mostrarNotificacion("⚠️ No se pudo crear en servidor. Creando localmente...");
    }
  }

  // fallback local
  payload.id = generarId();
  state.perfiles.push(payload);
  state.usuarioActivoId = payload.id;
  localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
  localStorage.setItem('usuarioActivoId', state.usuarioActivoId);
  renderSelectUsuarios();
  renderPerfilCard(state.usuarioActivoId);
  mostrarNotificacion(`✅ Usuario ${payload.name} creado (local)`);
}

// -----------------------------
// Actualizar perfil
// -----------------------------
async function actualizarPerfil(id, cambios) {
  const idx = state.perfiles.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.perfiles[idx] = { ...state.perfiles[idx], ...cambios };
  if (API_URL) {
    const actualizado = await apiUpdateUser(id, state.perfiles[idx]);
    if (actualizado) state.perfiles[idx] = actualizado;
    else console.warn("No se actualizó en API, manteniendo versión local");
  }
  localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
  renderSelectUsuarios();
  renderPerfilCard(id);
}

// -----------------------------
// Eliminar perfil
// -----------------------------
async function eliminarPerfil(id) {
  state.perfiles = state.perfiles.filter(p => p.id !== id);
  if (API_URL) {
    const ok = await apiDeleteUser(id);
    if (!ok) {
      mostrarNotificacion("⚠️ No se pudo eliminar en servidor. Se eliminó localmente.");
      localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
    } else {
      // recargar desde servidor para consistencia
      await cargarPerfiles();
    }
  } else {
    localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
  }

  if (state.usuarioActivoId === id) state.usuarioActivoId = state.perfiles.length ? state.perfiles[0].id : null;
  localStorage.setItem('usuarioActivoId', state.usuarioActivoId || '');
  renderSelectUsuarios();
  renderPerfilCard(state.usuarioActivoId);
  mostrarNotificacion("✅ Usuario eliminado");
}

// -----------------------------
// Agregar historial al perfil activo (sincroniza con API si hay)
// -----------------------------
async function agregarHistorialLocal(registro) {
  if (!state.usuarioActivoId) return;
  const perfil = state.perfiles.find(p => p.id === state.usuarioActivoId);
  if (!perfil) return;
  perfil.historial = perfil.historial || [];
  perfil.historial.unshift(registro);

  if (API_URL) {
    const actualizado = await apiUpdateUser(state.usuarioActivoId, perfil);
    if (actualizado) {
      // reemplazar con versión servidor
      const idx = state.perfiles.findIndex(p => p.id === state.usuarioActivoId);
      if (idx !== -1) state.perfiles[idx] = actualizado;
      localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
    } else {
      console.warn("No se pudo actualizar historial en API, guardando local");
      localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
    }
  } else {
    localStorage.setItem('perfiles', JSON.stringify(state.perfiles));
  }
  renderPerfilCard(state.usuarioActivoId);
}

// -----------------------------
// Conversión de moneda (y guardado de registro)
// -----------------------------
function registroToDisplay(reg) {
  const d = new Date(reg.fecha);
  return `${reg.cantidad} ${reg.origen} = ${reg.resultado} ${reg.destino} <span class="date-time">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span>`;
}

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
    if (!state.tasas || !state.tasas[origen] || !state.tasas[destino]) {
      mostrarNotificacion("⚠️ Tasas no disponibles. Intente nuevamente más tarde."); return;
    }

    const cantidad = parseFloat(textoCantidad);
    const cantidadUSD = cantidad / state.tasas[origen];
    const resultado = cantidadUSD * state.tasas[destino];
    const tasaCambio = state.tasas[destino] / state.tasas[origen];

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
    mostrarNotificacion("⚠️ Error al convertir: " + (err.message || err));
  }
}

// -----------------------------
// Import / Export historial
// -----------------------------
function exportarHistorial() {
  try {
    if (!state.historialArray || state.historialArray.length === 0) throw new Error("No hay datos en el historial para exportar");
    const blob = new Blob([JSON.stringify(state.historialArray, null, 2)], { type: "application/json" });
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
        // normalizar: si vienen objetos con campos, convertir a strings para la lista general
        state.historialArray = data.map(item => (typeof item === 'string') ? item : (item.texto || JSON.stringify(item)));
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
// Limpiar historial (modal confirmación)
// -----------------------------
function limpiarHistorial() {
  try {
    if (state.historialArray.length === 0) { mostrarNotificacion("No hay historial para limpiar"); return; }
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
      if (DOM.listaHistorial) DOM.listaHistorial.innerHTML = "";
      state.historialArray = [];
      if (DOM.exportarHistorial) DOM.exportarHistorial.disabled = true;
      mostrarNotificacion("🗑️ Historial limpiado");
      modal.remove();
    });
    document.getElementById("confirmNo").addEventListener("click", () => { modal.remove(); });
  } catch (err) { mostrarNotificacion("⚠️ Error al limpiar historial"); }
}

// -----------------------------
// Búsqueda rápida en select y swap
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
// Cargar tasas (API pública) y fallback
// -----------------------------
async function cargarMonedas() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data.result !== "success") throw new Error("API no retornó success");
    state.tasas = data.rates;
    const monedas = Object.keys(state.tasas);
    poblarSelect(DOM.monedaOrigen, monedas);
    poblarSelect(DOM.monedaDestino, monedas);
    DOM.monedaOrigen.value = "USD";
    DOM.monedaDestino.value = "PEN";
  } catch (err) {
    console.warn("Error cargando tasas:", err);
    mostrarNotificacion("⚠️ No se pudieron obtener las tasas (modo ejemplo).");
    state.tasas = { USD: 1, PEN: 3.6, EUR: 0.92 };
    const monedas = Object.keys(state.tasas);
    poblarSelect(DOM.monedaOrigen, monedas);
    poblarSelect(DOM.monedaDestino, monedas);
    DOM.monedaOrigen.value = "USD";
    DOM.monedaDestino.value = "PEN";
  }
}

// -----------------------------
// Modo oscuro (UI)
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

// -----------------------------
// Gráficos (usa Chart.js, colores opcionales por tu HTML)
// -----------------------------
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

// -----------------------------
// UI prompts simples para crear/editar usuario
// -----------------------------
function promptNuevoUsuario() {
  const name = prompt("Nombre completo del usuario:");
  if (!name) { mostrarNotificacion("Creación cancelada"); return; }
  const email = prompt("Email (opcional):", "");
  const prefCurrency = prompt("Moneda preferida (ej: USD, PEN) (opcional):", "");
  crearPerfil({ name, email, prefCurrency });
}
function promptEditarUsuario(id) {
  const p = state.perfiles.find(x => x.id === id);
  if (!p) { mostrarNotificacion("Usuario no encontrado"); return; }
  const name = prompt("Nombre completo:", p.name) || p.name;
  const email = prompt("Email:", p.email) || p.email;
  const prefCurrency = prompt("Moneda preferida:", p.prefCurrency) || p.prefCurrency;
  actualizarPerfil(id, { name, email, prefCurrency });
}

// -----------------------------
// Inicialización
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Referencias DOM (asegúrate que los ids en el HTML coincidan)
  DOM.monedaOrigen = document.getElementById("monedaOrigen");
  DOM.monedaDestino = document.getElementById("monedaDestino");
  DOM.inputCantidad = document.getElementById("cantidad");
  DOM.botonConvertir = document.getElementById("convertir");
  DOM.botonIntercambiar = document.getElementById("intercambiar");
  DOM.textoResultado = document.getElementById("resultado");
  DOM.textoTasa = document.getElementById("tasa");
  DOM.listaHistorial = document.getElementById("historial");
  DOM.notificacion = document.getElementById("notificacion");
  DOM.botonLimpiarHistorial = document.getElementById("limpiarHistorial"); // CORREGIDO id
  DOM.modoOscuroToggle = document.getElementById("modoOscuroToggle");
  DOM.exportarHistorial = document.getElementById("exportarHistorial");
  DOM.importarHistorial = document.getElementById("importarHistorial");
  DOM.cargarHistorial = document.getElementById("cargarHistorial");

  // Perfil DOM
  DOM.selectUsuarios = document.getElementById("selectUsuarios");
  DOM.btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
  DOM.btnEditarUsuario = document.getElementById("btnEditarUsuario");
  DOM.btnEliminarUsuario = document.getElementById("btnEliminarUsuario");
  DOM.perfilCard = document.getElementById("perfilCard");

  // Carga inicial
  await cargarMonedas();
  state.historialArray = []; renderizarHistorial();
  [DOM.monedaOrigen, DOM.monedaDestino].forEach(habilitarBusqueda);

  // Gráficos ejemplo
  renderizarGrafico("graficoUSD", "USD", [3.50, 3.53, 3.53, 3.54, 3.54, 3.53, 3.52], "#6366F1");
  renderizarGrafico("graficoEUR", "EUR", [4.10, 4.13, 4.14, 4.11, 4.12, 4.12, 4.12], "#F43F5E");

  // Listeners
  if (DOM.botonConvertir) DOM.botonConvertir.addEventListener("click", convertirMoneda);
  if (DOM.botonIntercambiar) DOM.botonIntercambiar.addEventListener("click", intercambiarMonedas);
  if (DOM.botonLimpiarHistorial) DOM.botonLimpiarHistorial.addEventListener("click", limpiarHistorial);
  if (DOM.exportarHistorial) { DOM.exportarHistorial.addEventListener("click", exportarHistorial); DOM.exportarHistorial.disabled = state.historialArray.length === 0; }
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
    state.usuarioActivoId = e.target.value;
    localStorage.setItem('usuarioActivoId', state.usuarioActivoId);
    renderPerfilCard(state.usuarioActivoId);
  });

  // Cargar perfiles guardados (API o local)
  await cargarPerfiles();
});
