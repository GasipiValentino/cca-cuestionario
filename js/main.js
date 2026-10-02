// Punto de entrada: define las rutas y monta cada vista en #app.
import { cargarManifest } from "./datos.js";
import { definirRutas, resolver } from "./router.js";
import { h } from "./ui.js";
import { vistaInicio } from "./vistas/inicio.js";
import { vistaConfigurar } from "./vistas/configurar.js";
import { vistaExamen } from "./vistas/examen.js";
import { vistaResultados } from "./vistas/resultados.js";
import { vistaFalladas } from "./vistas/falladas.js";

const app = document.getElementById("app");

function montar(nodo) {
  app.replaceChildren(nodo);
  window.scrollTo({ top: 0 });
}

function error(e) {
  console.error(e);
  montar(h("div", { class: "pagina" },
    h("div", { class: "alerta" },
      h("strong", {}, "No se pudieron cargar las preguntas. "),
      "Abrí la página desde un servidor local (por ejemplo: python -m http.server 8000) y no haciendo doble clic sobre index.html. ",
      h("br"), h("small", {}, String(e.message || e)))));
}

async function iniciar() {
  try {
    const manifest = await cargarManifest();
    definirRutas([
      { patron: /^\/$/, vista: () => montar(vistaInicio(manifest)) },
      { patron: /^\/evaluacion\/(\d+)$/, vista: id => {
          const meta = manifest.evaluaciones.find(e => e.id === Number(id));
          if (!meta) { location.hash = "#/"; return; }
          montar(vistaConfigurar(meta));
        } },
      { patron: /^\/sesion\/([\w-]+)$/, vista: clave => vistaExamen(app, clave) },
      { patron: /^\/resultado\/([\w-]+)$/, vista: id => vistaResultados(app, id) },
      { patron: /^\/falladas$/, vista: () => vistaFalladas(app) },
    ]);
    await resolver();
  } catch (e) {
    error(e);
  }
}

window.addEventListener("unhandledrejection", ev => error(ev.reason));
iniciar();
