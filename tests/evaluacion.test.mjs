// Pruebas de la lógica de evaluación. Ejecutar con:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crearSesion, corregir, calcularNotas, mezclar, valoracion, resumenPorTema } from "../js/evaluacion.js";

const leer = ruta => JSON.parse(readFileSync(new URL(ruta, import.meta.url), "utf-8"));
const manifest = leer("../data/manifest.json");
const evaluaciones = manifest.evaluaciones.map(e => ({ ...e, datos: leer(`../data/${e.archivo}`) }));
const todas = evaluaciones.flatMap(e => e.datos.preguntas.map(p => ({ ...p, evalId: e.id })));
const indice = new Map(todas.map(p => [p.id, p]));
const buscar = id => indice.get(id);

// Generador pseudoaleatorio reproducible (mulberry32)
function rng(semilla) {
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("el banco tiene 500 preguntas en 13 evaluaciones (12 × 40 + 20)", () => {
  assert.equal(evaluaciones.length, 13);
  assert.deepEqual(evaluaciones.map(e => e.datos.preguntas.length), [...Array(12).fill(40), 20]);
  assert.equal(todas.length, 500);
  assert.equal(new Set(todas.map(p => p.id)).size, 500);
});

test("cada pregunta tiene 4 opciones, una correcta y explicaciones", () => {
  for (const p of todas) {
    assert.equal(p.opciones.length, 4, p.id);
    assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, p.id);
    assert.ok(p.explicacion.length > 30, p.id);
    assert.equal(p.por_que_no[p.correcta], "", p.id);
    assert.ok(p.referencia, p.id);
  }
});

test("ejemplo del enunciado: 30 de 40 correctas → 75 % y 7,5 / 10", () => {
  const n = calcularNotas(30, 10, 40);
  assert.equal(n.porcentaje, 75);
  assert.equal(n.notaProporcional, 7.5);
});

test("escala con penalización: −0,5 por incorrecta, sin responder no resta, mínimo 0", () => {
  assert.equal(calcularNotas(30, 10, 40).notaPenalizada, 6.25);   // (30 − 5) / 40 × 10
  assert.equal(calcularNotas(30, 0, 40).notaPenalizada, 7.5);     // 10 sin responder no restan
  assert.equal(calcularNotas(2, 30, 40).notaPenalizada, 0);       // no baja de 0
  assert.equal(calcularNotas(24, 0, 40).aprobadoParcial, true);   // 60 % exacto
  assert.equal(calcularNotas(25, 2, 40).aprobadoParcial, true);   // 24 puntos
  assert.equal(calcularNotas(25, 3, 40).aprobadoParcial, false);  // 23,5 puntos
});

test("mezclar las opciones no altera la corrección (todas las evaluaciones, 50 órdenes distintos)", () => {
  for (const ev of evaluaciones) {
    for (let s = 1; s <= 50; s++) {
      const sesion = crearSesion({ clave: "t", tipo: "evaluacion", evalId: ev.id, titulo: "t", preguntas: ev.datos.preguntas,
        config: { modo: "practica", mezclarPreguntas: true, mezclarOpciones: true } }, rng(s * 97 + ev.id));
      // El usuario elige la POSICIÓN mostrada que contiene el texto correcto.
      for (const it of sesion.items) {
        const p = buscar(it.id);
        const posMostrada = it.orden.findIndex(orig => p.opciones[orig] === p.opciones[p.correcta]);
        sesion.respuestas[it.id] = it.orden[posMostrada];
      }
      const r = corregir(sesion, buscar);
      assert.equal(r.correctas, ev.datos.preguntas.length);
      assert.equal(r.notaProporcional, 10);
    }
  }
});

test("cada orden de opciones es una permutación de 0..3", () => {
  const sesion = crearSesion({ clave: "t", tipo: "evaluacion", evalId: 1, titulo: "t", preguntas: evaluaciones[0].datos.preguntas,
    config: { modo: "practica", mezclarPreguntas: false, mezclarOpciones: true } }, rng(7));
  for (const it of sesion.items) assert.deepEqual([...it.orden].sort(), [0, 1, 2, 3]);
  assert.deepEqual(sesion.items.map(i => i.id), evaluaciones[0].datos.preguntas.map(p => p.id), "sin mezclar preguntas se respeta el orden");
});

test("sin responder se distingue de incorrecta y ambas cuentan como no acertadas", () => {
  const preguntas = evaluaciones[0].datos.preguntas;
  const sesion = crearSesion({ clave: "t", tipo: "evaluacion", evalId: 1, titulo: "t", preguntas,
    config: { modo: "examen", mezclarPreguntas: false, mezclarOpciones: false } });
  preguntas.forEach((p, i) => {
    if (i < 30) sesion.respuestas[p.id] = p.correcta;               // 30 correctas
    else if (i < 36) sesion.respuestas[p.id] = (p.correcta + 1) % 4; // 6 incorrectas
  });                                                              // 4 sin responder
  const r = corregir(sesion, buscar);
  assert.deepEqual([r.correctas, r.incorrectas, r.sinResponder, r.total], [30, 6, 4, 40]);
  assert.equal(r.notaProporcional, 7.5);
  assert.equal(r.notaPenalizada, 6.75);                             // (30 − 3) / 40 × 10
  assert.equal(r.items.filter(i => i.estado === "sin_responder").length, 4);
  assert.ok(r.items.every(i => i.respuesta === null || Number.isInteger(i.respuesta)));
});

test("una pregunta eliminada del banco se ignora al corregir", () => {
  const sesion = { items: [{ id: "NO-EXISTE", evalId: 1, orden: [0, 1, 2, 3] }, { id: todas[0].id, evalId: 1, orden: [0, 1, 2, 3] }], respuestas: {} };
  const r = corregir(sesion, buscar);
  assert.equal(r.total, 1);
});

test("mezclar devuelve una permutación sin modificar la lista original", () => {
  const base = [1, 2, 3, 4, 5, 6];
  const m = mezclar(base, rng(3));
  assert.deepEqual([...m].sort(), base);
  assert.deepEqual(base, [1, 2, 3, 4, 5, 6]);
});

test("valoración descriptiva según porcentaje", () => {
  assert.equal(valoracion(95).nivel, "excelente");
  assert.equal(valoracion(75).nivel, "muy-bien");
  assert.equal(valoracion(60).nivel, "aprobado");
  assert.equal(valoracion(45).nivel, "insuficiente");
  assert.equal(valoracion(10).nivel, "repasar");
});

test("resumen por tema ordena de menor a mayor porcentaje", () => {
  const items = [{ tema: "A", estado: "correcta" }, { tema: "A", estado: "incorrecta" }, { tema: "B", estado: "sin_responder" }];
  assert.deepEqual(resumenPorTema(items).map(t => [t.tema, t.porcentaje]), [["B", 0], ["A", 50]]);
});

test("ninguna pregunta usa opciones del tipo «todas/ninguna de las anteriores»", () => {
  for (const p of todas) for (const o of p.opciones) assert.ok(!/(todas|ninguna|cualquiera) de las anteriores/i.test(o), p.id);
});
