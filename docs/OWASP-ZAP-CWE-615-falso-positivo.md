# Falso positivo: OWASP ZAP CWE-615 "Suspicious Comments"

**Estado:** resuelto, no requiere cambios de codigo
**Componente:** `frontend` (Vite 8.0.1, minificador Oxc)
**Fecha:** 2026-09-30

## Resumen

ZAP reporta "Information Disclosure - Suspicious Comments" (CWE-615) sobre el
bundle JavaScript. **El bundle no contiene ni un solo comentario.** El aviso es un
falso positivo provocado por la forma en que ZAP analiza texto sin parsear
JavaScript.

## Evidencia

La superficie desplegada se verifico completa y no tiene comentarios reales:

| Fichero | Comentarios reales | Marcas `@license`/`@preserve` | `sourceMappingURL` |
|---|---|---|---|
| `dist/assets/index-*.js` | 0 | 0 | 0 |
| `dist/assets/index-*.css` | 0 | 0 | 0 |
| `dist/index.html` | 0 | - | 0 |
| `favicon.svg` | 0 | - | - |
| `icons.svg` | 0 | - | - |

No se genera ningun fichero `.map`.

Las coincidencias de `/*` y `//` que existen en el bundle estan **dentro de
literales de cadena y de expresiones regulares**, no son comentarios:

- `/*` (13) -> literales de regex de React Router: `/\\*$/`, `/^\\/*/`
- `//` (45) -> URLs: `https://react.dev/errors/`, `http://www.w3.org/2000/svg`,
  `http://localhost`

## Causa raiz

La regla CWE-615 busca patrones de forma textual, sin parser de JavaScript.
Cuando encuentra `//` asume que empieza un comentario de linea y **lee hasta el
siguiente salto de linea**.

Un bundle minificado tiene pocas lineas y muy largas. En este proyecto:

```
Lineas: 55  |  longitud media: 14736 caracteres
Ocurrencias "//": 45
```

Una URL como `https://react.dev` hace que ZAP lea los ~14 KB siguientes de la
linea como si fueran un comentario, y encuentra keywords sensibles mucho mas
alla.

Simulando exactamente ese comportamiento sobre el bundle:

```
"Comentarios" con patron sensible: 27

  localhost:  16   <- //localhost, del parser de URLs de react-router
  password:    6   <- <input type="password"> + autoComplete="current-password"
  TODO:        2   <- "Todos" en los <option> de filtro, en espanol
  credential:  1
  admin:       1
  debug:       1
```

Dos detalles importantes:

1. Los 16 `localhost` provienen de **react-router**
   (`node_modules/react-router/dist/*/chunk-OB3PAWPO.mjs`), no del codigo de este
   repositorio. No se pueden eliminar sin parchear la dependencia.
2. Los 2 `TODO` no son TODOs: son la palabra espanola "Todos" en los `<option>`
   del filtro de estado.

## Por que borrar los comentarios del codigo no lo soluciona

Medido empiricamente:

| | |
|---|---|
| Lineas de comentario en `frontend/src` (antes) | 49 |
| Comentarios en el bundle resultante | 0 |

El minificador ya elimina los comentarios. Aun asi se borraron las 49, y el
resultado fue:

- bundle: 810,68 kB -> 810,67 kB (0,01 kB, ruido de nombres)
- hallazgos de la simulacion de ZAP: 27 -> 26, casi identicos y por el mismo
  mecanismo
- `@license`/`@preserve`: 0 antes y despues

Los comentarios nunca llegan al bundle, asi que eliminarlos no puede cambiar el
resultado del escaner.

## Remediacion recomendada

Marcar la regla como excepcion en la configuracion del escaneo ZAP, porque el
codigo es correcto. Es la remediacion que recomienda OWASP para un falso positivo.

Para silenciar la alerta, las vias habituales:

- **Alert Filter**: excluir el alert ID de "Suspicious Comments" del informe.
- **Context / Scan Policy**: excluir del escaneo activo la ruta de assets
  minificados.
- Marcar el hallazgo como `False Positive` al registrarlo en el reporte.

## Nota sobre `rolldownOptions.output.comments: false`

La opcion que si eliminaria tambien los comentarios legales (`rolldown` los
preserva por defecto, `@default true`) es
`rolldownOptions.output.comments: false`. No se activo porque el binding nativo de
rolldown en Vite 8.0.1 responde:

```
[PARSE_ERROR] Expected ',' or ')' but found ':'
```

Se descarto tambien acortar las lineas del bundle: no existe ninguna opcion
`maxLineLen` ni `lineWidth` en oxc ni en rolldown.

Dado que el bundle actual no tiene comentarios legales, no hace falta activarla.
Si en el futuro se anaden dependencias con banners `@license`, habria que
actualizar rolldown antes de poder usar esa opcion.

## Comprobacion reproducible

```powershell
# 0 comentarios legales ni source maps en el bundle
Select-String -Path dist\assets\*.js -Pattern '@license|@preserve|sourceMappingURL'

# 0 ficheros .map
Get-ChildItem dist -Recurse -Filter *.map

# 0 comentarios de una linea en el codigo fuente
Get-ChildItem src -Recurse -Include *.js,*.jsx,*.ts,*.tsx |
  Select-String -Pattern '^\s*//'
```

La ultima comprobacion debe devolver unicamente los 4 `eslint-disable-next-line`,
que son comentarios funcionales requeridos por el linter y no se pueden eliminar
sin introducir errores nuevos.
