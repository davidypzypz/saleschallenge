# La Sombra de Mordor — Reto de Ventas

Un challenge gamificado para el equipo de ventas, ambientado en el universo de
El Señor de los Anillos. El equipo avanza junto por un mapa —**The Shire →
el Lago → los Dragones → Mordor**— y cada vendedor se mueve según tres
métricas diarias: **ejercicio**, **avance de lectura** y **avance de meta**.

- Quien va **primero** lleva la 🔑 **Llave** (guía al equipo).
- Quien va **último** carga el 💍 **Anillo** (el equipo lo ayuda a llegar).
- Ambos roles se recalculan solos, todos los días, según el ranking.

El sistema tiene dos piezas:

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **Registro** | Google Sheet donde cada vendedor anota su avance diario | `sheet/Reto-Mordor-Registro.xlsx` (plantilla) |
| **Mapa** | Página web minimalista que dibuja el avance del equipo | `site/` (para publicar en GitHub Pages) |

El mapa **solo se ve** — nadie registra nada ahí. Todo el registro pasa por
el Sheet.

---

## 1. Arma el Google Sheet

1. Sube `sheet/Reto-Mordor-Registro.xlsx` a tu Google Drive y ábrelo (se
   convierte automáticamente a Google Sheets, o puedes usarlo tal cual como
   Excel — las fórmulas son 100% compatibles).
2. Abre la pestaña **Instrucciones** dentro del propio archivo: explica en
   detalle qué llenar y cuándo.
3. En la pestaña **Config**:
   - Escribe el libro, el total de páginas, y las fechas de inicio/fin.
   - Llena la tabla de vendedores: nombre, personaje (elige de la lista:
     Mago, Hobbit, Guerrero, Arquero, Enano, Explorador — **se puede repetir
     personaje** entre varios vendedores) y su meta objetivo individual.
   - Borra las filas de ejemplo (Vendedor 1, 2, 3) cuando tengas tu equipo real.
4. Cada día, cada vendedor agrega una fila en **Registro** con su fecha,
   si hizo ejercicio (Sí/No), sus páginas leídas **acumuladas** y su avance
   de meta **acumulado**.
5. La pestaña **Resumen** se calcula sola: combina las tres métricas en un
   solo % de avance (promedio simple 33/33/33) y asigna Llave/Anillo. No se
   edita a mano.

### Publica el Resumen para que el mapa lo pueda leer

1. En Google Sheets: **Archivo → Compartir → Publicar en la Web**.
2. Elige la hoja **Resumen** y el formato **Valores separados por comas (.csv)**.
3. Copia el link que te da (algo como
   `https://docs.google.com/spreadsheets/d/e/XXXXX/pub?gid=123&single=true&output=csv`).
4. También asegúrate de que el archivo tenga acceso **"Cualquier persona con
   el enlace puede ver"** (Compartir → General access), o el mapa no podrá
   leerlo.

> Alternativa sin "Publicar en la Web": puedes usar en su lugar
> `https://docs.google.com/spreadsheets/d/TU_SHEET_ID/gviz/tq?tqx=out:csv&sheet=Resumen`
> (reemplaza `TU_SHEET_ID` por el ID que aparece en la URL de tu Sheet).
> Funciona igual y solo requiere que el archivo esté compartido como
> "Cualquiera con el enlace puede ver".

---

## 2. Conecta el mapa a tu Sheet

Abre `site/js/config.js` y pega tu link CSV en `csvUrl`:

```js
window.CHALLENGE_CONFIG = {
  csvUrl: "https://docs.google.com/spreadsheets/d/e/XXXXX/pub?gid=123&single=true&output=csv",
  title: "La Sombra de Mordor",
  subtitle: "Reto de ventas — 1 de octubre al 2 de noviembre",
  refreshMs: 5 * 60 * 1000,
  startDate: "2026-10-01",
  endDate: "2026-11-02",
};
```

Mientras `csvUrl` esté vacío, el mapa muestra datos de ejemplo (los mismos
"Vendedor 1/2/3" de la plantilla) para que puedas ver cómo se ve todo antes
de conectar el Sheet real.

---

## 3. Publica el mapa en GitHub Pages

1. En este repositorio: **Settings → Pages**.
2. En "Build and deployment", elige **Deploy from a branch**.
3. Selecciona la rama de este trabajo y la carpeta **`/site`**.
4. Guarda. GitHub te da una URL pública (gratis, sin límite razonable de
   visitas) donde vive el mapa — compártela con el equipo.

Cada vez que el Sheet cambie, el mapa se actualiza solo (revisa cada 5
minutos por defecto; puedes bajar `refreshMs` en `config.js` si lo quieres
más rápido).

---

## Cómo se calcula el avance

Por cada vendedor, `Resumen` calcula:

- **%Ejercicio** = días con ejercicio registrado ÷ días transcurridos del reto
- **%Lectura** = páginas leídas acumuladas ÷ total de páginas del libro
- **%Meta** = avance de meta acumulado ÷ meta objetivo de ese vendedor
- **Avance_Combinado** = promedio simple de las tres (33/33/33), tope 100%

Esa cifra final es la que mueve al personaje sobre el mapa: 0% está en el
Shire, 100% llega a Mordor.

**Llave y Anillo son dinámicos**: se recalculan cada vez que abres el
Sheet, según quién esté de primero y de último en `Avance_Combinado` ese
día.

---

## Personalizar

- **Personajes**: los 6 disponibles (Mago, Hobbit, Guerrero, Arquero, Enano,
  Explorador) están definidos como siluetas SVG en `site/index.html`
  (`<symbol id="char-...">`). Puedes agregar más copiando ese patrón y
  sumando el alias correspondiente en `CHAR_ALIASES` dentro de
  `site/js/app.js`.
- **Colores / escenas del mapa**: cada tramo (Shire, Lago, Dragones, Mordor)
  es un grupo `<g>` independiente dentro del mismo SVG en `index.html` —
  se pueden ajustar colores, montañas, etc. sin tocar la lógica.
- **Peso de las métricas**: si más adelante quieres, por ejemplo, que la
  meta pese más que los hábitos, se ajusta la fórmula de
  `Avance_Combinado` en la pestaña Resumen (hoy es un promedio simple).

---

## Estructura del repositorio

```
sheet/
  Reto-Mordor-Registro.xlsx   ← plantilla del Google Sheet (Config, Registro, Resumen, Instrucciones)
site/
  index.html                  ← el mapa (estructura + SVG del recorrido)
  css/style.css                ← estilos minimalistas
  js/config.js                  ← ⚠️ edita este archivo para conectar tu Sheet
  js/app.js                     ← lógica: lee el CSV, mueve personajes, arma la tabla
```
