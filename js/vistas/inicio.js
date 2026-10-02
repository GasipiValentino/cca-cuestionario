// Panel principal: resumen global y tarjetas de las 13 evaluaciones.
import { h, numero, dialogo, aviso } from "../ui.js";
import { almacen } from "../almacen.js";
import { estadoEvaluacion, notaPrincipal, CLAVE_PRACTICA, claveEvaluacion } from "../sesiones.js";
import { navegar } from "../router.js";

const ESTADOS = {
  no_iniciada: { texto: "No iniciada", clase: "estado-no" },
  en_curso: { texto: "En curso", clase: "estado-curso" },
  completada: { texto: "Completada", clase: "estado-ok" },
};

export function vistaInicio(manifest) {
  const evaluaciones = manifest.evaluaciones.map(meta => ({ meta, ...estadoEvaluacion(meta.id) }));
  const completadas = evaluaciones.filter(e => e.ultimo);
  const intentosEval = almacen.estado.intentos.filter(i => i.tipo === "evaluacion");
  const totalPreg = intentosEval.reduce((s, i) => s + i.total, 0);
  const totalOk = intentosEval.reduce((s, i) => s + i.correctas, 0);
  const promedio = completadas.length
    ? completadas.reduce((s, e) => s + notaPrincipal(e.ultimo), 0) / completadas.length : null;
  const nFalladas = Object.keys(almacen.falladas()).length;
  const escala = almacen.ajuste("notaPrincipal") === "proporcional" ? "proporcional" : "con penalización";
  const practica = almacen.sesion(CLAVE_PRACTICA);

  return h("div", { class: "pagina" },
    h("header", { class: "cabecera" },
      h("div", {},
        h("p", { class: "sobretitulo" }, "Computación Científica Actuarial · Cátedra Del Rosso"),
        h("h1", {}, "Simulador de evaluaciones"),
        h("p", { class: "bajada" },
          "500 preguntas de opción múltiple elaboradas a partir del material de la materia, organizadas en 13 evaluaciones independientes. ",
          "Al finalizar cada una vas a ver tu nota y la corrección detallada de cada respuesta, con las explicaciones y la referencia al material."))),

    !almacen.disponible && h("div", { class: "alerta" },
      "Tu navegador no permite guardar datos locales: el progreso se perderá al cerrar la página."),

    h("section", { class: "metricas", "aria-label": "Resumen de tu progreso" },
      metrica("Evaluaciones completadas", `${completadas.length} / ${evaluaciones.length}`),
      metrica("Promedio de últimas notas", promedio === null ? "—" : `${numero(promedio, 2)} / 10`, `Escala ${escala}`),
      metrica("Respuestas correctas", totalPreg ? numero(totalOk) : "—", totalPreg ? `de ${numero(totalPreg)} en todos los intentos` : "Todavía sin intentos"),
      metrica("Aciertos globales", totalPreg ? `${numero(totalOk / totalPreg * 100, 1)} %` : "—"),
      h("div", { class: "metrica metrica-accion" },
        h("span", { class: "metrica-etiqueta" }, "Preguntas falladas pendientes"),
        h("span", { class: "metrica-valor" }, numero(nFalladas)),
        h("button", { class: "btn btn-secundario btn-chico", type: "button", disabled: !nFalladas,
          onclick: () => navegar("#/falladas") }, "Practicar falladas"))),

    practica && h("div", { class: "aviso-practica" },
      h("div", {},
        h("strong", {}, "Tenés una práctica en curso: "), practica.titulo,
        ` (${Object.keys(practica.respuestas).length} de ${practica.items.length} respondidas)`),
      h("div", { class: "fila-botones" },
        h("button", { class: "btn btn-primario btn-chico", type: "button", onclick: () => navegar(`#/sesion/${CLAVE_PRACTICA}`) }, "Continuar"),
        h("button", { class: "btn btn-texto btn-chico", type: "button", onclick: async () => {
          const ok = await dialogo({ titulo: "Descartar práctica", cuerpo: h("p", {}, "Se perderán las respuestas de esta práctica. ¿Continuar?"),
            botones: [{ texto: "Cancelar", valor: false }, { texto: "Descartar", valor: true, clase: "btn-peligro" }] });
          if (ok) { almacen.borrarSesion(CLAVE_PRACTICA); navegar("#/", true); }
        } }, "Descartar"))),

    h("section", { "aria-labelledby": "titulo-evals" },
      h("div", { class: "seccion-cabecera" },
        h("h2", { id: "titulo-evals" }, "Evaluaciones"),
        h("p", { class: "leyenda" }, leyendaEstados())),
      h("div", { class: "grilla-evals" }, evaluaciones.map(tarjeta))),

    h("footer", { class: "pie" },
      h("fieldset", { class: "ajuste" },
        h("legend", {}, "Nota principal"),
        opcionNota("penalizada", "Con penalización (−0,5 por incorrecta, como el parcial)"),
        opcionNota("proporcional", "Proporcional (correctas / total × 10)")),
      h("button", { class: "btn btn-texto btn-peligro-texto", type: "button", onclick: borrarTodo }, "Borrar todo mi progreso")));
}

function metrica(etiqueta, valor, detalle) {
  return h("div", { class: "metrica" },
    h("span", { class: "metrica-etiqueta" }, etiqueta),
    h("span", { class: "metrica-valor" }, valor),
    detalle && h("span", { class: "metrica-detalle" }, detalle));
}

function leyendaEstados() {
  return Object.values(ESTADOS).map(e => h("span", { class: `chip-estado ${e.clase}` }, e.texto));
}

function tarjeta({ meta, estado, enCurso, intentos, ultimo }) {
  const e = ESTADOS[estado];
  const ir = () => navegar(estado === "en_curso" ? `#/sesion/${claveEvaluacion(meta.id)}` : `#/evaluacion/${meta.id}`);
  const respondidas = enCurso ? Object.keys(enCurso.respuestas).length : 0;
  return h("article", { class: `tarjeta-eval tarjeta-${estado}` },
    h("div", { class: "tarjeta-cabecera" },
      h("span", { class: "tarjeta-numero" }, String(meta.id).padStart(2, "0")),
      h("span", { class: `chip-estado ${e.clase}` }, e.texto)),
    h("h3", { class: "tarjeta-titulo" }, h("a", { href: `#/evaluacion/${meta.id}`, class: "tarjeta-enlace" }, meta.titulo)),
    h("p", { class: "tarjeta-sub" }, `${meta.cantidad} preguntas`),
    enCurso && h("p", { class: "tarjeta-dato" }, `Progreso: ${respondidas} de ${enCurso.items.length} respondidas`),
    ultimo
      ? h("div", { class: "tarjeta-resultado" },
          h("span", { class: `tarjeta-nota ${ultimo.porcentaje >= 60 ? "nota-alta" : "nota-baja"}` }, numero(notaPrincipal(ultimo), 2)),
          h("span", { class: "tarjeta-nota-de" }, "/ 10"),
          h("span", { class: "tarjeta-pct" }, `${numero(ultimo.porcentaje, 1)} % de aciertos`))
      : h("div", { class: "tarjeta-resultado vacio" }, "Sin resultados todavía"),
    intentos.length > 1 && miniHistorial(intentos),
    h("div", { class: "tarjeta-pie" },
      h("span", { class: "tarjeta-intentos" }, intentos.length ? `${intentos.length} intento${intentos.length > 1 ? "s" : ""}` : ""),
      h("button", { class: `btn ${estado === "completada" ? "btn-secundario" : "btn-primario"} btn-chico`, type: "button", onclick: ir },
        estado === "en_curso" ? "Continuar" : estado === "completada" ? "Ver / repetir" : "Comenzar")));
}

function miniHistorial(intentos) {
  const ultimos = intentos.slice(-8);
  return h("div", { class: "mini-historial", "aria-label": "Evolución de notas en los últimos intentos" },
    ultimos.map(i => {
      const n = notaPrincipal(i);
      return h("span", { class: "mini-barra", style: `height:${Math.max(6, n * 10)}%`, title: `${numero(n, 2)} / 10` });
    }));
}

function opcionNota(valor, texto) {
  const id = `nota-${valor}`;
  return h("label", { class: "radio", for: id },
    h("input", { type: "radio", name: "nota-principal", id, value: valor,
      checked: almacen.ajuste("notaPrincipal") === valor,
      onchange: () => { almacen.fijarAjuste("notaPrincipal", valor); navegar("#/", true); } }),
    texto);
}

async function borrarTodo() {
  const ok = await dialogo({
    titulo: "Borrar todo el progreso",
    cuerpo: h("p", {}, "Se eliminarán todos los intentos, el historial, las preguntas falladas y las evaluaciones en curso guardadas en este navegador. Esta acción no se puede deshacer."),
    botones: [{ texto: "Cancelar", valor: false }, { texto: "Borrar todo", valor: true, clase: "btn-peligro" }],
  });
  if (ok) { almacen.reiniciar(); aviso("Progreso borrado."); navegar("#/", true); }
}
