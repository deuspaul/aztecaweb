/* AztecaWeb v3 — local clock, Open-Meteo, control pill, URL/API overrides */
(function (root) {
  'use strict';
  const T = root.AztecaThemes;

  const TZ_MAP = {
    'America/Mexico_City': { name: 'Guadalajara', lat: 20.67, lon: -103.35 },
    'America/Monterrey': { name: 'Monterrey', lat: 25.67, lon: -100.31 },
    'America/Mazatlan': { name: 'Mazatlán', lat: 23.25, lon: -106.41 },
    'America/Tijuana': { name: 'Tijuana', lat: 32.51, lon: -117.04 },
    'America/Cancun': { name: 'Tulum', lat: 20.21, lon: -87.46 },
    'America/Merida': { name: 'Mérida', lat: 20.97, lon: -89.62 },
    'America/Bahia_Banderas': { name: 'Puerto Vallarta', lat: 20.65, lon: -105.23 },
    'America/Chihuahua': { name: 'Chihuahua', lat: 28.63, lon: -106.07 },
    'America/Hermosillo': { name: 'Hermosillo', lat: 29.07, lon: -110.96 },
    'America/New_York': { name: 'Nueva York', lat: 40.71, lon: -74.01 },
    'America/Chicago': { name: 'Chicago', lat: 41.88, lon: -87.63 },
    'America/Denver': { name: 'Denver', lat: 39.74, lon: -104.99 },
    'America/Los_Angeles': { name: 'Los Ángeles', lat: 34.05, lon: -118.24 },
    'America/Phoenix': { name: 'Phoenix', lat: 33.45, lon: -112.07 },
    'America/Bogota': { name: 'Bogotá', lat: 4.71, lon: -74.07 },
    'America/Lima': { name: 'Lima', lat: -12.05, lon: -77.04 },
    'America/Santiago': { name: 'Santiago', lat: -33.45, lon: -70.67 },
    'America/Buenos_Aires': { name: 'Buenos Aires', lat: -34.60, lon: -58.38 },
    'America/Argentina/Buenos_Aires': { name: 'Buenos Aires', lat: -34.60, lon: -58.38 },
    'America/Sao_Paulo': { name: 'São Paulo', lat: -23.55, lon: -46.63 },
    'Europe/Madrid': { name: 'Madrid', lat: 40.42, lon: -3.70 },
    'Europe/London': { name: 'Londres', lat: 51.51, lon: -0.13 },
    'Europe/Paris': { name: 'París', lat: 48.86, lon: 2.35 },
    'Europe/Berlin': { name: 'Berlín', lat: 52.52, lon: 13.41 },
    'UTC': { name: 'Tulum', lat: 20.21, lon: -87.46 }
  };
  const FALLBACK = { name: 'Tulum', lat: 20.21, lon: -87.46 };
  const CACHE_KEY = 'aztecaweb_wx_v3';
  const CACHE_TTL = 25 * 60 * 1000;
  const WX_TIMEOUT = 2500;

  // ---- state (synchronous initial clock — no FOUC) ----
  const state = {
    mode: 'auto',          // 'auto' | 'manual'
    time: T.timeFromDate(new Date()),
    weather: 'clear',
    windKmh: 12,
    place: FALLBACK.name,
    lat: FALLBACK.lat,
    lon: FALLBACK.lon,
    source: 'clock',
    loading: false,
    lastError: null
  };

  // Resolve place from timezone immediately
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const hit = TZ_MAP[tz] || FALLBACK;
    state.place = hit.name;
    state.lat = hit.lat;
    state.lon = hit.lon;
    state.tz = tz;
  } catch (e) {
    state.tz = 'UTC';
  }

  const listeners = [];
  function emit() { listeners.forEach(fn => { try { fn(getSnapshot()); } catch (e) {} }); }
  function onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  function getSnapshot() {
    return {
      mode: state.mode,
      time: state.time,
      weather: state.weather,
      windKmh: state.windKmh,
      windFactor: T.windFactor(state.windKmh),
      place: state.place,
      lat: state.lat,
      lon: state.lon,
      source: state.source,
      loading: state.loading,
      lastError: state.lastError
    };
  }

  function mapWmo(code, cloudCover) {
    const c = code | 0;
    if (c === 0) return 'clear';
    if (c === 1) return (cloudCover >= 60) ? 'cloudy' : 'clear';
    if (c === 2 || c === 3 || c === 45 || c === 48) return 'cloudy';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
    if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'cloudy';
    if (c === 95 || c === 96 || c === 99) return 'storm';
    if (cloudCover >= 70) return 'cloudy';
    return 'clear';
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.ts || Date.now() - o.ts > CACHE_TTL) return null;
      return o;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.assign({ ts: Date.now() }, data))); } catch (e) {}
  }

  async function fetchWeather(lat, lon) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), WX_TIMEOUT);
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
        '&longitude=' + lon + '&current=weather_code,cloud_cover,wind_speed_10m';
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const cur = j.current || {};
      const weather = mapWmo(cur.weather_code, cur.cloud_cover);
      const windKmh = typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 12;
      return { weather, windKmh, code: cur.weather_code, cloud: cur.cloud_cover };
    } finally {
      clearTimeout(to);
    }
  }

  async function refreshAuto() {
    if (state.mode !== 'auto') return;
    // apply clock immediately
    state.time = T.timeFromDate(new Date());
    const cached = readCache();
    if (cached && Math.abs(cached.lat - state.lat) < 0.05 && Math.abs(cached.lon - state.lon) < 0.05) {
      state.weather = cached.weather || 'clear';
      state.windKmh = cached.windKmh || 12;
      state.source = 'cache';
      emit();
      return;
    }
    state.loading = true;
    emit();
    try {
      const wx = await fetchWeather(state.lat, state.lon);
      if (state.mode !== 'auto') return;
      state.weather = wx.weather;
      state.windKmh = wx.windKmh;
      state.source = 'open-meteo';
      state.lastError = null;
      writeCache({ lat: state.lat, lon: state.lon, weather: wx.weather, windKmh: wx.windKmh, place: state.place });
    } catch (e) {
      state.lastError = String(e && e.message || e);
      // keep clear + gentle breeze offline fallback
      if (state.source === 'clock') {
        state.weather = 'clear';
        state.windKmh = 12;
      }
      state.source = 'fallback';
    } finally {
      state.loading = false;
      emit();
    }
  }

  function setManual(opts) {
    state.mode = 'manual';
    if (opts.time && T.TIMES.indexOf(opts.time) >= 0) state.time = opts.time;
    if (opts.weather && T.WEATHERS.indexOf(opts.weather) >= 0) state.weather = opts.weather;
    if (typeof opts.windKmh === 'number') state.windKmh = opts.windKmh;
    state.source = 'manual';
    emit();
  }

  function setAuto() {
    state.mode = 'auto';
    state.time = T.timeFromDate(new Date());
    state.source = 'clock';
    emit();
    refreshAuto();
  }

  function setAztecaTheme(opts) {
    opts = opts || {};
    if (opts.mode === 'auto') { setAuto(); return getSnapshot(); }
    const o = {};
    if (opts.time) o.time = String(opts.time).toLowerCase();
    if (opts.weather) o.weather = String(opts.weather).toLowerCase();
    if (typeof opts.windKmh === 'number') o.windKmh = opts.windKmh;
    // aliases
    if (o.time === 'jade' || o.time === 'noche' || o.time === 'nochejade') o.time = 'night';
    if (o.time === 'manana' || o.time === 'mañana') o.time = 'morning';
    if (o.time === 'tarde') o.time = 'afternoon';
    if (o.time === 'atardecer') o.time = 'sunset';
    if (o.weather === 'nublado' || o.weather === 'mist' || o.weather === 'bruma') o.weather = 'cloudy';
    if (o.weather === 'lluvia') o.weather = 'rain';
    if (o.weather === 'tormenta') o.weather = 'storm';
    if (o.weather === 'despejado') o.weather = 'clear';
    setManual(o);
    return getSnapshot();
  }

  function applyQueryParams() {
    try {
      const q = new URLSearchParams(location.search);
      const time = q.get('time');
      const weather = q.get('weather');
      const mode = q.get('mode');
      const wind = q.get('wind');
      if (mode === 'auto') { setAuto(); return true; }
      if (time || weather) {
        const o = {};
        if (time) o.time = time;
        if (weather) o.weather = weather;
        if (wind) o.windKmh = parseFloat(wind);
        setAztecaTheme(o);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function useExactLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          state.lat = pos.coords.latitude;
          state.lon = pos.coords.longitude;
          state.place = 'Tu ubicación';
          try {
            const wx = await fetchWeather(state.lat, state.lon);
            state.weather = wx.weather;
            state.windKmh = wx.windKmh;
            state.time = T.timeFromDate(new Date());
            state.mode = 'auto';
            state.source = 'geolocation';
            writeCache({ lat: state.lat, lon: state.lon, weather: wx.weather, windKmh: wx.windKmh, place: state.place });
            emit();
            resolve(getSnapshot());
          } catch (e) {
            state.lastError = String(e && e.message || e);
            emit();
            reject(e);
          }
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  // ---------- Control pill UI ----------
  function buildPill() {
    if (document.getElementById('az-theme-pill')) return;
    const wrap = document.createElement('div');
    wrap.id = 'az-theme-wrap';
    wrap.innerHTML = [
      '<button type="button" id="az-theme-pill" aria-expanded="false" aria-controls="az-theme-panel" aria-haspopup="dialog">',
      '  <span id="az-pill-label">Auto</span>',
      '</button>',
      '<div id="az-theme-panel" role="dialog" aria-label="Tema visual" hidden>',
      '  <div class="az-row az-head">Tema visual</div>',
      '  <button type="button" class="az-opt" data-mode="auto">⏱ Automático (tiempo real)</button>',
      '  <div class="az-row">Hora</div>',
      '  <div class="az-grid" id="az-times"></div>',
      '  <div class="az-row">Clima</div>',
      '  <div class="az-grid" id="az-weathers"></div>',
      '  <button type="button" class="az-opt az-geo" id="az-geo">📍 Usar mi ubicación exacta</button>',
      '  <div class="az-meta" id="az-meta"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap);

    const times = document.getElementById('az-times');
    T.TIMES.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'az-chip';
      b.dataset.time = id;
      b.textContent = T.TIME_ICONS[id] + ' ' + T.TIME_LABELS[id];
      times.appendChild(b);
    });
    const weathers = document.getElementById('az-weathers');
    T.WEATHERS.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'az-chip';
      b.dataset.weather = id;
      b.textContent = T.WEATHER_ICONS[id] + ' ' + T.WEATHER_LABELS[id];
      weathers.appendChild(b);
    });

    const pill = document.getElementById('az-theme-pill');
    const panel = document.getElementById('az-theme-panel');

    function close() {
      panel.hidden = true;
      pill.setAttribute('aria-expanded', 'false');
    }
    function open() {
      panel.hidden = false;
      pill.setAttribute('aria-expanded', 'true');
      syncUi();
    }
    pill.addEventListener('click', () => { panel.hidden ? open() : close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) close();
    });

    panel.querySelector('[data-mode="auto"]').addEventListener('click', () => { setAuto(); });
    times.addEventListener('click', e => {
      const b = e.target.closest('[data-time]');
      if (!b) return;
      setManual({ time: b.dataset.time, weather: state.weather, windKmh: state.windKmh });
    });
    weathers.addEventListener('click', e => {
      const b = e.target.closest('[data-weather]');
      if (!b) return;
      setManual({ time: state.time, weather: b.dataset.weather, windKmh: state.windKmh });
    });
    document.getElementById('az-geo').addEventListener('click', async () => {
      const btn = document.getElementById('az-geo');
      btn.textContent = '⏳ Obteniendo ubicación…';
      try {
        await useExactLocation();
        btn.textContent = '✓ Ubicación actualizada';
      } catch (e) {
        btn.textContent = '📍 No se pudo obtener · reintentar';
      }
      setTimeout(() => { btn.textContent = '📍 Usar mi ubicación exacta'; }, 2500);
    });

    function syncUi() {
      const s = getSnapshot();
      const modeLab = s.mode === 'auto' ? 'Auto' : 'Manual';
      document.getElementById('az-pill-label').textContent =
        modeLab + ' · ' + T.TIME_ICONS[s.time] + ' ' + T.TIME_LABELS[s.time] +
        ' · ' + T.WEATHER_LABELS[s.weather];
      panel.querySelectorAll('[data-time]').forEach(b => {
        b.classList.toggle('on', b.dataset.time === s.time);
      });
      panel.querySelectorAll('[data-weather]').forEach(b => {
        b.classList.toggle('on', b.dataset.weather === s.weather);
      });
      panel.querySelector('[data-mode="auto"]').classList.toggle('on', s.mode === 'auto');
      const meta = document.getElementById('az-meta');
      meta.textContent = s.place + ' · viento ' + Math.round(s.windKmh) + ' km/h' +
        (s.source ? ' · ' + s.source : '') + (s.loading ? ' · …' : '');
    }
    onChange(syncUi);
    syncUi();
  }

  // boot
  function init() {
    const hadQuery = applyQueryParams();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildPill);
    } else {
      buildPill();
    }
    if (!hadQuery) refreshAuto();
    // refresh clock every minute in auto mode
    setInterval(() => {
      if (state.mode === 'auto') {
        const nt = T.timeFromDate(new Date());
        if (nt !== state.time) { state.time = nt; emit(); }
      }
    }, 30000);
  }

  root.AztecaWeather = {
    init, onChange, getSnapshot, setAztecaTheme, setAuto, setManual,
    useExactLocation, refreshAuto, state
  };
  root.setAztecaTheme = setAztecaTheme;
})(typeof window !== 'undefined' ? window : global);
