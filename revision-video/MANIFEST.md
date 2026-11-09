# Revisión scroll-video (no live)

Fuente original preservada fuera del repo: `grok-imagine-original.mp4`
sha256 `03d90d6f3403a2c748244ad3004b1197bd0c83f0b332d89edf5a9284a6ab2aca` (704×432, 24 fps, 15,0417 s).

## Corte
- Inicio **1,50 s** (tras UI ~primer segundo; still live ya validado limpio).
- Fin **14,00 s** (antes del fundido a negro; media luma ~25, no negro).
- Ventana útil codificada: **12,50 s** / 300 fotogramas → `assets/video/scroll.mp4`.

## Codificación (seek-friendly)
- H.264 yuv420p, 704×432 (sin upscale), 24 fps, **sin audio**.
- GOP fijo 12 (~0,5 s), sin B-frames, `faststart`.
- Original tenía solo 2 I-frames (0 s y 10,42 s): insuficiente para scrub.

## Límites (no afirmar fluidez)
- Seek por `currentTime` depende del decodificador; saltos rápidos de scroll pueden atrasarse o mostrar frame GOP previo.
- Coste de transferencia ≈ tamaño de `scroll.mp4` (medido en tests).
- Cámara / paralaje / morphing de IA: **no** es panorama cosido.
- Reduced-motion: no se asigna `src` al video; solo still `fallback.webp` (t=1,50 s).
