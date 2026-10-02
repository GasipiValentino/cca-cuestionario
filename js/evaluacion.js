// Lógica pura de las evaluaciones: armado de sesiones, corrección y calificación.
// No toca el DOM ni el almacenamiento, para poder probarla de forma aislada (tests/).

export const PENALIZACION = 0.5;       // puntos que resta cada respuesta incorrecta (escala del parcial)
export const UMBRAL_APROBACION = 0.6;  // 60 % para aprobar el parcial

export function mezclar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Crea una sesión nueva.
 * Cada ítem guarda `orden`: la permutación de opciones que ve el usuario.
 * orden[posiciónMostrada] = índiceOriginal. Las respuestas se guardan siempre como
 * índice ORIGINAL, así la corrección no depende del orden en que se mostraron.
 */
export function crearSesion({ clave, tipo, evalId = null, titulo, preguntas, config }, aleatorio = Math.random) {
  const lista = config.mezclarPreguntas ? mezclar(preguntas, aleatorio) : [...preguntas];
  return {
    clave,
    tipo,                       // "evaluacion" | "practica"
    evalId,
    titulo,
    config: {
      modo: config.modo,        // "practica" | "examen"
      limiteMin: config.modo === "examen" ? (config.limiteMin || null) : null,
      mezclarPreguntas: !!config.mezclarPreguntas,
      mezclarOpciones: !!config.mezclarOpciones,
    },
    items: lista.map(p => ({
      id: p.id,
      evalId: p.evalId ?? evalId,
      orden: config.mezclarOpciones ? mezclar([0, 1, 2, 3], aleatorio) : [0, 1, 2, 3],
    })),
    respuestas: {},             // id -> índice original elegido
    marcadas: {},               // id -> true (marcada para revisar)
    actual: 0,
    iniciada: Date.now(),
    segundos: 0,
  };
}

export function calcularNotas(correctas, incorrectas, total) {
  const porcentaje = total ? (correctas / total) * 100 : 0;
  const notaProporcional = total ? (correctas / total) * 10 : 0;
  const puntos = correctas - PENALIZACION * incorrectas;
  const notaPenalizada = total ? Math.max(0, puntos) / total * 10 : 0;
  return {
    porcentaje: redondear(porcentaje, 1),
    notaProporcional: redondear(notaProporcional, 2),
    puntosPenalizados: redondear(puntos, 2),
    notaPenalizada: redondear(notaPenalizada, 2),
    aprobadoParcial: total > 0 && puntos / total >= UMBRAL_APROBACION,
  };
}

/** Corrige una sesión. `buscar(id)` devuelve la pregunta completa (con `correcta`). */
export function corregir(sesion, buscar) {
  const items = [];
  let correctas = 0, incorrectas = 0, sinResponder = 0;
  for (const item of sesion.items) {
    const pregunta = buscar(item.id);
    if (!pregunta) continue; // pregunta eliminada del banco: no se califica
    const respuesta = Object.prototype.hasOwnProperty.call(sesion.respuestas, item.id)
      ? sesion.respuestas[item.id] : null;
    let estado;
    if (respuesta === null || respuesta === undefined) { estado = "sin_responder"; sinResponder++; }
    else if (respuesta === pregunta.correcta) { estado = "correcta"; correctas++; }
    else { estado = "incorrecta"; incorrectas++; }
    items.push({ id: item.id, evalId: item.evalId, orden: item.orden, respuesta, estado, tema: pregunta.tema });
  }
  const total = items.length;
  return { total, correctas, incorrectas, sinResponder, ...calcularNotas(correctas, incorrectas, total), items };
}

export function valoracion(porcentaje) {
  if (porcentaje >= 90) return { nivel: "excelente", texto: "Excelente. Dominás muy bien los contenidos de esta evaluación." };
  if (porcentaje >= 75) return { nivel: "muy-bien", texto: "Muy bien. Revisá los pocos errores para consolidar." };
  if (porcentaje >= 60) return { nivel: "aprobado", texto: "Aprobado. Superás el 60 % de aciertos, pero hay temas para reforzar." };
  if (porcentaje >= 40) return { nivel: "insuficiente", texto: "Insuficiente. Repasá los temas con más errores y reintentá las falladas." };
  return { nivel: "repasar", texto: "Necesitás repasar. Volvé al material de los temas indicados abajo antes de reintentar." };
}

/** Resumen de aciertos por tema para la pantalla de resultados. */
export function resumenPorTema(items) {
  const mapa = {};
  for (const it of items) {
    const t = (mapa[it.tema] ||= { total: 0, correctas: 0 });
    t.total++;
    if (it.estado === "correcta") t.correctas++;
  }
  return Object.entries(mapa)
    .map(([tema, v]) => ({ tema, ...v, porcentaje: redondear(v.correctas / v.total * 100, 0) }))
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

export function redondear(x, decimales) {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}
