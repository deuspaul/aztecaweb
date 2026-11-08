# AztecaWeb

Sitio de una página con recorrido ascendente: pirámide → cielo/servicios → galaxias.

- `index.html`: **v4**, integración del fondo real de 3 escenas sobre el diseño aprobado del prototipo 6.
- `prototipo-6/`: versión original aprobada, sin cambios (`prototipo-6-dinamico.html`, ya con la corrección de contraste de enlaces), la versión previa a esa corrección, su diff y las fuentes v3.
- `docs/FONDOS.md`: origen, timestamps, hashes y límites de los fondos.

## Ver en local

```
python3 -m http.server 8080
# abrir http://localhost:8080/            (v4)
#      http://localhost:8080/prototipo-6/prototipo-6-dinamico.html
```

Parámetros de demo: `?time=morning|afternoon|sunset|night&weather=clear|cloudy|rain|storm`.

## Pruebas

`node tests/check.mjs`: lógica pura (franjas horarias, fundidos, reduced-motion, parallax), referencias, hashes de assets y ausencia de red. No sustituye QA en navegador.

## Hora y clima

- La hora sale del **reloj local del dispositivo**: mañana cálida, tarde dorada, atardecer y noche estrellada jade.
- El clima de v4 es una **simulación visual elegida a mano**, marcada como "simulado". No hay proveedor de clima ni geolocalización (el prototipo 6 original sí consultaba Open-Meteo; v4 lo quitó a la espera de autorización).

## Estado de verificación (8 nov 2026)

- **Hecho:** `node tests/check.mjs` (13/13), `node --check`, búsqueda de secretos, HTTP 200 por curl en el servidor local.
- **QA visual PENDIENTE:** el navegador de QA no pudo conectar con el servidor de vista previa (`ERR_CONNECTION_REFUSED` en 127.0.0.1:8090 y localhost). No se ha probado ningún ancho ni estado en un navegador, y no hay capturas del sitio.
  Pendiente: responsive escritorio/móvil, contraste real sobre cada escena y hora, fluidez y rendimiento del scroll, reduced-motion y foco con teclado.
- Recordatorio: el fondo es de 704×432 (sin upscale) y el clima es una demo simulada.
