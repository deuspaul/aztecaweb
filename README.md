# AztecaWeb

Sitio de una página con recorrido ascendente: pirámide → cielo/servicios → galaxias.

- `index.html` + `assets/`: **sitio principal** — fondo **scroll-video** (video Grok Imagine controlado por scroll).
- `version-3-fotogramas/`: **versión guardada** v4 de 3 fotogramas (exacta a la raíz previa a la promoción).
- `revision-video/`: alias histórico; `index.html` redirige a la raíz (assets de la revisión conservados).
- `prototipo-6/`: versión original aprobada, sin cambios.
- `docs/FONDOS.md`, `docs/PROMOCION-SCROLL-VIDEO.md`: origen de fondos y registro de la promoción.

## Ver en local

```
python3 -m http.server 8080
# abrir http://localhost:8080/                         (scroll-video)
#      http://localhost:8080/version-3-fotogramas/     (3 fotogramas)
#      http://localhost:8080/prototipo-6/prototipo-6-dinamico.html
```

Parámetros de demo: `?time=morning|afternoon|sunset|night&weather=clear|cloudy|rain|storm`.

## Pruebas

- `node tests/check.mjs` — versión guardada 3 fotogramas (`version-3-fotogramas/`).
- `node tests/check-revision.mjs` — sitio principal scroll-video (raíz) + redirect de `/revision-video/`.

No sustituyen QA en navegador.

## Hora y clima

- La hora sale del **reloj local del dispositivo**: mañana cálida, tarde dorada, atardecer y noche estrellada jade.
- El clima es una **simulación visual elegida a mano**, marcada como "simulado". No hay proveedor de clima ni geolocalización.

## Estado

- Live público: GitHub Pages (`gh-pages`). Fondo 704×432; seek por scroll con límites de decodificador; clima demo.
- QA visual navegador: coordinar aparte.

## Night video v3

At night the scroll background switches to night v3 (`assets/video/scroll-night.mp4`). Preview: `?time=night`. Details: `docs/NIGHT-VIDEO-V3.md`.
