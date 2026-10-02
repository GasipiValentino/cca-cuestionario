// Pantalla de resolución: una pregunta por pantalla, navegación, progreso y entrega.
import { h, LETRAS, tiempo, dialogo, aviso, bloqueCodigo, DIFICULTAD } from "../ui.js";
import { almacen } from "../almacen.js";
import { pregunta, nombreTema } from "../datos.js";
import { finalizar, asegurarPreguntasDe } from "../sesiones.js";
import { navegar, registrarSalida } from "../router.js";

export async function vistaExamen(contenedor, clave) {
  const sesion = almacen.sesion(clave);
  if (!sesion) { navegar("#/"); return; }
  await asegurarPreguntasDe(sesion);

  const total = sesion.items.length;
  const limiteSeg = sesion.config.limiteMin ? sesion.config.limiteMin * 60 : null;
  let entregando = false;

  // ---------- estructura fija ----------
  const contador = h("span", { class: "contador", "aria-live": "polite" });
  const barra = h("div", { class: "barra-progreso-relleno" });
  const reloj = h("span", { class: "reloj", hidden: sesion.config.modo !== "examen", "aria-label": "Tiempo" });
  const zonaPregunta = h("div", { class: "zona-pregunta" });
  const btnAnterior = h("button", { class: "btn btn-secundario", type: "button", onclick: () => ir(sesion.actual - 1) }, "← Anterior");
  const btnSiguiente = h("button", { class: "btn btn-primario", type: "button", onclick: () => ir(sesion.actual + 1) }, "Siguiente →");
  const btnMarcar = h("button", { class: "btn btn-texto", type: "button", onclick: alternarMarca });
  const grilla = h("div", { class: "grilla-nav", role: "list" });
  const resumenNav = h("p", { class: "resumen-nav" });
  const panelNav = h("aside", { class: "panel-nav", id: "panel-nav", "aria-label": "Navegación entre preguntas" },
    h("div", { class: "panel-nav-cabecera" },
      h("h2", {}, "Preguntas"),
      h("button", { class: "btn btn-texto solo-movil", type: "button", onclick: () => alternarNav(false) }, "Cerrar")),
    resumenNav,
    grilla,
    h("ul", { class: "leyenda-nav" },
      h("li", {}, h("span", { class: "punto respondida" }), "Respondida"),
      h("li", {}, h("span", { class: "punto" }), "Pendiente"),
      h("li", {}, h("span", { class: "punto marcada" }), "Marcada para revisar"),
      h("li", {}, h("span", { class: "punto actual" }), "Actual")));
  const btnNav = h("button", { class: "btn btn-secundario solo-movil", type: "button", "aria-controls": "panel-nav", onclick: () => alternarNav() });

  const celdas = sesion.items.map((item, i) =>
    h("button", { class: "celda-nav", type: "button", role: "listitem", onclick: () => { ir(i); alternarNav(false); } }, String(i + 1)));
  grilla.append(...celdas);

  contenedor.replaceChildren(
    h("div", { class: "examen" },
      h("header", { class: "barra-examen" },
        h("div", { class: "barra-examen-fila" },
          h("button", { class: "btn btn-texto", type: "button", onclick: salir, "aria-label": "Guardar y salir" },
            h("span", { class: "solo-escritorio" }, "← Guardar y salir"), h("span", { class: "solo-movil-texto" }, "← Salir")),
          h("div", { class: "barra-examen-titulo" },
            h("strong", {}, sesion.titulo),
            h("span", { class: "modo" }, sesion.config.modo === "examen" ? "Modo examen" : "Modo práctica")),
          h("div", { class: "barra-examen-acciones" }, reloj, btnNav,
            h("button", { class: "btn btn-finalizar", type: "button", onclick: () => entregar(false) },
              h("span", { class: "solo-escritorio" }, sesion.tipo === "practica" ? "Finalizar práctica" : "Finalizar evaluación"),
              h("span", { class: "solo-movil-texto" }, "Finalizar")))),
        h("div", { class: "barra-progreso", role: "progressbar", "aria-label": "Preguntas respondidas" }, barra)),
      h("div", { class: "examen-cuerpo" },
        h("main", { class: "examen-principal" },
          contador,
          zonaPregunta,
          h("div", { class: "examen-pie" }, btnAnterior, btnMarcar, btnSiguiente)),
        panelNav)));

  // ---------- render ----------
  function render() {
    const item = sesion.items[sesion.actual];
    const p = pregunta(item.id);
    const elegida = sesion.respuestas[item.id];
    contador.textContent = `Pregunta ${sesion.actual + 1} de ${total}`;

    const opciones = item.orden.map((original, pos) => {
      const marcada = elegida === original;
      return h("button", {
        class: `opcion${marcada ? " elegida" : ""}`, type: "button", role: "radio",
        "aria-checked": marcada ? "true" : "false",
        onclick: () => responder(original),
      },
        h("span", { class: "opcion-letra" }, LETRAS[pos]),
        h("span", { class: "opcion-texto" }, p.opciones[original]));
    });

    zonaPregunta.replaceChildren(
      h("article", { class: "tarjeta-pregunta" },
        h("div", { class: "pregunta-meta" },
          h("span", { class: "chip" }, nombreTema(p.tema)),
          h("span", { class: `chip chip-${p.dificultad}` }, DIFICULTAD[p.dificultad])),
        h("h2", { class: "enunciado", id: "enunciado", tabindex: "-1" }, p.enunciado),
        bloqueCodigo(p.codigo),
        h("div", { class: "opciones", role: "radiogroup", "aria-labelledby": "enunciado" }, opciones),
        elegida !== undefined && h("button", { class: "btn btn-texto btn-chico borrar-respuesta", type: "button", onclick: () => responder(null) }, "Borrar mi respuesta")));

    btnAnterior.disabled = sesion.actual === 0;
    btnSiguiente.textContent = sesion.actual === total - 1 ? "Revisar y finalizar" : "Siguiente →";
    btnMarcar.textContent = sesion.marcadas[item.id] ? "★ Marcada para revisar" : "☆ Marcar para revisar";
    btnMarcar.setAttribute("aria-pressed", sesion.marcadas[item.id] ? "true" : "false");
    actualizarNav();
  }

  function actualizarNav() {
    const respondidas = Object.keys(sesion.respuestas).length;
    sesion.items.forEach((item, i) => {
      const c = celdas[i];
      const resp = sesion.respuestas[item.id] !== undefined;
      c.className = `celda-nav${resp ? " respondida" : ""}${sesion.marcadas[item.id] ? " marcada" : ""}${i === sesion.actual ? " actual" : ""}`;
      c.setAttribute("aria-label", `Pregunta ${i + 1}: ${resp ? "respondida" : "sin responder"}${sesion.marcadas[item.id] ? ", marcada" : ""}`);
      if (i === sesion.actual) c.setAttribute("aria-current", "step"); else c.removeAttribute("aria-current");
    });
    resumenNav.textContent = `${respondidas} respondidas · ${total - respondidas} pendientes`;
    btnNav.textContent = `☰ ${respondidas}/${total}`;
    btnNav.setAttribute("aria-label", `Ver preguntas: ${respondidas} de ${total} respondidas`);
    barra.style.width = `${respondidas / total * 100}%`;
    barra.parentElement.setAttribute("aria-valuenow", String(respondidas));
    barra.parentElement.setAttribute("aria-valuemax", String(total));
  }

  // ---------- acciones ----------
  function responder(original) {
    const id = sesion.items[sesion.actual].id;
    if (original === null) delete sesion.respuestas[id];
    else sesion.respuestas[id] = original;
    guardar();
    render();
  }

  function ir(i) {
    if (i >= total) { entregar(false); return; }
    if (i < 0) return;
    sesion.actual = i;
    guardar();
    render();
    zonaPregunta.querySelector(".enunciado")?.focus?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alternarMarca() {
    const id = sesion.items[sesion.actual].id;
    if (sesion.marcadas[id]) delete sesion.marcadas[id]; else sesion.marcadas[id] = true;
    guardar();
    render();
  }

  function alternarNav(abrir) {
    const abierto = panelNav.classList.toggle("abierto", abrir);
    btnNav.setAttribute("aria-expanded", abierto ? "true" : "false");
  }

  function guardar() { almacen.guardarSesion(sesion); }

  function salir() {
    guardar();
    aviso("Progreso guardado. Podés continuar cuando quieras.");
    navegar("#/");
  }

  async function entregar(porTiempo) {
    if (entregando) return;
    const respondidas = Object.keys(sesion.respuestas).length;
    const pendientes = sesion.items.map((it, i) => (sesion.respuestas[it.id] === undefined ? i : -1)).filter(i => i >= 0);
    if (!porTiempo) {
      const accion = await dialogo({
        titulo: sesion.tipo === "practica" ? "¿Finalizar la práctica?" : "¿Entregar la evaluación?",
        cuerpo: cerrar => h("div", {},
          h("div", { class: "resumen-entrega" },
            h("div", {}, h("span", { class: "grande" }, respondidas), h("span", {}, "respondidas")),
            h("div", { class: pendientes.length ? "atencion" : "" }, h("span", { class: "grande" }, pendientes.length), h("span", {}, "sin responder"))),
          pendientes.length
            ? h("div", {},
                h("p", {}, "Las preguntas sin responder se contarán como incorrectas (sin penalización adicional en la escala del parcial) y se mostrarán por separado en la revisión."),
                h("p", { class: "pendientes-lista" }, "Pendientes: ",
                  pendientes.map(i => h("button", { class: "enlace-pendiente", type: "button",
                    onclick: () => cerrar({ ir: i }) }, String(i + 1)))))
            : h("p", {}, "Respondiste todas las preguntas.")),
        botones: [{ texto: "Seguir respondiendo", valor: false }, { texto: "Entregar y ver resultados", valor: true, clase: "btn-primario" }],
      });
      if (accion && accion.ir !== undefined) { ir(accion.ir); return; }
      if (!accion) return;
    }
    entregando = true;
    clearInterval(timer);
    const intento = finalizar(sesion);
    if (porTiempo) aviso("Se terminó el tiempo: la evaluación se entregó automáticamente.");
    navegar(`#/resultado/${intento.id}`);
  }

  // ---------- cronómetro ----------
  let ultimoGuardado = Date.now();
  let marca = Date.now();
  const tick = () => {
    const ahora = Date.now();
    // En modo examen el tiempo corre aunque la pestaña quede en segundo plano (como en un examen real);
    // en modo práctica solo se cuenta el tiempo con la pestaña visible.
    if (sesion.config.modo === "examen" || document.visibilityState === "visible") sesion.segundos += (ahora - marca) / 1000;
    marca = ahora;
    if (sesion.config.modo === "examen") {
      reloj.replaceChildren(`⏱ ${tiempo(limiteSeg ? limiteSeg - sesion.segundos : sesion.segundos)}`,
        limiteSeg ? h("span", { class: "solo-escritorio" }, " restantes") : "");
      reloj.classList.toggle("urgente", !!limiteSeg && limiteSeg - sesion.segundos < 300);
    }
    if (ahora - ultimoGuardado > 5000) { guardar(); ultimoGuardado = ahora; }
    if (limiteSeg && sesion.segundos >= limiteSeg) entregar(true);
  };
  const timer = setInterval(tick, 1000);
  const alCambiarVisibilidad = () => { marca = Date.now(); guardar(); };
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  // ---------- teclado ----------
  const teclas = e => {
    if (document.querySelector(".modal-fondo")) return;
    if (e.target.closest?.("input, select, textarea")) return;
    const k = e.key.toLowerCase();
    const idx = ["a", "b", "c", "d"].indexOf(k) >= 0 ? ["a", "b", "c", "d"].indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
    if (idx >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) { responder(sesion.items[sesion.actual].orden[idx]); }
    else if (e.key === "ArrowRight") ir(sesion.actual + 1 < total ? sesion.actual + 1 : sesion.actual);
    else if (e.key === "ArrowLeft") ir(sesion.actual - 1);
  };
  document.addEventListener("keydown", teclas);
  window.addEventListener("beforeunload", guardar);

  registrarSalida(() => {
    clearInterval(timer);
    document.removeEventListener("keydown", teclas);
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    window.removeEventListener("beforeunload", guardar);
    if (!entregando && almacen.sesion(clave)) guardar();
  });

  render();
  tick();
}
