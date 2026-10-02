"""Valida el banco de preguntas (banco/*.json) y, si existen, las evaluaciones (data/ev*.json).

Uso:  python tools/validar.py
Sale con código 1 si encuentra errores.
"""
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BANCO = RAIZ / "banco"
DATA = RAIZ / "data"

TEMAS = {"PC", "EXC", "BD", "SQL", "JOIN", "PYB", "CTL", "ALG", "EST", "CAL", "EDA"}
DIFICULTADES = {"facil", "media", "dificil"}
TIPOS = {"concepto", "comprension", "diferencia", "aplicacion", "caso", "error", "examen", "codigo"}
CAMPOS = ["id", "tema", "subtema", "dificultad", "tipo", "enunciado", "opciones",
          "correcta", "explicacion", "por_que_no", "referencia"]


def normalizar(texto):
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", texto).strip()


def validar_pregunta(p, origen, errores):
    pid = p.get("id", "?")
    for campo in CAMPOS:
        if campo not in p:
            errores.append(f"{origen} {pid}: falta el campo '{campo}'")
    if p.get("tema") not in TEMAS:
        errores.append(f"{origen} {pid}: tema inválido {p.get('tema')!r}")
    if p.get("dificultad") not in DIFICULTADES:
        errores.append(f"{origen} {pid}: dificultad inválida {p.get('dificultad')!r}")
    if p.get("tipo") not in TIPOS:
        errores.append(f"{origen} {pid}: tipo inválido {p.get('tipo')!r}")
    opciones = p.get("opciones", [])
    if len(opciones) != 4:
        errores.append(f"{origen} {pid}: tiene {len(opciones)} opciones (deben ser 4)")
    if any(not str(o).strip() for o in opciones):
        errores.append(f"{origen} {pid}: hay una opción vacía")
    if len({str(o).strip() for o in opciones}) != len(opciones):
        errores.append(f"{origen} {pid}: hay opciones repetidas")
    correcta = p.get("correcta")
    if not isinstance(correcta, int) or not 0 <= correcta < 4:
        errores.append(f"{origen} {pid}: 'correcta' debe ser un entero entre 0 y 3")
        return
    pqn = p.get("por_que_no", [])
    if len(pqn) != 4:
        errores.append(f"{origen} {pid}: 'por_que_no' tiene {len(pqn)} elementos (deben ser 4)")
    else:
        if pqn[correcta].strip():
            errores.append(f"{origen} {pid}: 'por_que_no' de la opción correcta debe estar vacío")
        faltan = [i for i in range(4) if i != correcta and not pqn[i].strip()]
        if faltan:
            errores.append(f"{origen} {pid}: falta explicar por qué no son correctas las opciones {faltan}")
    if len(p.get("explicacion", "").strip()) < 30:
        errores.append(f"{origen} {pid}: explicación demasiado corta")
    if not p.get("referencia", "").strip():
        errores.append(f"{origen} {pid}: falta la referencia al material")
    for o in opciones:
        if re.search(r"(todas|ninguna) las anteriores|cualquiera de las anteriores", normalizar(str(o))):
            errores.append(f"{origen} {pid}: evitar opciones del tipo 'todas/ninguna de las anteriores' (rompen al mezclar)")


def main():
    errores, avisos = [], []
    preguntas = []
    for archivo in sorted(BANCO.glob("*.json")):
        try:
            lote = json.loads(archivo.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errores.append(f"{archivo.name}: JSON inválido ({e})")
            continue
        for p in lote:
            validar_pregunta(p, archivo.name, errores)
            preguntas.append(p)

    ids = Counter(p.get("id") for p in preguntas)
    for pid, n in ids.items():
        if n > 1:
            errores.append(f"id duplicado: {pid} ({n} veces)")

    enunciados = defaultdict(list)
    for p in preguntas:
        clave = normalizar(p.get("enunciado", "") + " " + p.get("codigo", ""))
        enunciados[clave].append(p.get("id"))
    for ids_rep in enunciados.values():
        if len(ids_rep) > 1:
            errores.append(f"enunciado duplicado en: {', '.join(ids_rep)}")

    print(f"Banco: {len(preguntas)} preguntas")
    print("  Por tema:       ", dict(sorted(Counter(p.get('tema') for p in preguntas).items())))
    print("  Por dificultad: ", dict(Counter(p.get('dificultad') for p in preguntas)))
    print("  Por tipo:       ", dict(Counter(p.get('tipo') for p in preguntas)))
    print("  Posición de la correcta:", dict(sorted(Counter(p.get('correcta') for p in preguntas).items())))

    manifiesto = DATA / "manifest.json"
    if manifiesto.exists():
        man = json.loads(manifiesto.read_text(encoding="utf-8"))
        total = 0
        vistos = Counter()
        for ev in man["evaluaciones"]:
            datos = json.loads((DATA / ev["archivo"]).read_text(encoding="utf-8"))
            qs = datos["preguntas"]
            if len(qs) != ev["cantidad"]:
                errores.append(f"{ev['archivo']}: declara {ev['cantidad']} preguntas y tiene {len(qs)}")
            for q in qs:
                validar_pregunta(q, ev["archivo"], errores)
                vistos[q["id"]] += 1
            total += len(qs)
        for pid, n in vistos.items():
            if n > 1:
                errores.append(f"la pregunta {pid} aparece en {n} evaluaciones")
        faltantes = set(ids) - set(vistos)
        if faltantes:
            avisos.append(f"{len(faltantes)} preguntas del banco no están en ninguna evaluación")
        print(f"Evaluaciones: {len(man['evaluaciones'])} con {total} preguntas en total")

    for a in avisos:
        print("AVISO:", a)
    if errores:
        print(f"\n{len(errores)} ERRORES:")
        for e in errores:
            print("  -", e)
        sys.exit(1)
    print("\nOK: sin errores.")


if __name__ == "__main__":
    main()
