"""Construye las 13 evaluaciones (data/ev01.json ... data/ev13.json) a partir del banco.

- Reparte cada combinación (tema, dificultad) de forma pareja entre todas las evaluaciones
  (muestreo sistemático), para que ningún tema quede concentrado en una sola evaluación.
- Dentro de cada evaluación ordena por dificultad (fácil → media → difícil).
- Mezcla de forma determinística el orden almacenado de las opciones para que la respuesta
  correcta no quede siempre en la misma letra (la app puede volver a mezclarlas al rendir).

Uso:  python tools/construir_evaluaciones.py
"""
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BANCO = RAIZ / "banco"
DATA = RAIZ / "data"
SEMILLA = 2026
TAMANIOS = [40] * 12 + [20]

TEMAS = {
    "PC": "Pensamiento computacional",
    "EXC": "Excel",
    "BD": "Bases de datos y modelo relacional",
    "SQL": "SQL: consultas",
    "JOIN": "SQL: joins, DML y DDL",
    "PYB": "Python y NumPy básicos",
    "CTL": "Estructuras de control",
    "ALG": "Algoritmos y simulación actuarial",
    "EST": "Estructuras de datos, pandas y almacenamiento",
    "CAL": "Calidad y limpieza de datos",
    "EDA": "Análisis exploratorio de datos",
}
ORDEN_DIF = {"facil": 0, "media": 1, "dificil": 2}


def mezclar_opciones(p):
    rng = random.Random(f"{SEMILLA}-{p['id']}")
    orden = list(range(4))
    rng.shuffle(orden)
    q = dict(p)
    q["opciones"] = [p["opciones"][i] for i in orden]
    q["por_que_no"] = [p["por_que_no"][i] for i in orden]
    q["correcta"] = orden.index(p["correcta"])
    return q


def main():
    preguntas = []
    for archivo in sorted(BANCO.glob("*.json")):
        preguntas.extend(json.loads(archivo.read_text(encoding="utf-8")))
    total = sum(TAMANIOS)
    if len(preguntas) != total:
        raise SystemExit(f"El banco tiene {len(preguntas)} preguntas y se esperaban {total}.")

    rng = random.Random(SEMILLA)
    celdas = defaultdict(list)
    for p in preguntas:
        celdas[(p["tema"], p["dificultad"])].append(p)

    # Posición fraccionaria de cada pregunta dentro de su celda (tema, dificultad).
    con_pos = []
    for clave in sorted(celdas):
        grupo = celdas[clave]
        rng.shuffle(grupo)
        n = len(grupo)
        for k, p in enumerate(grupo):
            con_pos.append(((k + 0.5) / n + rng.random() * 1e-6, p))
    con_pos.sort(key=lambda t: t[0])
    ordenadas = [p for _, p in con_pos]

    DATA.mkdir(exist_ok=True)
    for viejo in DATA.glob("ev*.json"):
        viejo.unlink()

    manifest = {"titulo": "Computación Científica Actuarial — Simulador de evaluaciones",
                "temas": TEMAS, "evaluaciones": []}
    inicio = 0
    for num, tam in enumerate(TAMANIOS, start=1):
        bloque = ordenadas[inicio:inicio + tam]
        inicio += tam
        rng_ev = random.Random(SEMILLA * 100 + num)
        rng_ev.shuffle(bloque)
        bloque.sort(key=lambda p: ORDEN_DIF[p["dificultad"]])
        bloque = [mezclar_opciones(p) for p in bloque]
        archivo = f"ev{num:02d}.json"
        titulo = f"Evaluación {num}" + (" — Repaso integrador" if num == len(TAMANIOS) else "")
        (DATA / archivo).write_text(
            json.dumps({"id": num, "titulo": titulo, "preguntas": bloque}, ensure_ascii=False, indent=1),
            encoding="utf-8")
        manifest["evaluaciones"].append({
            "id": num,
            "titulo": titulo,
            "archivo": archivo,
            "cantidad": len(bloque),
            "temas": dict(Counter(p["tema"] for p in bloque)),
            "dificultad": dict(Counter(p["dificultad"] for p in bloque)),
        })
        print(f"{archivo}: {len(bloque)} preguntas | temas {dict(sorted(Counter(p['tema'] for p in bloque).items()))} "
              f"| dif {dict(Counter(p['dificultad'] for p in bloque))}")

    (DATA / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print("manifest.json generado.")


if __name__ == "__main__":
    main()
