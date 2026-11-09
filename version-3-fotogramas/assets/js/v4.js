/* AztecaWeb v4 — estado de tema (hora local del reloj + clima SIMULADO) y fondo de 3 escenas por scroll.
   Sin red: no hay fetch, ni geolocalización, ni proveedor de clima. */
(function (root) {
  'use strict';
  const T = root.AztecaThemes;

  // ---------- funciones puras (probadas en tests/check.mjs) ----------
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  /** Progreso de subida: 0 abajo (hero/pirámide) → 1 arriba (galaxias). */
  function progress(scrollY, maxScroll) { return maxScroll > 0 ? clamp(1 - scrollY / maxScroll, 0, 1) : 0; }
  /** Opacidades de las 3 escenas (escena 1 siempre base opaca). */
  function sceneOpacities(p, reduced) {
    if (reduced) {           // cortes discretos, sin fundidos largos
      return [1, p >= 0.38 ? 1 : 0, p >= 0.72 ? 1 : 0];
    }
    return [1, smooth(0.28, 0.48, p), smooth(0.62, 0.82, p)];
  }
  /** Desplazamiento parallax suave (px) por escena; 0 en reduced. */
  function parallax(p, reduced, vh) {
    if (reduced) return [0, 0, 0];
    const a = (vh || 800) * 0.03;
    return [p * a, (p - 0.5) * a, (p - 1) * a];
  }

  const api = { clamp, smooth, progress, sceneOpacities, parallax };
  root.AztecaV4 = api;
  if (typeof document === 'undefined') return;   // entorno de pruebas Node

  // ---------- estado de tema ----------
  const state = { mode: 'auto', time: T.timeFromDate(new Date()), weather: 'clear' };
  try {
    const q = new URLSearchParams(location.search);
    const qt = q.get('time'), qw = q.get('weather');
    if (qt && T.TIMES.includes(qt)) { state.time = qt; state.mode = 'manual'; }
    if (qw && T.WEATHERS.includes(qw)) state.weather = qw;
  } catch (e) {}

  const html = document.documentElement;
  function applyTheme() {
    const pal = T.PALETTES[state.time] || T.PALETTES.sunset;
    T.applyCss(pal, T.WEATHER_MOD[state.weather] || {});
    html.dataset.weather = state.weather;
    syncPill();
    schedule();
  }

  // ---------- control (pill) ----------
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
      '<div class="az-meta">Demo: el clima es una simulación visual elegida a mano. No se consulta ningún servicio ni tu ubicación.</div>' +
      '</div>';
    document.body.appendChild(wrap);
    const times = wrap.querySelector('#az-times'), weathers = wrap.querySelector('#az-weathers');
    T.TIMES.forEach(id => { const b = document.createElement('button'); b.type = 'button'; b.className = 'az-chip'; b.dataset.time = id; b.textContent = T.TIME_ICONS[id] + ' ' + T.TIME_LABELS[id]; times.appendChild(b); });
    T.WEATHERS.forEach(id => { const b = document.createElement('button'); b.type = 'button'; b.className = 'az-chip'; b.dataset.weather = id; b.textContent = T.WEATHER_ICONS[id] + ' ' + T.WEATHER_LABELS[id]; weathers.appendChild(b); });
    pill = wrap.querySelector('#az-theme-pill'); panel = wrap.querySelector('#az-theme-panel'); label = wrap.querySelector('#az-pill-label');
    const close = (focus) => { panel.hidden = true; pill.setAttribute('aria-expanded', 'false'); if (focus) pill.focus(); };
    pill.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; pill.setAttribute('aria-expanded', String(open)); if (open) panel.querySelector('button').focus(); });
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
    label.textContent = (state.mode === 'auto' ? 'Auto' : 'Manual') + ' · ' + T.TIME_ICONS[state.time] + ' ' + T.TIME_LABELS[state.time] + ' · ' + T.WEATHER_LABELS[state.weather] + ' (sim.)';
    panel.querySelectorAll('[data-time]').forEach(b => { b.classList.toggle('on', b.dataset.time === state.time); b.setAttribute('aria-pressed', String(b.dataset.time === state.time)); });
    panel.querySelectorAll('[data-weather]').forEach(b => { b.classList.toggle('on', b.dataset.weather === state.weather); b.setAttribute('aria-pressed', String(b.dataset.weather === state.weather)); });
    const a = panel.querySelector('[data-mode="auto"]'); a.classList.toggle('on', state.mode === 'auto'); a.setAttribute('aria-pressed', String(state.mode === 'auto'));
  }

  // ---------- fondo por scroll ----------
  const scenes = Array.from(document.querySelectorAll('.scene'));
  const rvs = Array.from(document.querySelectorAll('.rv'));
  const mql = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mql.matches, ticking = false;

  function render() {
    ticking = false;
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    const p = progress(scrollY, max);
    const op = sceneOpacities(p, reduced), px = parallax(p, reduced, vh);
    for (let i = 0; i < scenes.length; i++) {
      scenes[i].style.opacity = op[i].toFixed(3);
      scenes[i].style.transform = reduced ? 'none' : 'translate3d(0,' + px[i].toFixed(1) + 'px,0)';
    }
    html.style.setProperty('--p', p.toFixed(3));
    const pal = T.PALETTES[state.time] || T.PALETTES.sunset, dark = pal.night || p > 0.35;
    html.style.setProperty('--nav-text-live', dark ? '#ffffff' : pal.navText);
    html.style.setProperty('--nav-halo-live', dark ? '0 1px 8px rgba(0,0,0,.6)' : pal.navHalo);
    rvs.forEach(el => { if (reduced) { el.classList.add('in'); return; } const r = el.getBoundingClientRect(); el.classList.toggle('in', r.top < vh * 0.9 && r.bottom > vh * 0.1); });
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  function setReduced(on) { reduced = on; html.classList.toggle('reduced-motion', on); schedule(); }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  if (mql.addEventListener) mql.addEventListener('change', e => setReduced(e.matches));
  setReduced(reduced);

  setInterval(() => { if (state.mode === 'auto') { const t = T.timeFromDate(new Date()); if (t !== state.time) { state.time = t; applyTheme(); } } }, 60000);

  buildPill();
  applyTheme();
  // recorrido ascendente: empezar abajo (pirámide), salvo que haya un #ancla
  if (!location.hash) { scrollTo(0, 1e6); addEventListener('load', () => { if (!location.hash) scrollTo(0, 1e6); schedule(); }); }
  schedule();
})(typeof window !== 'undefined' ? window : globalThis);
