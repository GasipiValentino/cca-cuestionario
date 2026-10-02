// Enrutador mínimo basado en el hash de la URL (#/ruta).

let rutas = [];
let alSalir = null;   // limpieza de la vista actual (timers, listeners)

export function definirRutas(lista) { rutas = lista; }

/** La vista activa puede registrar una función de limpieza que se ejecuta al cambiar de ruta. */
export function registrarSalida(fn) { alSalir = fn; }

export function navegar(hash, forzar = false) {
  if (location.hash === hash || (hash === "#/" && !location.hash)) {
    if (forzar) resolver();
  } else {
    location.hash = hash;
  }
}

export async function resolver() {
  if (alSalir) { try { alSalir(); } catch { /* sin efecto */ } alSalir = null; }
  const ruta = location.hash.replace(/^#/, "") || "/";
  for (const { patron, vista } of rutas) {
    const m = ruta.match(patron);
    if (m) { await vista(...m.slice(1)); return; }
  }
  location.hash = "#/";
}

window.addEventListener("hashchange", resolver);
