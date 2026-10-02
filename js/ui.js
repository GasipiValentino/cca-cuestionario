// Utilidades de interfaz: creación de elementos, formatos y diálogos.

/** Crea un elemento. Los hijos de texto se insertan como texto (nunca como HTML). */
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

export const LETRAS = ["A", "B", "C", "D"];

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
export function numero(x, decimales) {
  if (decimales === undefined) return fmt.format(x);
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(x);
}

export function tiempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const dos = n => String(n).padStart(2, "0");
  return hh ? `${hh}:${dos(mm)}:${dos(ss)}` : `${dos(mm)}:${dos(ss)}`;
}

export function fecha(ms) {
  return new Date(ms).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const DIFICULTAD = { facil: "Fácil", media: "Intermedia", dificil: "Avanzada" };

/** Diálogo modal accesible. Devuelve una promesa con el valor del botón elegido. */
export function dialogo({ titulo, cuerpo, botones }) {
  return new Promise(resolve => {
    const raiz = document.getElementById("modal-raiz");
    const previo = document.activeElement;
    const cerrar = valor => {
      fondo.remove();
      document.removeEventListener("keydown", teclas);
      previo?.focus?.();
      resolve(valor);
    };
    const teclas = e => { if (e.key === "Escape") cerrar(null); };
    const caja = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-titulo" },
      h("h2", { id: "modal-titulo", class: "modal-titulo" }, titulo),
      h("div", { class: "modal-cuerpo" }, typeof cuerpo === "function" ? cuerpo(v => cerrar(v)) : cuerpo),
      h("div", { class: "modal-acciones" },
        botones.map(b => h("button", { class: `btn ${b.clase || ""}`, type: "button", onclick: () => cerrar(b.valor) }, b.texto))));
    const fondo = h("div", { class: "modal-fondo", onclick: e => { if (e.target === fondo) cerrar(null); } }, caja);
    raiz.append(fondo);
    document.addEventListener("keydown", teclas);
    (caja.querySelector(".btn-primario") || caja.querySelector("button"))?.focus();
  });
}

export function aviso(texto) {
  const t = h("div", { class: "toast", role: "status" }, texto);
  document.body.append(t);
  setTimeout(() => t.classList.add("visible"), 10);
  setTimeout(() => { t.classList.remove("visible"); setTimeout(() => t.remove(), 300); }, 3200);
}

export function bloqueCodigo(codigo) {
  return codigo ? h("pre", { class: "codigo" }, h("code", {}, codigo)) : null;
}
