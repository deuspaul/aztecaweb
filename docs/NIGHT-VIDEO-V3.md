# Night video v3 (scroll)

When theme time is **night**, the scroll-driven background uses `assets/video/scroll-night.mp4`
(re-encode seek-friendly of source `aztecaweb-night-v3.mp4`, visual as-is: no crop/color/trim).

## Source (do not modify)
- Path (workspace): `/workspace/aztecaweb/night-video/aztecaweb-night-v3.mp4`
- sha256: `24b22197454da6fbdca32d08bb1d46817cf59ea3edef5d22b8864767ab6a0a36`
- H.264 704×432 24 fps 12.5 s 300 frames, no audio

## Published encode
- `assets/video/scroll-night.mp4` — GOP 12, no B-frames, faststart, no audio, no upscale
- Fallback still: `assets/bg/fallback-night.webp` from **t = 1.50 s** of v3 (pyramid start; same relative point as day fallback)

## Preview night
Existing query hook: **`?time=night`** (sets manual night). Example:
`https://deuspaul.github.io/aztecaweb/?time=night`

Day bands (morning/afternoon/sunset) keep `assets/video/scroll.mp4`.
