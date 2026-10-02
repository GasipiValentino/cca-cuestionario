// Resultados de un intento y «Revisión de respuestas» con foco en los errores.
import { h, LETRAS, numero, tiempo, fecha, bloqueCodigo, DIFICULTAD, aviso } from "../ui.js";
import { almacen } from "../almacen.js";
import { pregunta, nombreTema, cargarTodas } from "../datos.js";
import { valoracion, resumenPorTema, PENALIZACION } from "../evaluacion.js";
import { iniciarPractica, CLAVE_PRACTICA } from "../sesiones.js";
import { navegar } from "../router.js";

const FILTROS = [
  { id: "incorrecta", texto: "Incorrectas" },
  { id: "sin_responder", texto: "Sin responder" },
  { id: "correcta", texto: "Correctas" },
  { id: "todas", texto: "Todas" },
];

export async function vistaResultados(contenedor, intentoId) {
  const intento = almacen.intento(intentoId);
  if (!intento) { navegar("#/"); return; }
  await cargarTodas();

  const val = valoracion(intento.porcentaje);
  const principal = almacen.ajuste("notaPrincipal") === "proporcional" ? "proporcional" : "penalizada";
  const fallidas = intento.items.filter(i => i.estado !== "correcta");
  const porTema = resumenPorTema(intento.items);
  let filtro = intento.incorrectas ? "incorrecta" : intento.sinResponder ? "sin_responder" : "todas";

  const lista = h("div", { class: "lista-revision" });
  const chips = h("div", { class: "filtros", role: "tablist", "aria-label": "Filtrar preguntas" });

  function contar(id) { return id === "todas" ? intento.items.length : intento.items.filter(i => i.estado === id).length; }

  function pintarFiltros() {
    chips.replaceChildren(...FILTROS.map(f => h("button", {
      class: `filtro filtro-${f.id}${filtro === f.id ? " activo" : ""}`, type: "button", role: "tab",
      "aria-selected": filtro === f.id ? "true" : "false",
      onclick: () => { filtro = f.id; pintarFiltros(); pintarLista(); },
    }, `${f.texto} (${contar(f.id)})`)));
  }

  function pintarLista() {
    const visibles = intento.items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => filtro === "todas" || it.estado === filtro);
    lista.replaceChildren(...(visibles.length
      ? visibles.map(({ it, idx }) => tarjetaRevision(it, idx))
      : [h("p", { class: "vacio" }, "No hay preguntas en esta categoría.")]));
  }

  const notaBloque = (tipo, valor, etiqueta, detalle) => h("div", { class: `nota-bloque${principal === tipo ? " principal" : ""}` },
    h("span", { class: "nota-etiqueta" }, etiqueta),
    h("span", { class: "nota-valor" }, numero(valor, 2), h("small", {}, " / 10")),
    h("span", { class: "nota-detalle" }, detalle));

  contenedor.replaceChildren(h("div", { class: "pagina" },
    h("nav", { class: "migas" }, h("a", { href: "#/" }, "← Volver al panel"),
      intento.evalId && h("a", { href: `#/evaluacion/${intento.evalId}` }, "Ver historial de esta evaluación")),

    h("header", { class: "cabecera" },
      h("div", {},
        h("p", { class: "sobretitulo" }, `${intento.tipo === "practica" ? "Práctica" : "Resultado"} · ${fecha(intento.fecha)}`),
        h("h1", {}, intento.titulo))),

    h("section", { class: `panel resultado valor-${val.nivel}`, "aria-label": "Resumen del resultado" },
      h("div", { class: "resultado-notas" },
        notaBloque("penalizada", intento.notaPenalizada, "Nota con penalización",
          `Puntaje ${numero(intento.puntosPenalizados, 2)} de ${intento.total} (−${numero(PENALIZACION)} por incorrecta) · ${intento.aprobadoParcial ? "aprobaría el parcial (≥ 60 %)" : "no alcanza el 60 % del parcial"}`),
        notaBloque("proporcional", intento.notaProporcional, "Nota proporcional", `${intento.correctas} correctas de ${intento.total}`)),
      h("div", { class: "resultado-cifras" },
        cifra("Correctas", intento.correctas, "ok", "✓"),
        cifra("Incorrectas", intento.incorrectas, "mal", "✗"),
        cifra("Sin responder", intento.sinResponder, "neutro", "—"),
        cifra("Aciertos", `${numero(intento.porcentaje, 1)} %`, "", "%"),
        cifra("Tiempo empleado", tiempo(intento.segundos), "", "⏱")),
      h("p", { class: "valoracion" }, val.texto),
      h("p", { class: "nota-al-pie" },
        `Incorrectas o sin responder: ${intento.incorrectas + intento.sinResponder} (${intento.incorrectas} incorrectas + ${intento.sinResponder} sin responder). `,
        "Las sin responder cuentan como incorrectas en la nota proporcional y no restan en la escala con penalización.")),

    h("div", { class: "fila-botones acciones-resultado" },
      fallidas.length > 0 && h("button", { class: "btn btn-primario", type: "button", onclick: () => practicar(fallidas.map(i => i.id), intento) },
        `Reintentar las ${fallidas.length} incorrectas y sin responder`),
      intento.evalId && h("button", { class: "btn btn-secundario", type: "button", onclick: () => navegar(`#/evaluacion/${intento.evalId}`) }, "Repetir la evaluación completa"),
      h("button", { class: "btn btn-texto", type: "button", onclick: () => navegar("#/") }, "Ir al panel")),

    h("section", { class: "panel" },
      h("h2", {}, "Aciertos por tema"),
      h("p", { class: "nota-al-pie" }, "Ordenado de menor a mayor: arriba están los temas que más conviene repasar."),
      h("ul", { class: "temas-resultado" },
        porTema.map(t => h("li", {},
          h("span", { class: "tema-nombre" }, nombreTema(t.tema)),
          h("span", { class: "tema-barra", "aria-hidden": "true" }, h("span", { style: `width:${t.porcentaje}%`, class: t.porcentaje >= 60 ? "ok" : "mal" })),
          h("span", { class: "tema-cifra" }, `${t.correctas}/${t.total}`))))),

    h("section", { "aria-labelledby": "titulo-revision" },
      h("div", { class: "seccion-cabecera" },
        h("h2", { id: "titulo-revision" }, "Revisión de respuestas"),
        h("p", { class: "nota-al-pie" }, "Por defecto se muestran primero tus errores. Usá los filtros para ver el resto.")),
      chips,
      lista)));

  pintarFiltros();
  pintarLista();
  window.scrollTo({ top: 0 });

  function tarjetaRevision(it, idx) {
    const p = pregunta(it.id);
    if (!p) return h("article", { class: "tarjeta-revision" }, h("p", {}, "Esta pregunta ya no está en el banco."));
    const posElegida = it.respuesta === null ? -1 : it.orden.indexOf(it.respuesta);
    const posCorrecta = it.orden.indexOf(p.correcta);
    const estadoTexto = { correcta: "✓ Correcta", incorrecta: "✗ Incorrecta", sin_responder: "— Sin responder" }[it.estado];

    const opciones = it.orden.map((original, pos) => {
      const esCorrecta = original === p.correcta;
      const esElegida = original === it.respuesta;
      let clase = "rev-opcion", etiqueta = null;
      if (esCorrecta) { clase += " es-correcta"; etiqueta = esElegida ? "✓ Tu respuesta · Correcta" : "✓ Respuesta correcta"; }
      else if (esElegida) { clase += " es-incorrecta"; etiqueta = "✗ Tu respuesta"; }
      return h("li", { class: clase },
        h("span", { class: "opcion-letra" }, LETRAS[pos]),
        h("span", { class: "opcion-texto" }, p.opciones[original]),
        etiqueta && h("span", { class: "rev-etiqueta" }, etiqueta));
    });

    const otras = it.orden
      .map((original, pos) => ({ original, pos }))
      .filter(({ original }) => original !== p.correcta && original !== it.respuesta && p.por_que_no[original]);

    return h("article", { class: `tarjeta-revision rev-${it.estado}` },
      h("header", { class: "rev-cabecera" },
        h("span", { class: "rev-numero" }, `Pregunta ${idx + 1}`),
        h("span", { class: `rev-estado estado-${it.estado}` }, estadoTexto),
        h("span", { class: "chip" }, nombreTema(p.tema)),
        h("span", { class: `chip chip-${p.dificultad}` }, DIFICULTAD[p.dificultad])),
      h("h3", { class: "enunciado" }, p.enunciado),
      bloqueCodigo(p.codigo),
      h("ul", { class: "rev-opciones" }, opciones),
      h("dl", { class: "rev-resumen" },
        h("div", {}, h("dt", {}, "Tu respuesta"), h("dd", {}, posElegida >= 0 ? `${LETRAS[posElegida]}) ${p.opciones[it.respuesta]}` : "No respondiste")),
        h("div", {}, h("dt", {}, "Respuesta correcta"), h("dd", {}, `${LETRAS[posCorrecta]}) ${p.opciones[p.correcta]}`))),
      h("div", { class: "explicacion" },
        h("h4", {}, "Por qué es correcta"),
        h("p", {}, p.explicacion),
        it.estado === "incorrecta" && h("div", { class: "explicacion-error" },
          h("h4", {}, `Por qué tu respuesta (${LETRAS[posElegida]}) no es correcta`),
          h("p", {}, p.por_que_no[it.respuesta])),
        otras.length > 0 && h("details", { class: "otras" },
          h("summary", {}, "Ver por qué las otras opciones son incorrectas"),
          h("ul", {}, otras.map(({ original, pos }) => h("li", {}, h("strong", {}, `${LETRAS[pos]}) `), p.por_que_no[original])))),
        h("p", { class: "referencia" }, h("span", {}, "Referencia: "), p.referencia)));
  }
}

function cifra(etiqueta, valor, clase, icono) {
  return h("div", { class: `cifra ${clase}` },
    h("span", { class: "cifra-icono", "aria-hidden": "true" }, icono),
    h("span", { class: "cifra-valor" }, valor),
    h("span", { class: "cifra-etiqueta" }, etiqueta));
}

async function practicar(ids, intento) {
  if (almacen.sesion(CLAVE_PRACTICA)) {
    aviso("Había otra práctica en curso: se reemplazó por esta.");
  }
  const titulo = intento.evalId ? `Práctica de errores — Evaluación ${intento.evalId}` : `Práctica de errores — ${intento.titulo}`;
  const sesion = await iniciarPractica(ids, titulo, { modo: "practica", mezclarPreguntas: true, mezclarOpciones: true });
  if (sesion) navegar(`#/sesion/${CLAVE_PRACTICA}`);
}

