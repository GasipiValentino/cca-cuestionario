// Orquesta sesiones: une la lógica de evaluación, los datos y el almacenamiento.
import { crearSesion, corregir } from "./evaluacion.js";
import { almacen } from "./almacen.js";
import { cargarEvaluacion, cargarTodas, pregunta } from "./datos.js";

export const CLAVE_PRACTICA = "practica";
export const claveEvaluacion = id => `ev-${id}`;

export async function iniciarEvaluacion(evalId, config) {
  const datos = await cargarEvaluacion(evalId);
  const sesion = crearSesion({
    clave: claveEvaluacion(evalId),
    tipo: "evaluacion",
    evalId,
    titulo: datos.titulo,
    preguntas: datos.preguntas,
    config,
  });
  almacen.guardarSesion(sesion);
  return sesion;
}

/** Práctica con un subconjunto de preguntas (falladas de un intento o del historial). */
export async function iniciarPractica(ids, titulo, config) {
  await cargarTodas();
  const preguntas = ids.map(pregunta).filter(Boolean);
  if (!preguntas.length) return null;
  const sesion = crearSesion({ clave: CLAVE_PRACTICA, tipo: "practica", titulo, preguntas, config });
  almacen.guardarSesion(sesion);
  return sesion;
}

export async function asegurarPreguntasDe(sesion) {
  const evals = new Set(sesion.items.map(i => i.evalId));
  await Promise.all([...evals].map(id => cargarEvaluacion(id)));
}

export function finalizar(sesion) {
  const resultado = corregir(sesion, pregunta);
  const intento = {
    id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tipo: sesion.tipo,
    evalId: sesion.evalId,
    titulo: sesion.titulo,
    fecha: Date.now(),
    segundos: Math.round(sesion.segundos),
    config: sesion.config,
    ...resultado,
  };
  almacen.registrarIntento(intento);
  almacen.borrarSesion(sesion.clave);
  return intento;
}

/** Estado de una evaluación para el panel: no iniciada, en curso o completada. */
export function estadoEvaluacion(evalId) {
  const enCurso = almacen.sesion(claveEvaluacion(evalId));
  const intentos = almacen.intentosDe(evalId);
  return {
    estado: enCurso ? "en_curso" : intentos.length ? "completada" : "no_iniciada",
    enCurso,
    intentos,
    ultimo: intentos[intentos.length - 1] || null,
  };
}

export function notaPrincipal(intento) {
  return almacen.ajuste("notaPrincipal") === "proporcional" ? intento.notaProporcional : intento.notaPenalizada;
}
