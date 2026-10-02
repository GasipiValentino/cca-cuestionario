// Banco personal de preguntas falladas: práctica de todas, por tema o por evaluación.
import { h, numero, aviso } from "../ui.js";
import { almacen } from "../almacen.js";
import { cargarTodas, pregunta, nombreTema } from "../datos.js";
import { iniciarPractica, CLAVE_PRACTICA } from "../sesiones.js";
import { navegar } from "../router.js";

export async function vistaFalladas(contenedor) {
  await cargarTodas();
  const ids = Object.keys(almacen.falladas()).filter(id => pregunta(id));
  const porTema = agrupar(ids, id => pregunta(id).tema);
  const porEval = agrupar(ids, id => pregunta(id).evalId);
  const mezclar = h("input", { type: "checkbox", checked: true });

  const empezar = async (lista, titulo) => {
    if (almacen.sesion(CLAVE_PRACTICA)) aviso("Había otra práctica en curso: se reemplazó por esta.");
    const sesion = await iniciarPractica(lista, titulo, { modo: "practica", mezclarPreguntas: mezclar.checked, mezclarOpciones: true });
    if (sesion) navegar(`#/sesion/${CLAVE_PRACTICA}`);
  };

  contenedor.replaceChildren(h("div", { class: "pagina" },
    h("nav", { class: "migas" }, h("a", { href: "#/" }, "← Volver al panel")),
    h("header", { class: "cabecera" },
      h("div", {},
        h("p", { class: "sobretitulo" }, "Repaso dirigido"),
        h("h1", {}, "Preguntas falladas"),
        h("p", { class: "bajada" },
          "Acá se acumulan las preguntas que respondiste mal o dejaste sin responder en cualquier intento. ",
          "Cuando las respondés bien en una práctica o en una evaluación, salen de esta lista."))),

    !ids.length
      ? h("section", { class: "panel" }, h("p", { class: "vacio" }, "No tenés preguntas falladas pendientes. ¡Bien!"))
      : h("div", { class: "dos-columnas" },
          h("section", { class: "panel" },
            h("h2", {}, `${numero(ids.length)} preguntas pendientes`),
            h("label", { class: "check" }, mezclar, "Mezclar el orden de las preguntas"),
            h("button", { class: "btn btn-primario btn-grande", type: "button",
              onclick: () => empezar(ids, `Práctica de falladas (${ids.length})`) }, "Practicar todas las falladas"),
            h("h3", { class: "subtitulo" }, "Por tema"),
            h("ul", { class: "lista-temas accionable" },
              Object.entries(porTema).sort((a, b) => b[1].length - a[1].length).map(([tema, lista]) =>
                h("li", {},
                  h("span", {}, nombreTema(tema)),
                  h("button", { class: "btn btn-secundario btn-chico", type: "button",
                    onclick: () => empezar(lista, `Falladas — ${nombreTema(tema)}`) }, `Practicar ${lista.length}`))))),
          h("section", { class: "panel" },
            h("h2", {}, "Por evaluación"),
            h("ul", { class: "lista-temas accionable" },
              Object.entries(porEval).sort((a, b) => Number(a[0]) - Number(b[0])).map(([ev, lista]) =>
                h("li", {},
                  h("span", {}, `Evaluación ${ev}`),
                  h("button", { class: "btn btn-secundario btn-chico", type: "button",
                    onclick: () => empezar(lista, `Falladas — Evaluación ${ev}`) }, `Practicar ${lista.length}`))))))));
}

function agrupar(ids, clave) {
  const g = {};
  for (const id of ids) (g[clave(id)] ||= []).push(id);
  return g;
}
