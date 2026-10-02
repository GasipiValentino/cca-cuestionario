// Persistencia local (localStorage) del progreso, los intentos y las preguntas falladas.

const CLAVE = "cca-simulador-v1";

function estadoInicial() {
  return {
    version: 1,
    sesiones: {},      // clave -> sesión en curso ("ev-3", "practica")
    intentos: [],      // resultados finalizados (evaluaciones y prácticas)
    falladas: {},      // id -> { evalId, veces, ultima }  preguntas pendientes de dominar
    ajustes: { notaPrincipal: "penalizada" },
  };
}

let estado = leer();
let disponible = true;

function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return estadoInicial();
    return { ...estadoInicial(), ...JSON.parse(crudo) };
  } catch {
    disponible = false;
    return estadoInicial();
  }
}

function persistir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
    disponible = true;
  } catch {
    disponible = false;
  }
}

export const almacen = {
  get estado() { return estado; },
  get disponible() { return disponible; },

  // --- sesiones en curso ---
  sesion(clave) { return estado.sesiones[clave] || null; },
  guardarSesion(sesion) { estado.sesiones[sesion.clave] = sesion; persistir(); },
  borrarSesion(clave) { delete estado.sesiones[clave]; persistir(); },

  // --- intentos ---
  intentosDe(evalId) {
    return estado.intentos.filter(i => i.tipo === "evaluacion" && i.evalId === evalId)
      .sort((a, b) => a.fecha - b.fecha);
  },
  intento(id) { return estado.intentos.find(i => i.id === id) || null; },
  registrarIntento(intento) {
    estado.intentos.push(intento);
    for (const it of intento.items) {
      if (it.estado === "correcta") {
        delete estado.falladas[it.id];
      } else {
        const previo = estado.falladas[it.id];
        estado.falladas[it.id] = { evalId: it.evalId, veces: (previo?.veces || 0) + 1, ultima: intento.fecha };
      }
    }
    persistir();
  },

  // --- falladas ---
  falladas() { return estado.falladas; },

  // --- ajustes ---
  ajuste(nombre) { return estado.ajustes[nombre]; },
  fijarAjuste(nombre, valor) { estado.ajustes[nombre] = valor; persistir(); },

  reiniciar() { estado = estadoInicial(); persistir(); },
};
