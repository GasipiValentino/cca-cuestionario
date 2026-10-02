// Página de una evaluación: configuración del intento e historial de resultados.
import { h, numero, tiempo, fecha, dialogo } from "../ui.js";
import { nombreTema } from "../datos.js";
import { estadoEvaluacion, iniciarEvaluacion, claveEvaluacion, notaPrincipal } from "../sesiones.js";
import { navegar } from "../router.js";

export function vistaConfigurar(meta) {
  const { enCurso, intentos } = estadoEvaluacion(meta.id);
  const limiteSugerido = Math.round(meta.cantidad * 1.5);

  const form = h("form", { class: "panel config", onsubmit: async e => {
    e.preventDefault();
    const datos = new FormData(form);
    const config = {
      modo: datos.get("modo"),
      limiteMin: datos.get("modo") === "examen" ? Number(datos.get("limite")) || null : null,
      mezclarPreguntas: datos.get("mezclarPreguntas") === "on",
      mezclarOpciones: datos.get("mezclarOpciones") === "on",
    };
    if (enCurso) {
      const ok = await dialogo({ titulo: "Empezar de nuevo", cuerpo: h("p", {}, "Ya tenés un intento en curso en esta evaluación. Si empezás de nuevo, se descartan sus respuestas."),
        botones: [{ texto: "Cancelar", valor: false }, { texto: "Descartar y empezar", valor: true, clase: "btn-peligro" }] });
      if (!ok) return;
    }
    await iniciarEvaluacion(meta.id, config);
    navegar(`#/sesion/${claveEvaluacion(meta.id)}`);
  } },
    h("h2", {}, enCurso ? "Nuevo intento" : "Configurar el intento"),
    h("fieldset", { class: "grupo" },
      h("legend", {}, "Modo"),
      radio("modo", "practica", "Práctica", "Sin límite de tiempo. El tiempo se registra igual, pero no se muestra.", true),
      radio("modo", "examen", "Examen", "Con cronómetro visible y límite de tiempo opcional.")),
    h("label", { class: "campo", id: "campo-limite" },
      h("span", {}, "Límite de tiempo (modo examen)"),
      h("select", { name: "limite" },
        h("option", { value: "" }, "Sin límite, solo cronómetro"),
        [20, 30, 45, 60, 90].map(m => h("option", { value: m, selected: m === limiteSugerido }, `${m} minutos`)))),
    h("fieldset", { class: "grupo" },
      h("legend", {}, "Orden"),
      check("mezclarPreguntas", "Mezclar el orden de las preguntas", false),
      check("mezclarOpciones", "Mezclar el orden de las opciones (A–D)", true)),
    h("p", { class: "nota-al-pie" },
      "Las respuestas correctas y las explicaciones se muestran recién al finalizar. ",
      "Las preguntas sin responder cuentan como incorrectas en la nota, pero se informan por separado."),
    h("button", { class: "btn btn-primario btn-grande", type: "submit" }, enCurso ? "Descartar y empezar de nuevo" : "Comenzar evaluación"));

  const actualizarLimite = () => {
    const modo = form.querySelector("input[name=modo]:checked").value;
    form.querySelector("#campo-limite").classList.toggle("deshabilitado", modo !== "examen");
    form.querySelector("select[name=limite]").disabled = modo !== "examen";
  };
  form.addEventListener("change", actualizarLimite);
  queueMicrotask(actualizarLimite);

  return h("div", { class: "pagina" },
    h("nav", { class: "migas" }, h("a", { href: "#/" }, "← Volver al panel")),
    h("header", { class: "cabecera" },
      h("div", {},
        h("p", { class: "sobretitulo" }, `Evaluación ${meta.id} de 13`),
        h("h1", {}, meta.titulo),
        h("p", { class: "bajada" }, `${meta.cantidad} preguntas · ${numero(meta.dificultad.facil || 0)} fáciles, ${numero(meta.dificultad.media || 0)} intermedias y ${numero(meta.dificultad.dificil || 0)} avanzadas, en orden progresivo.`))),

    enCurso && h("div", { class: "aviso-practica" },
      h("div", {}, h("strong", {}, "Intento en curso: "),
        `${Object.keys(enCurso.respuestas).length} de ${enCurso.items.length} respondidas · pregunta ${enCurso.actual + 1} · `,
        enCurso.config.modo === "examen" ? "modo examen" : "modo práctica"),
      h("button", { class: "btn btn-primario", type: "button", onclick: () => navegar(`#/sesion/${claveEvaluacion(meta.id)}`) }, "Continuar donde lo dejé")),

    h("div", { class: "dos-columnas" },
      form,
      h("div", { class: "columna" },
        h("section", { class: "panel" },
          h("h2", {}, "Temas incluidos"),
          h("ul", { class: "lista-temas" },
            Object.entries(meta.temas).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
              h("li", {}, h("span", {}, nombreTema(t)), h("span", { class: "cuenta" }, n))))),
        historial(intentos))));
}

function historial(intentos) {
  if (!intentos.length) {
    return h("section", { class: "panel" }, h("h2", {}, "Historial"), h("p", { class: "vacio" }, "Todavía no hiciste esta evaluación."));
  }
  const mejor = Math.max(...intentos.map(notaPrincipal));
  return h("section", { class: "panel" },
    h("h2", {}, "Historial de intentos"),
    h("p", { class: "nota-al-pie" }, `Mejor nota: ${numero(mejor, 2)} / 10 · ${intentos.length} intento${intentos.length > 1 ? "s" : ""}`),
    h("div", { class: "tabla-scroll" },
      h("table", { class: "tabla" },
        h("thead", {}, h("tr", {},
          ["#", "Fecha", "Modo", "✓", "✗", "—", "%", "Nota", "Tiempo", ""].map(t => h("th", { scope: "col" }, t)))),
        h("tbody", {},
          intentos.map((i, k) => {
            const previo = intentos[k - 1];
            const delta = previo ? notaPrincipal(i) - notaPrincipal(previo) : 0;
            return h("tr", {},
              h("td", {}, k + 1),
              h("td", {}, fecha(i.fecha)),
              h("td", {}, i.config?.modo === "examen" ? "Examen" : "Práctica"),
              h("td", { class: "ok" }, i.correctas),
              h("td", { class: "mal" }, i.incorrectas),
              h("td", {}, i.sinResponder),
              h("td", {}, `${numero(i.porcentaje, 1)}`),
              h("td", { class: "nota-celda" }, numero(notaPrincipal(i), 2),
                previo && Math.abs(delta) >= 0.01 && h("span", { class: delta > 0 ? "sube" : "baja", title: "Diferencia con el intento anterior" },
                  delta > 0 ? ` ▲${numero(delta, 2)}` : ` ▼${numero(-delta, 2)}`)),
              h("td", {}, tiempo(i.segundos)),
              h("td", {}, h("a", { href: `#/resultado/${i.id}` }, "Revisar")));
          })))));
}

function radio(nombre, valor, titulo, detalle, marcado = false) {
  const id = `${nombre}-${valor}`;
  return h("label", { class: "opcion-config", for: id },
    h("input", { type: "radio", name: nombre, id, value: valor, checked: marcado }),
    h("span", {}, h("strong", {}, titulo), h("small", {}, detalle)));
}

function check(nombre, texto, marcado) {
  return h("label", { class: "check" }, h("input", { type: "checkbox", name: nombre, checked: marcado }), texto);
}

