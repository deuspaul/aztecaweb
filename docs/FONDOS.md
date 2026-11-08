# Fondos v4

Fuente: video generado con Grok Imagine, https://grok.com/imagine/post/6e8917b5-48f8-49d3-a696-1824488cf697
(h264, 704×432, 24 fps, 361 frames, 15,04 s; sha256 `03d90d6f3403a2c748244ad3004b1197bd0c83f0b332d89edf5a9284a6ab2aca`). El MP4 **no** está en el repo.

| Escena | Uso | t | frame | Archivo |
|---|---|---|---|---|
| 1 | Hero / pirámide | 1,50 s | 36 | `assets/bg/escena1-paisaje-t01.50s.webp` |
| 2 | Cielo / portal (servicios, visión) | 8,50 s | 204 | `assets/bg/escena2-portal-t08.50s.webp` |
| 3 | Galaxias (contacto) | 12,50 s | 300 | `assets/bg/escena3-galaxias-t12.50s.webp` |

Extracción: ffmpeg `select=not(mod(n,12))`, t = n/24 exacto, PNG sin pérdida → WebP q90. Hashes y pesos en `fondos-manifest.json`.
Se descartaron 0–0,5 s porque llevan la interfaz superpuesta.

## Límites
- **Resolución fuente 704×432.** En escritorio grande y en pantallas retina el fondo se ve suave. No se hizo upscale.
- **Sin panorama ni continuidad.** Son 3 fotogramas independientes (la cámara se mueve y la IA hace morphing). Se unen con fundidos cruzados según el scroll; no hay una imagen cosida.
- **Móvil:** `object-fit: cover` con `object-position` (escena 1 al 38 %) recorta los lados en vertical. Es un recorte del navegador, no un encuadre equivalente.
- El parallax es de ≤3 % del alto de la ventana dentro de un sobrante del 4 %. Con reduced-motion se desactiva y los fundidos pasan a cortes discretos.
- El tinte por hora y el filtro de clima simulado son capas CSS; no alteran los archivos.

## Verificación visual: PENDIENTE
El QA en navegador falló con `ERR_CONNECTION_REFUSED` en 127.0.0.1:8090 y localhost. No se ha comprobado el recorte móvil, la legibilidad/contraste sobre las escenas, la intensidad de los tintes ni el rendimiento. No hay capturas del sitio en el repo.
