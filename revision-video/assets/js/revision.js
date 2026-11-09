/* AztecaWeb revisión scroll-video — progreso de subida → currentTime.
   Sin autoplay/loop: el video permanece en pausa; solo se busca por scroll.
   Reduced-motion / fallo: still de fallback, sin descargar ni mover el video. */
(function (root) {
  'use strict';
  const T = root.AztecaThemes;
  const VIDEO_SRC = 'assets/video/scroll.mp4';
  const MIN_SEEK = 1 / 48; // ~medio fotograma a 24 fps

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  /** Progreso de subida: 0 abajo (pirámide) → 1 arriba (galaxias). */
  function progress(scrollY, maxScroll) {
    return maxScroll > 0 ? clamp(1 - scrollY / maxScroll, 0, 1) : 0;
  }
  /** Tiempo de video [0, duration] desde progreso. */
  function timeFromProgress(p, duration) {
    if (!(duration > 0)) return 0;
    return clamp(p, 0, 1) * duration;
  }
  function shouldSeek(current, target, minDelta) {
    const d = minDelta == null ? MIN_SEEK : minDelta;
    return Math.abs(target - current) >= d;
  }

  const api = { clamp, progress, timeFromProgress, shouldSeek, MIN_SEEK, VIDEO_SRC };
  root.AztecaRevision = api;
  if (typeof document === 'undefined') return;

  const state = { mode: 'auto', time: T.timeFromDate(new Date()), weather: 'clear' };
  try {
    const q = new URLSearchParams(location.search);
    const qt = q.get('time'), qw = q.get('weather');
    if (qt && T.TIMES.includes(qt)) { state.time = qt; state.mode = 'manual'; }
    if (qw && T.WEATHERS.includes(qw)) state.weather = qw;
  } catch (e) {}

  const html = document.documentElement;
  const stage = document.getElementById('stage');
  const video = document.getElementById('scroll-video');
  const rvs = Array.from(document.querySelectorAll('.rv'));
  const mql = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mql.matches;
  let ticking = false;
  let videoReady = false;
  let pendingTime = 0;
  let duration = 0;

  function applyTheme() {
    const pal = T.PALETTES[state.time] || T.PALETTES.sunset;
    T.applyCss(pal, T.WEATHER_MOD[state.weather] || {});
    html.dataset.weather = state.weather;
    syncPill();
    schedule();
  }

  let pill, panel, label;
  function buildPill() {
    const wrap = document.createElement('div');
    wrap.id = 'az-theme-wrap';
    wrap.innerHTML =
      '<button type="button" id="az-theme-pill" aria-expanded="false" aria-controls="az-theme-panel"><span id="az-pill-label"></span></button>' +
      '<div id="az-theme-panel" role="group" aria-label="Tema visual" hidden>' +
      '<div class="az-row az-head">Tema visual</div>' +
      '<button type="button" class="az-opt" data-mode="auto">⏱ Automático (hora local de tu dispositivo)</button>' +
      '<div class="az-row">Hora</div><div class="az-grid" id="az-times"></div>' +
      '<div class="az-row">Clima <span class="sim-badge">simulado</span></div><div class="az-grid" id="az-weathers"></div>' +
      '<div class="az-meta">Demo: el clima es una simulación visual elegida a mano. No se consulta ningún servicio ni tu ubicación. Sitio principal: scroll-video.</div>' +
      '</div>';
    document.body.appendChild(wrap);
    const times = wrap.querySelector('#az-times'), weathers = wrap.querySelector('#az-weathers');
    T.TIMES.forEach(id => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'az-chip';
      b.dataset.time = id; b.textContent = T.TIME_ICONS[id] + ' ' + T.TIME_LABELS[id]; times.appendChild(b);
    });
    T.WEATHERS.forEach(id => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'az-chip';
      b.dataset.weather = id; b.textContent = T.WEATHER_ICONS[id] + ' ' + T.WEATHER_LABELS[id]; weathers.appendChild(b);
    });
    pill = wrap.querySelector('#az-theme-pill'); panel = wrap.querySelector('#az-theme-panel'); label = wrap.querySelector('#az-pill-label');
    const close = (focus) => { panel.hidden = true; pill.setAttribute('aria-expanded', 'false'); if (focus) pill.focus(); };
    pill.addEventListener('click', () => {
      const open = panel.hidden; panel.hidden = !open; pill.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('button').focus();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(true); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(false); });
    panel.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode === 'auto') { state.mode = 'auto'; state.time = T.timeFromDate(new Date()); }
      if (b.dataset.time) { state.mode = 'manual'; state.time = b.dataset.time; }
      if (b.dataset.weather) state.weather = b.dataset.weather;
      applyTheme();
    });
  }
  function syncPill() {
    if (!label) return;
    label.textContent = (state.mode === 'auto' ? 'Auto' : 'Manual') + ' · ' +
      T.TIME_ICONS[state.time] + ' ' + T.TIME_LABELS[state.time] + ' · ' +
      T.WEATHER_LABELS[state.weather] + ' (sim.)';
    panel.querySelectorAll('[data-time]').forEach(b => {
      b.classList.toggle('on', b.dataset.time === state.time);
      b.setAttribute('aria-pressed', String(b.dataset.time === state.time));
    });
    panel.querySelectorAll('[data-weather]').forEach(b => {
      b.classList.toggle('on', b.dataset.weather === state.weather);
      b.setAttribute('aria-pressed', String(b.dataset.weather === state.weather));
    });
    const a = panel.querySelector('[data-mode="auto"]');
    a.classList.toggle('on', state.mode === 'auto');
    a.setAttribute('aria-pressed', String(state.mode === 'auto'));
  }

  function applySeek(t) {
    if (!videoReady || reduced || !video) return;
    pendingTime = t;
    if (video.seeking) return;
    if (!shouldSeek(video.currentTime, t)) return;
    try {
      video.pause();
      video.currentTime = t;
    } catch (e) { /* seek puede fallar mid-load */ }
  }

  function onSeeked() {
    if (!videoReady || reduced) return;
    if (shouldSeek(video.currentTime, pendingTime)) {
      try { video.currentTime = pendingTime; } catch (e) {}
    }
  }

  function render() {
    ticking = false;
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    const p = progress(scrollY, max);
    html.style.setProperty('--p', p.toFixed(3));
    const pal = T.PALETTES[state.time] || T.PALETTES.sunset, dark = pal.night || p > 0.35;
    html.style.setProperty('--nav-text-live', dark ? '#ffffff' : pal.navText);
    html.style.setProperty('--nav-halo-live', dark ? '0 1px 8px rgba(0,0,0,.6)' : pal.navHalo);
    rvs.forEach(el => {
      if (reduced) { el.classList.add('in'); return; }
      const r = el.getBoundingClientRect();
      el.classList.toggle('in', r.top < vh * 0.9 && r.bottom > vh * 0.1);
    });
    if (videoReady && !reduced && duration > 0) {
      applySeek(timeFromProgress(p, duration));
    }
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

  function detachVideo() {
    videoReady = false;
    if (!video) return;
    try {
      video.removeAttribute('src');
      video.removeAttribute('srcObject');
      video.load();
    } catch (e) {}
    stage && stage.classList.remove('video-ready');
  }

  function attachVideo() {
    if (!video || reduced) return;
    if (video.getAttribute('src') === VIDEO_SRC && videoReady) { schedule(); return; }
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;
    video.autoplay = false;
    video.preload = 'auto';
    video.setAttribute('src', VIDEO_SRC);
    const onReady = () => {
      duration = video.duration || 0;
      if (!(duration > 0) || !isFinite(duration)) return;
      videoReady = true;
      stage.classList.add('video-ready');
      stage.classList.remove('video-failed');
      try { video.pause(); } catch (e) {}
      schedule();
    };
    const onFail = () => {
      videoReady = false;
      stage.classList.remove('video-ready');
      stage.classList.add('video-failed');
      detachVideo();
    };
    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('error', onFail, { once: true });
    video.addEventListener('seeked', onSeeked);
    try { video.load(); } catch (e) { onFail(); }
  }

  function setReduced(on) {
    reduced = on;
    html.classList.toggle('reduced-motion', on);
    if (on) detachVideo();
    else attachVideo();
    schedule();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  if (mql.addEventListener) mql.addEventListener('change', e => setReduced(e.matches));

  setInterval(() => {
    if (state.mode === 'auto') {
      const t = T.timeFromDate(new Date());
      if (t !== state.time) { state.time = t; applyTheme(); }
    }
  }, 60000);

  buildPill();
  applyTheme();
  setReduced(reduced);
  if (!location.hash) {
    scrollTo(0, 1e6);
    addEventListener('load', () => { if (!location.hash) scrollTo(0, 1e6); schedule(); });
  }
  schedule();
})(typeof window !== 'undefined' ? window : globalThis);
