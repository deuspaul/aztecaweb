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
