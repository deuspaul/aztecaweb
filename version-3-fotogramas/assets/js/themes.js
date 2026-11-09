/* AztecaWeb v3 — time-of-day palettes + weather modulators + interpolation */
(function (root) {
  'use strict';

  const TIMES = ['morning', 'afternoon', 'sunset', 'night'];
  const WEATHERS = ['clear', 'cloudy', 'rain', 'storm'];

  const TIME_LABELS = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    sunset: 'Atardecer',
    night: 'Noche jade'
  };
  const WEATHER_LABELS = {
    clear: 'Despejado',
    cloudy: 'Nublado / Bruma',
    rain: 'Lluvia',
    storm: 'Tormenta'
  };
  const TIME_ICONS = { morning: '☀️', afternoon: '🌤️', sunset: '🌅', night: '🌙' };
  const WEATHER_ICONS = { clear: '✨', cloudy: '☁️', rain: '🌧️', storm: '⛈️' };

  /** Hour slot from local Date hours+minutes. */
  function timeFromDate(d) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19.5) return 'sunset';
    return 'night';
  }

  // ---------- palettes (canvas + CSS tokens) ----------
  // skyKeys: [p, topHex, bottomHex] for vertical gradient keyed by scroll progress p
  const PALETTES = {
    morning: {
      id: 'morning',
      night: false,
      arms: 4,
      galCols: ['#ffe6b0', '#9ad0ff', '#ffffff', '#c89bff', '#fff8e8'],
      galCore: 'rgba(255,248,230,0.9)',
      nebula: [
        ['rgba(120,200,255,0.45)', -0.15, 0, 0.7],
        ['rgba(90,140,255,0.4)', 0.2, 0.05, 0.8],
        ['rgba(255,220,160,0.3)', 0, -0.1, 0.5]
      ],
      sky: [
        [0, '#1e4fa8', '#bfe9ff'],
        [0.25, '#5ab2f0', '#fff8e8'],
        [0.5, '#1e4fa8', '#7ec8f5'],
        [0.7, '#0a1a48', '#1e4fa8'],
        [1, '#070b24', '#0a1028']
      ],
      sea: ['#3ad4d8', '#1496b4', '#0c5978'],
      sand: '#f3e4cb',
      stone: ['#f3e4cb', '#c9a882', '#8a6540'],
      cliff: ['#7a5a3e', '#c79a6a', '#5e4330'],
      palmTrunk: '#5a3b22',
      palmLeaf: ['#1d5a2c', '#4fa35a'],
      sunCore: '#fff1c4',
      sunGlow: 'rgba(255,220,140,',
      sunRay: 'rgba(255,210,140,0.05)',
      sunRef: 'rgba(255,230,160,',
      moon: false,
      doorGlow: ['#ffd27a', '#ffe9a8'],
      doorDark: '#3a2414',
      farLand: '#3b6a6a',
      bird: '#2a2030',
      cloudRgb: '255,240,230',
      mist: 'rgba(220,235,245,0.0)',
      // CSS tokens
      cardBg: 'rgba(255,255,255,0.86)',
      cardBgStorm: 'rgba(255,255,255,0.92)',
      cardText: '#142033',
      cardBorder: '1px solid rgba(20,32,51,0.08)',
      accent: '#0b8f9e',
      accentText: '#ffffff',
      navText: '#142033',
      navHalo: '0 1px 8px rgba(255,255,255,0.85)',
      navBg: 'rgba(255,255,255,0.28)',
      upperCardBg: 'rgba(15,20,40,0.55)',
      upperCardText: '#ffffff'
    },
    afternoon: {
      id: 'afternoon',
      night: false,
      arms: 4,
      galCols: ['#ffe6b0', '#ffb36b', '#9ad0ff', '#ffffff', '#c89bff'],
      galCore: 'rgba(255,240,210,0.9)',
      nebula: [
        ['rgba(255,140,80,0.45)', -0.15, 0, 0.7],
        ['rgba(70,110,255,0.45)', 0.2, 0.05, 0.8],
        ['rgba(200,90,255,0.3)', 0, -0.1, 0.5]
      ],
      sky: [
        [0, '#4fa8ff', '#bfe6ff'],
        [0.25, '#3a88e8', '#ffe8c8'],
        [0.5, '#1d3c8c', '#6aa0e8'],
        [0.7, '#0c1640', '#1d3c8c'],
        [1, '#06081e', '#0a0c24']
      ],
      sea: ['#26b9c8', '#1280a0', '#0a4f70'],
      sand: '#ecd0a4',
      stone: ['#ecd0a4', '#ad7e52', '#7a5535'],
      cliff: ['#7a5a3e', '#c79a6a', '#5e4330'],
      palmTrunk: '#5a3b22',
      palmLeaf: ['#1a5528', '#3f9448'],
      sunCore: '#fff4c0',
      sunGlow: 'rgba(255,200,100,',
      sunRay: 'rgba(255,190,100,0.06)',
      sunRef: 'rgba(255,220,140,',
      moon: false,
      doorGlow: ['#ffd27a', '#ffe9a8'],
      doorDark: '#3a2414',
      farLand: '#2f5a5a',
      bird: '#2a2030',
      cloudRgb: '255,235,210',
      mist: 'rgba(220,230,240,0.0)',
      cardBg: 'rgba(255,250,242,0.86)',
      cardBgStorm: 'rgba(255,250,242,0.92)',
      cardText: '#1b2440',
      cardBorder: '1px solid rgba(27,36,64,0.08)',
      accent: '#ff7a3d',
      accentText: '#141018',
      navText: '#1b2440',
      navHalo: '0 1px 8px rgba(255,255,255,0.7)',
      navBg: 'rgba(255,250,240,0.3)',
      upperCardBg: 'rgba(15,10,35,0.5)',
      upperCardText: '#ffffff'
    },
    sunset: {
      id: 'sunset',
      night: false,
      arms: 4,
      galCols: ['#ffe6b0', '#ffb36b', '#9ad0ff', '#ffffff', '#c89bff'],
      galCore: 'rgba(255,240,210,0.9)',
      nebula: [
        ['rgba(255,120,80,0.55)', -0.15, 0, 0.7],
        ['rgba(90,120,255,0.5)', 0.2, 0.05, 0.8],
        ['rgba(200,90,255,0.35)', 0, -0.1, 0.5]
      ],
      sky: [
        [0, '#ff9e5e', '#ffd08a'],
        [0.25, '#5f7fd8', '#ffb07a'],
        [0.5, '#2a3d8f', '#8a7ad0'],
        [0.7, '#140f3d', '#3a2a7a'],
        [1, '#05030f', '#0d0826']
      ],
      sea: ['#4fb6c8', '#1f7d9c', '#0b3550'],
      sand: '#f2dcae',
      stone: ['#e9c79a', '#a7784f', '#6e4a30'],
      cliff: ['#7a5a3e', '#c79a6a', '#5e4330'],
      palmTrunk: '#5a3b22',
      palmLeaf: ['#1d5a2c', '#4fa35a'],
      sunCore: '#fff1c4',
      sunGlow: 'rgba(255,180,100,',
      sunRay: 'rgba(255,160,80,0.06)',
      sunRef: 'rgba(255,200,120,',
      moon: false,
      doorGlow: ['#ffd27a', '#ffe9a8'],
      doorDark: '#3a2414',
      farLand: '#3b6a6a',
      bird: '#2a2030',
      cloudRgb: '255,225,200',
      mist: 'rgba(255,200,160,0.0)',
      cardBg: 'rgba(255,250,240,0.82)',
      cardBgStorm: 'rgba(255,250,240,0.90)',
      cardText: '#1d1b33',
      cardBorder: '1px solid rgba(29,27,51,0.08)',
      accent: '#ff7a3d',
      accentText: '#ffffff',
      navText: '#ffffff',
      navHalo: '0 1px 8px rgba(0,0,0,0.45)',
      navBg: 'rgba(20,15,40,0.25)',
      upperCardBg: 'rgba(15,10,35,0.5)',
      upperCardText: '#ffffff'
    },
    night: {
      id: 'night',
      night: true,
      arms: 4,
      galCols: ['#5effd0', '#b48cff', '#ffe066', '#ffffff', '#3fb6a8'],
      galCore: 'rgba(94,255,208,0.55)',
      nebula: [
        ['rgba(63,182,168,0.45)', -0.12, 0, 0.7],
        ['rgba(180,140,255,0.4)', 0.18, 0.05, 0.75],
        ['rgba(47,255,192,0.28)', 0, -0.12, 0.5]
      ],
      sky: [
        [0, '#14607a', '#3fb6a8'],
        [0.25, '#0b2a4a', '#14607a'],
        [0.5, '#061828', '#0b2a4a'],
        [0.7, '#020a1a', '#061828'],
        [1, '#000004', '#020a1a']
      ],
      sea: ['#0f5560', '#0a3a48', '#05222e'],
      sand: '#9bb7a6',
      stone: ['#4f7d6e', '#3b6156', '#28463e'],
      cliff: ['#3b6156', '#4f7d6e', '#28463e'],
      palmTrunk: '#1a3328',
      palmLeaf: ['#0b2f2a', '#175248'],
      sunCore: '#e8f0ff',
      sunGlow: 'rgba(94,255,208,',
      sunRay: 'rgba(94,255,208,0.04)',
      sunRef: 'rgba(94,255,208,',
      moon: true,
      doorGlow: ['#2fffc0', '#5effd0'],
      doorDark: '#0a221c',
      farLand: '#0a3a40',
      bird: '#5effd0',
      cloudRgb: '120,160,170',
      mist: 'rgba(80,140,150,0.0)',
      cardBg: 'rgba(4,20,30,0.78)',
      cardBgStorm: 'rgba(4,20,30,0.90)',
      cardText: '#e4fff9',
      cardBorder: '1px solid rgba(47,255,192,0.28)',
      accent: '#2fffc0',
      accentText: '#062019',
      navText: '#e4fff9',
      navHalo: '0 1px 8px rgba(0,0,0,0.5)',
      navBg: 'rgba(0,10,20,0.5)',
      upperCardBg: 'rgba(4,20,30,0.72)',
      upperCardText: '#e4fff9'
    }
  };

  // Weather modulators — scalars & overlays blended onto a base palette
  const WEATHER_MOD = {
    clear: {
      cloudDensity: 0.55,
      cloudAlpha: 0.7,
      mistAlpha: 0,
      rainAlpha: 0,
      rainDensity: 0,
      waveAmp: 1,
      palmBend: 1,
      sunDiffuse: 1,
      cardOpacityBoost: 0,
      lightning: false,
      sparkles: true,
      birds: true,
      lowCloudDark: 0
    },
    cloudy: {
      cloudDensity: 1.15,
      cloudAlpha: 0.92,
      mistAlpha: 0.35,
      rainAlpha: 0,
      rainDensity: 0,
      waveAmp: 1.05,
      palmBend: 1.15,
      sunDiffuse: 0.45,
      cardOpacityBoost: 0.04,
      lightning: false,
      sparkles: false,
      birds: false,
      lowCloudDark: 0.25
    },
    rain: {
      cloudDensity: 1.25,
      cloudAlpha: 0.95,
      mistAlpha: 0.28,
      rainAlpha: 0.55,
      rainDensity: 1,
      waveAmp: 1.35,
      palmBend: 1.4,
      sunDiffuse: 0.25,
      cardOpacityBoost: 0.06,
      lightning: false,
      sparkles: false,
      birds: false,
      lowCloudDark: 0.4
    },
    storm: {
      cloudDensity: 1.45,
      cloudAlpha: 1,
      mistAlpha: 0.42,
      rainAlpha: 0.78,
      rainDensity: 1.6,
      waveAmp: 1.7,
      palmBend: 1.85,
      sunDiffuse: 0.12,
      cardOpacityBoost: 0.1,
      lightning: true,
      sparkles: false,
      birds: false,
      lowCloudDark: 0.6
    }
  };

  // ---------- color helpers ----------
  function hx(h) {
    if (!h || h[0] !== '#') return [0, 0, 0];
    const s = h.length === 4
      ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
      : h;
    return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  }
  function rgbStr(r, g, b, a) {
    if (a === undefined || a >= 1) return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    return 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + a + ')';
  }
  function mixHex(a, b, t) {
    a = hx(a); b = hx(b);
    return rgbStr(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
  function mixRgba(a, b, t) {
    const pa = parseRgba(a), pb = parseRgba(b);
    return rgbStr(
      pa[0] + (pb[0] - pa[0]) * t,
      pa[1] + (pb[1] - pa[1]) * t,
      pa[2] + (pb[2] - pa[2]) * t,
      pa[3] + (pb[3] - pa[3]) * t
    );
  }
  function parseRgba(s) {
    if (!s) return [0, 0, 0, 1];
    if (s[0] === '#') { const h = hx(s); return [h[0], h[1], h[2], 1]; }
    const m = s.match(/([\d.]+)/g);
    if (!m) return [0, 0, 0, 1];
    return [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { return t * t * (3 - 2 * t); }

  function keyCol(keys, p, idx) {
    for (let i = 0; i < keys.length - 1; i++) {
      if (p <= keys[i + 1][0]) {
        const t = (p - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
        return mixHex(keys[i][idx], keys[i + 1][idx], t);
      }
    }
    return keys[keys.length - 1][idx];
  }

  function mixSkyKeys(a, b, t) {
    // assume same stop positions
    return a.map((k, i) => [k[0], mixHex(k[1], b[i][1], t), mixHex(k[2], b[i][2], t)]);
  }

  function mixPalette(a, b, t) {
    t = clamp(t, 0, 1);
    if (t <= 0) return clonePal(a);
    if (t >= 1) return clonePal(b);
    const out = {};
    out.id = t < 0.5 ? a.id : b.id;
    out.night = t < 0.5 ? a.night : b.night;
    out.moon = t < 0.5 ? a.moon : b.moon;
    out.arms = a.arms;
    out.galCols = a.galCols.map((c, i) => mixHex(c, b.galCols[i % b.galCols.length], t));
    out.galCore = mixRgba(a.galCore, b.galCore, t);
    out.nebula = a.nebula.map((n, i) => {
      const m = b.nebula[i] || b.nebula[0];
      return [mixRgba(n[0], m[0], t), lerp(n[1], m[1], t), lerp(n[2], m[2], t), lerp(n[3], m[3], t)];
    });
    out.sky = mixSkyKeys(a.sky, b.sky, t);
    out.sea = a.sea.map((c, i) => mixHex(c, b.sea[i], t));
    out.sand = mixHex(a.sand, b.sand, t);
    out.stone = a.stone.map((c, i) => mixHex(c, b.stone[i], t));
    out.cliff = a.cliff.map((c, i) => mixHex(c, b.cliff[i], t));
    out.palmTrunk = mixHex(a.palmTrunk, b.palmTrunk, t);
    out.palmLeaf = a.palmLeaf.map((c, i) => mixHex(c, b.palmLeaf[i], t));
    out.sunCore = mixHex(a.sunCore, b.sunCore, t);
    out.sunGlow = t < 0.5 ? a.sunGlow : b.sunGlow;
    out.sunRay = mixRgba(a.sunRay, b.sunRay, t);
    out.sunRef = t < 0.5 ? a.sunRef : b.sunRef;
    out.doorGlow = a.doorGlow.map((c, i) => mixHex(c, b.doorGlow[i], t));
    out.doorDark = mixHex(a.doorDark, b.doorDark, t);
    out.farLand = mixHex(a.farLand, b.farLand, t);
    out.bird = mixHex(a.bird, b.bird, t);
    out.cloudRgb = t < 0.5 ? a.cloudRgb : b.cloudRgb;
    out.mist = mixRgba(a.mist, b.mist, t);
    // CSS
    out.cardBg = mixRgba(a.cardBg, b.cardBg, t);
    out.cardBgStorm = mixRgba(a.cardBgStorm, b.cardBgStorm, t);
    out.cardText = mixHex(a.cardText, b.cardText, t);
    out.cardBorder = t < 0.5 ? a.cardBorder : b.cardBorder;
    out.accent = mixHex(a.accent, b.accent, t);
    out.accentText = mixHex(a.accentText, b.accentText, t);
    out.navText = mixHex(a.navText, b.navText, t);
    out.navHalo = t < 0.5 ? a.navHalo : b.navHalo;
    out.navBg = mixRgba(a.navBg, b.navBg, t);
    out.upperCardBg = mixRgba(a.upperCardBg, b.upperCardBg, t);
    out.upperCardText = mixHex(a.upperCardText, b.upperCardText, t);
    return out;
  }

  function clonePal(p) {
    return JSON.parse(JSON.stringify(p));
  }

  function mixWeather(a, b, t) {
    t = clamp(t, 0, 1);
    const out = {};
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'number') out[k] = lerp(a[k], b[k], t);
      else if (typeof a[k] === 'boolean') out[k] = t < 0.5 ? a[k] : b[k];
      else out[k] = t < 0.5 ? a[k] : b[k];
    }
    return out;
  }

  /** Continuous wind factor 0..1.5 from km/h. */
  function windFactor(kmh) {
    return clamp((kmh || 12) / 40, 0.15, 1.6);
  }

  function applyCss(pal, wx) {
    const rootEl = document.documentElement;
    const stormy = (wx.cardOpacityBoost || 0) > 0.05;
    const card = stormy ? pal.cardBgStorm : pal.cardBg;
    rootEl.style.setProperty('--card-bg', card);
    rootEl.style.setProperty('--card-text', pal.cardText);
    rootEl.style.setProperty('--card-border', pal.cardBorder);
    rootEl.style.setProperty('--accent', pal.accent);
    rootEl.style.setProperty('--accent-text', pal.accentText);
    rootEl.style.setProperty('--nav-text', pal.navText);
    rootEl.style.setProperty('--nav-halo', pal.navHalo);
    rootEl.style.setProperty('--nav-bg', pal.navBg);
    rootEl.style.setProperty('--upper-card-bg', pal.upperCardBg);
    rootEl.style.setProperty('--upper-card-text', pal.upperCardText);
    rootEl.dataset.time = pal.id;
    rootEl.dataset.night = pal.night ? '1' : '0';
  }

  root.AztecaThemes = {
    TIMES, WEATHERS, TIME_LABELS, WEATHER_LABELS, TIME_ICONS, WEATHER_ICONS,
    PALETTES, WEATHER_MOD,
    timeFromDate, keyCol, mixHex, mixRgba, mixPalette, mixWeather,
    windFactor, applyCss, lerp, clamp, ease, hx, parseRgba, clonePal
  };
})(typeof window !== 'undefined' ? window : global);
