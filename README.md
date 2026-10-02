# Simulador de evaluaciones — Computación Científica Actuarial

Plataforma web para estudiar con **500 preguntas de opción múltiple** elaboradas a partir del material de la materia (Cátedra Del Rosso), organizadas en **13 evaluaciones** (12 de 40 preguntas y una de 20), con corrección automática, revisión detallada de errores y seguimiento del progreso.

## Cómo ejecutarlo

Requisito: **Python 3** (ya instalado en esta PC). No hace falta instalar ninguna dependencia.

```bash
cd simulador
python servidor.py
```

Se abre el navegador en `http://localhost:8000`. Para usar otro puerto: `python servidor.py 8080`.

> Alternativa equivalente: `python -m http.server 8000` dentro de la carpeta `simulador`.
> **No** abras `index.html` con doble clic: los navegadores bloquean la lectura de los archivos JSON desde `file://`.

**Compartir en la misma red Wi-Fi:** `python servidor.py --red` muestra una dirección del tipo `http://192.168.x.x:8000` que se puede abrir desde otro celular o computadora conectado a la misma red, mientras el servidor esté corriendo.

El progreso se guarda en el navegador (`localStorage`), por lo que se conserva al recargar o cerrar la página. Es propio de cada navegador y de cada dirección (`localhost:8000` y `localhost:8080` guardan progresos distintos).

## Funcionalidades

- **Panel principal**: las 13 evaluaciones con su estado (no iniciada / en curso / completada), última nota, cantidad de intentos y evolución; promedio de las últimas notas, respuestas correctas acumuladas, porcentaje global de aciertos y acceso a las preguntas falladas.
- **Configuración de cada intento**: modo **práctica** (sin límite de tiempo) o **examen** (cronómetro visible y límite opcional, con entrega automática al terminar el tiempo); orden aleatorio de preguntas y de opciones.
- **Resolución**: una pregunta por pantalla, «Pregunta 12 de 40», barra de progreso, grilla de navegación (respondidas, pendientes, actual, marcadas para revisar), avanzar y retroceder, cambiar o borrar la respuesta, y botón **Finalizar** siempre visible. Atajos: `A`–`D` o `1`–`4` para responder, `←` y `→` para navegar.
- **Entrega**: confirmación con la cantidad de respondidas y pendientes, y acceso directo a cada pendiente.
- **Resultados**: correctas, incorrectas y sin responder (por separado), porcentaje de aciertos, **nota con penalización** y **nota proporcional** (ambas sobre 10), tiempo empleado, valoración descriptiva y aciertos por tema.
- **Revisión de respuestas**: filtros *Incorrectas / Sin responder / Correctas / Todas* (por defecto muestra primero los errores). En cada pregunta se ve el enunciado, tu respuesta (en rojo, con ✗), la correcta (en verde, con ✓), por qué la correcta lo es, por qué tu opción no lo es, por qué fallan las demás y la referencia al material.
- **Reintentar incorrectas**: arma una práctica solo con las incorrectas y sin responder de ese intento.
- **Banco de falladas**: acumula lo que respondiste mal o dejaste en blanco en cualquier intento. Se puede practicar todo, por tema o por evaluación, y cada pregunta sale de la lista cuando la respondés bien.
- **Historial** por evaluación, con la variación de nota respecto del intento anterior.
- Diseño adaptable a celular, tablet y computadora, con modo claro y oscuro según el sistema.

### Escalas de calificación

| Escala | Cálculo | Ejemplo: 30 correctas, 6 incorrectas, 4 sin responder (de 40) |
|---|---|---|
| Proporcional | correctas / total × 10 | 7,50 |
| Con penalización (como el 1er parcial 1C 2026) | (correctas − 0,5 × incorrectas) / total × 10, mínimo 0. Las sin responder no suman ni restan | 6,75 |

En el pie del panel elegís cuál es la **nota principal**, que se usa en las tarjetas, el promedio y el historial. La pantalla de resultados siempre muestra las dos. Para aprobar el parcial hace falta el 60 % del puntaje.

## Estructura del proyecto

```
simulador/
├── index.html                  # punto de entrada
├── servidor.py                 # servidor local sin caché
├── css/styles.css              # estilos (modo claro y oscuro, responsive)
├── js/
│   ├── main.js                 # rutas y montaje de vistas
│   ├── router.js               # enrutador por hash (#/…)
│   ├── evaluacion.js           # lógica pura: sesiones, corrección, notas
│   ├── sesiones.js             # une lógica, datos y almacenamiento
│   ├── almacen.js              # persistencia en localStorage
│   ├── datos.js                # carga de data/*.json
│   ├── ui.js                   # utilidades de interfaz
│   └── vistas/                 # inicio, configurar, examen, resultados, falladas
├── banco/                      # FUENTE editable: preguntas por tema (11 archivos)
├── data/                       # GENERADO: manifest.json + ev01.json … ev13.json
├── tools/
│   ├── construir_evaluaciones.py   # banco/ → data/
│   └── validar.py                  # controles de calidad del banco y de las evaluaciones
└── tests/evaluacion.test.mjs   # pruebas automáticas de la lógica (Node)
```

### Formato de una pregunta (`banco/*.json`)

```json
{
  "id": "SQL-07",
  "tema": "SQL",
  "subtema": "WHERE y HAVING",
  "dificultad": "dificil",
  "tipo": "diferencia",
  "enunciado": "…",
  "codigo": "SELECT … (opcional)",
  "opciones": ["…", "…", "…", "…"],
  "correcta": 1,
  "explicacion": "Por qué la correcta es correcta.",
  "por_que_no": ["Por qué A no…", "", "Por qué C no…", "Por qué D no…"],
  "referencia": "Clase / apuntes / parcial y apartado"
}
```

`correcta` es el índice (0–3) dentro de `opciones`. `por_que_no` va alineado con `opciones` y queda vacío en la posición correcta. Valores posibles: `dificultad` = facil | media | dificil; `tipo` = concepto | comprension | diferencia | aplicacion | caso | error | examen | codigo.

### Editar o agregar preguntas

1. Editá el archivo correspondiente en `banco/`.
2. `python tools/validar.py` controla formato, 4 opciones, una sola correcta, explicaciones completas, IDs y enunciados únicos.
3. `python tools/construir_evaluaciones.py` regenera `data/`. Hacen falta exactamente 500 preguntas; si cambiás la cantidad, ajustá `TAMANIOS` en ese script.
4. `node --test tests/` corre las pruebas automáticas (opcional, requiere Node 18 o superior).

El constructor reparte cada combinación de tema y dificultad de forma pareja entre las 13 evaluaciones, ordena cada evaluación de fácil a avanzada y mezcla de forma determinística la posición de la respuesta correcta.

> Si cambiás preguntas ya rendidas, los intentos guardados que las referencian siguen funcionando: las preguntas eliminadas se ignoran al corregir.

## Contenido del banco

| Tema | Fuente principal | Preguntas |
|---|---|---|
| Pensamiento computacional | Clase 1 (dos versiones) y Wing (2006) | 45 |
| Excel | Apuntes C2 y 1er parcial 1C 2026 | 26 |
| Bases de datos y modelo relacional | Introducción a bases de datos, apuntes C3, Clase 12 | 34 |
| SQL: consultas | SQL Básico, apuntes C4, guía de ejercicios SQL, parciales | 54 |
| SQL: joins, DML y DDL | Joins, DML & DDL (cátedra), Clase 5, apuntes C5 | 45 |
| Python y NumPy básicos | Guía práctica Python, parciales | 45 |
| Estructuras de control | Clase 10 y guía práctica de estructuras de control | 59 |
| Algoritmos y simulación actuarial | Clase 10, guías, Clase 1 | 51 |
| Estructuras de datos, pandas y almacenamiento | Clase 12, guía práctica Python | 48 |
| Calidad y limpieza de datos | Clase 13 | 47 |
| Análisis exploratorio de datos | Clase 14, guía práctica Python | 46 |
| **Total** | | **500** |

Dificultad: 132 fáciles, 265 intermedias y 103 avanzadas. Tipos: definiciones, comprensión, diferencias entre conceptos, aplicación, casos, «qué imprime este código», detección de errores y preguntas al estilo del parcial.

### Observaciones sobre el material

- **Apuntes de Excel (C2)**: indican `=EXTRAE(B3;5;8)` para obtener el año de «SAL-2024-00001-M», pero eso devuelve «2024-000». La fórmula correcta es `=EXTRAE(B3;5;4)`. La pregunta EXC-03 lo explica.
- **Resolución publicada del 1er parcial 1C 2025**: tiene errores. En 1a usa `INNER JOIN` con asesores cuando el enunciado pide clientes «tengan o no asesor» (corresponde `LEFT JOIN`) y escribe el literal `100.000`, que en SQL vale 100. En 1c, un `WHERE` sobre la tabla derecha anula el `LEFT JOIN`. Esas soluciones no se tomaron como correctas: se usaron para preguntas de detección de errores (SQL-27, JOIN-14, JOIN-41).
- **Connolly y Begg**: el parcial 2026 los cita, pero no hay texto de esa fuente entre los archivos. La pregunta sobre funciones del DBMS se basa en el propio parcial y en la Clase 12.
- **`axis=0` en NumPy**: solo figura en el parcial 2026 (sin apunte propio). La pregunta PYB-34 lo explica con un ejemplo verificado.
- **DER** (diagrama entidad-relación): los apuntes dicen «pegar foto» y la imagen no está, así que solo se pregunta qué es.
- Los dos PDF de la Clase 10 son idénticos.
- La guía SQL usa T-SQL (`TOP`) y los apuntes usan `LIMIT`; las preguntas aclaran el dialecto cuando importa.

## Validación realizada

- `tools/validar.py`: 500 preguntas, 13 evaluaciones (12 × 40 + 20), 4 opciones distintas cada una, una correcta, explicación y «por qué no» para cada distractor, referencia, IDs y enunciados únicos, ninguna pregunta repetida entre evaluaciones.
- `tests/evaluacion.test.mjs` (12 pruebas): notas (incluido el ejemplo 30/40 → 75 % → 7,5), penalización, sin responder contadas aparte, y que **mezclar las opciones no altera la corrección** en las 13 evaluaciones con 50 órdenes distintos cada una.
- Las respuestas de las preguntas con código o cálculos se verificaron ejecutándolas en Python.
- Prueba de punta a punta en el navegador (escritorio y celular): configurar, responder con preguntas y opciones mezcladas, guardar y recargar, continuar, entregar (35 correctas, 3 incorrectas y 2 sin responder dieron 8,75 y 8,38), revisión con filtros, reintento de incorrectas, banco de falladas y entrega automática por tiempo.
