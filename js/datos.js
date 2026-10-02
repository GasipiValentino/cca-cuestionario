// Carga del banco de preguntas desde data/*.json (con caché en memoria).

let manifest = null;
const evaluaciones = new Map();   // id -> { id, titulo, preguntas }
const indice = new Map();         // id de pregunta -> pregunta (con evalId)

async function obtenerJSON(ruta) {
  const r = await fetch(ruta, { cache: "no-cache" });
  if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
  return r.json();
}

export async function cargarManifest() {
  if (!manifest) manifest = await obtenerJSON("data/manifest.json");
  return manifest;
}

export async function cargarEvaluacion(id) {
  if (evaluaciones.has(id)) return evaluaciones.get(id);
  const man = await cargarManifest();
  const meta = man.evaluaciones.find(e => e.id === id);
  if (!meta) throw new Error(`No existe la evaluación ${id}`);
  const datos = await obtenerJSON(`data/${meta.archivo}`);
  for (const p of datos.preguntas) {
    p.evalId = id;
    indice.set(p.id, p);
  }
  evaluaciones.set(id, datos);
  return datos;
}

export async function cargarTodas() {
  const man = await cargarManifest();
  await Promise.all(man.evaluaciones.map(e => cargarEvaluacion(e.id)));
}

export function pregunta(id) { return indice.get(id) || null; }

export function nombreTema(codigo) { return manifest?.temas?.[codigo] || codigo; }
