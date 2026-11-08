/* AztecaWeb v3 — 5-layer canvas engine + theme interpolation + reduced-motion */
(function (root) {
  'use strict';
  const T = root.AztecaThemes;
  const WX = root.AztecaWeather;

  const cv = document.getElementById('bg');
  const c = cv.getContext('2d');
  let W, H, mob, mx = 0.5, my = 0.5, hoverT = 0, ripples = [], shoot = [];
  let stars = [], gal = [], clouds = [], rainDrops = [];
  let geo = {};
  let reduced = false;
  let rafId = 0;
  let needsPaint = true;
  let lightningFlash = 0;
  let nextLightning = 0;

  // live interpolated theme
  let curPal = T.clonePal(T.PALETTES.sunset);
  let curWx = Object.assign({}, T.WEATHER_MOD.clear);
  let curWind = 0.35;
  let fromPal = curPal, toPal = curPal, fromWx = curWx, toWx = curWx;
  let fromWind = curWind, toWind = curWind;
  let blendT = 1, blendStart = 0;
  const BLEND_MS = 800;

  const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

  function poly(pts) {
    c.beginPath();
    pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
  }

  function initScene() {
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
    mob = W < 700;
    stars = [...Array(500)].map(() => ({ x: rnd(), y: rnd(), s: rnd(0.5, 2), ph: rnd(6.28) }));
    const arms = curPal.arms || 4;
    gal = [...Array(mob ? 1400 : 2600)].map((_, i) => {
      const r = Math.pow(rnd(), 0.6);
      return { r, a: (i % arms) * 6.283 / arms + r * 4 + rnd(-0.35, 0.35), ci: (rnd(curPal.galCols.length)) | 0, s: rnd(0.5, 2.2) };
    });
    clouds = [...Array(18)].map(() => ({
      x: rnd(-0.2, 1.2), wy: rnd(0.7, 3.2), w: rnd(0.12, 0.32),
      sp: rnd(0.00004, 0.00016), z: rnd(0.55, 1.35), dark: rnd()
    }));
    rainDrops = [...Array(220)].map(() => ({
      x: rnd(), y: rnd(), len: rnd(10, 22), sp: rnd(0.012, 0.028), z: rnd(0.6, 1.2)
    }));
    needsPaint = true;
  }

  function layout() {
    const cx = mob ? W * 0.55 : W * 0.66;
    const pw = mob ? W * 0.6 : Math.min(W * 0.26, H * 0.5);
    const hy = H * (mob ? 0.64 : 0.6);
    const py = H * (mob ? 0.74 : 0.7);
    geo = { cx, pw, hy, py };
  }

  const prog = () => {
    const m = document.documentElement.scrollHeight - innerHeight;
    return m > 0 ? 1 - scrollY / m : 0;
  };
  const dist = () => document.documentElement.scrollHeight - innerHeight - scrollY;

  function startBlend(nextTime, nextWeather, nextWind) {
    fromPal = curPal;
    toPal = T.PALETTES[nextTime] || T.PALETTES.sunset;
    fromWx = curWx;
    toWx = T.WEATHER_MOD[nextWeather] || T.WEATHER_MOD.clear;
    fromWind = curWind;
    toWind = nextWind;
    blendStart = performance.now();
    blendT = 0;
    // rebuild galaxy colors reference
    needsPaint = true;
    if (reduced) {
      blendT = 1;
      curPal = T.clonePal(toPal);
      curWx = Object.assign({}, toWx);
      curWind = toWind;
      T.applyCss(curPal, curWx);
      paint();
    }
  }

  function tickBlend(now) {
    if (blendT >= 1) return;
    const dur = reduced ? 1 : BLEND_MS;
    blendT = Math.min(1, (now - blendStart) / dur);
    const e = T.ease(blendT);
    curPal = T.mixPalette(fromPal, toPal, e);
    curWx = T.mixWeather(fromWx, toWx, e);
    curWind = T.lerp(fromWind, toWind, e);
    T.applyCss(curPal, curWx);
    needsPaint = true;
  }

  // ---------- Layer 1: Sky & Galaxy ----------
  function layerSky(p, now) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.keyCol(curPal.sky, Math.min(1, p + 0.08), 1));
    g.addColorStop(1, T.keyCol(curPal.sky, p, 2));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // storm darkening veil on sky
    if (curWx.lowCloudDark > 0.01) {
      c.fillStyle = 'rgba(10,15,30,' + (curWx.lowCloudDark * 0.35) + ')';
      c.fillRect(0, 0, W, H);
    }

    const sa = sm(0.35, 0.75, p);
    const t = reduced ? 0 : now / 1000;
    if (sa > 0) {
      for (const s of stars) {
        const a = sa * (reduced ? 0.7 : (0.5 + 0.5 * Math.sin(t * 2 + s.ph)));
        c.globalAlpha = a;
        c.fillStyle = '#fff';
        const x = s.x * W + (mx - 0.5) * -20 * s.s;
        const y = s.y * H + (my - 0.5) * -20 * s.s;
        c.beginPath(); c.arc(x, y, s.s * 0.8, 0, 6.28); c.fill();
      }
      c.globalAlpha = 1;
    }

    const ga = sm(0.58, 0.95, p);
    if (ga > 0) {
      const R = Math.max(W, H) * 0.6;
      const cx = W * (0.5 + (mx - 0.5) * 0.12);
      const cy = H * (0.45 + (my - 0.5) * 0.12) + (1 - ga) * H * 0.4;
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const [col, ox, oy, rr] of curPal.nebula) {
        const ng = c.createRadialGradient(cx + ox * W, cy + oy * H, 0, cx + ox * W, cy + oy * H, rr * R);
        ng.addColorStop(0, col);
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = ga * 0.7;
        c.fillStyle = ng;
        c.fillRect(0, 0, W, H);
      }
      const rot = reduced ? 0 : t * 0.05;
      for (const g2 of gal) {
        const a = g2.a + rot * (1.3 - g2.r);
        const x = cx + Math.cos(a) * g2.r * R;
        const y = cy + Math.sin(a) * g2.r * R * 0.42;
        c.globalAlpha = ga * (1 - g2.r * 0.6);
        c.fillStyle = curPal.galCols[g2.ci % curPal.galCols.length];
        c.fillRect(x, y, g2.s, g2.s);
      }
      const core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
      core.addColorStop(0, curPal.galCore);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = ga;
      c.fillStyle = core;
      c.fillRect(0, 0, W, H);
      c.restore();
    }

    if (!reduced) {
      for (const s of shoot) {
        c.strokeStyle = 'rgba(255,255,255,' + s.l / 60 + ')';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 8, s.y - s.vy * 8); c.stroke();
        s.x += s.vx; s.y += s.vy; s.l--;
      }
      shoot = shoot.filter(s => s.l > 0);
    }
  }

  // ---------- Layer 2: Sun / Jade Moon + reflection ----------
  function layerSunMoon(p, d, now) {
    const a = (1 - sm(0.3, 0.6, p)) * curWx.sunDiffuse;
    if (a <= 0.01) return;
    const x = W * (mob ? 0.25 : 0.3);
    const y = H * 0.42 + d * 0.35;
    c.save();
    c.globalAlpha = a;
    if (curPal.moon) {
      // jade-silver moon
      for (let i = 6; i > 0; i--) {
        c.fillStyle = curPal.sunGlow + (0.05 * i / 6) + ')';
        c.beginPath(); c.arc(x, y, 34 + i * 28, 0, 6.28); c.fill();
      }
      c.fillStyle = curPal.sunCore;
      c.beginPath(); c.arc(x, y, 38, 0, 6.28); c.fill();
      // soft crater tint
      c.globalAlpha = a * 0.25;
      c.fillStyle = '#b8c8e0';
      c.beginPath(); c.arc(x - 10, y - 6, 8, 0, 6.28); c.fill();
      c.beginPath(); c.arc(x + 12, y + 8, 5, 0, 6.28); c.fill();
    } else {
      for (let i = 6; i > 0; i--) {
        c.fillStyle = curPal.sunGlow + (0.06 * i / 6) + ')';
        c.beginPath(); c.arc(x, y, 40 + i * 38, 0, 6.28); c.fill();
      }
      c.fillStyle = curPal.sunCore;
      c.beginPath(); c.arc(x, y, 46, 0, 6.28); c.fill();
      if (!reduced) {
        c.globalCompositeOperation = 'lighter';
        const t = now / 4000;
        for (let i = 0; i < 10; i++) {
          const an = i * 0.63 + t;
          c.fillStyle = curPal.sunRay;
          c.beginPath(); c.moveTo(x, y); c.arc(x, y, H, an, an + 0.12); c.fill();
        }
      }
    }
    c.restore();
  }

  function sunRef(hy, now) {
    const a = curWx.sunDiffuse;
    if (a < 0.05) return;
    const x = W * (mob ? 0.25 : 0.3);
    const t = reduced ? 0 : now / 1000;
    c.save();
    c.globalAlpha = a;
    for (let i = 0; i < 26; i++) {
      const y = hy + 8 + i * i * 0.9;
      const w = (60 - i * 1.5) * (1 + 0.3 * Math.sin(t * 3 + i));
      c.fillStyle = curPal.sunRef + (0.55 - i * 0.018) + ')';
      c.fillRect(x - w / 2 + Math.sin(t * 2 + i) * 8, y, w, 2 + i * 0.15);
    }
    c.restore();
  }

  // ---------- Layer 3: Clouds & mist ----------
  function layerClouds(d, p, now) {
    const ca = (1 - sm(0.55, 0.8, p)) * curWx.cloudAlpha;
    if (ca <= 0.01) return;
    const t = now;
    const wind = curWind;
    c.save();
    c.globalAlpha = ca;
    const nShow = Math.min(clouds.length, Math.round(clouds.length * curWx.cloudDensity));
    for (let i = 0; i < nShow; i++) {
      const cl = clouds[i];
      if (!reduced) {
        cl.x += cl.sp * cl.z * 16 * (0.6 + wind);
        if (cl.x > 1.3) cl.x = -0.3;
      }
      const x = (cl.x + (mx - 0.5) * 0.03 * cl.z) * W;
      const y = H - (cl.wy * H - d) * cl.z * 0.9 - H * 0.4;
      const w = cl.w * W * (mob ? 1.8 : 1);
      if (y < -200 || y > H + 100) continue;
      drawCloud(x, y, w, p, cl.dark);
    }
    c.restore();

    // coastal mist bank
    if (curWx.mistAlpha > 0.01 && p < 0.7) {
      const ma = curWx.mistAlpha * (1 - sm(0.45, 0.7, p));
      const hy = geo.hy || H * 0.6;
      const mg = c.createLinearGradient(0, hy - 80 + d, 0, hy + 40 + d);
      mg.addColorStop(0, 'rgba(200,220,230,0)');
      mg.addColorStop(0.5, 'rgba(180,200,215,' + ma + ')');
      mg.addColorStop(1, 'rgba(160,180,200,0)');
      c.fillStyle = mg;
      c.fillRect(0, hy - 100 + d, W, 160);
    }
  }

  function drawCloud(x, y, w, p, dark) {
    let col = curPal.cloudRgb;
    if (curWx.lowCloudDark > 0.1 && dark > 0.4) {
      // darker storm clouds
      const parts = col.split(',').map(Number);
      const f = 1 - curWx.lowCloudDark * 0.55;
      col = Math.round(parts[0] * f) + ',' + Math.round(parts[1] * f) + ',' + Math.round(parts[2] * f);
    } else if (p > 0.35) {
      // cooler tint higher up
      const parts = col.split(',').map(Number);
      col = Math.round(parts[0] * 0.92) + ',' + Math.round(parts[1] * 0.92) + ',' + Math.min(255, Math.round(parts[2] * 1.05));
    }
    for (let i = 0; i < 7; i++) {
      const g = c.createRadialGradient(x + i * w * 0.13, y - Math.sin(i) * w * 0.08, 0, x + i * w * 0.13, y, w * 0.22);
      g.addColorStop(0, 'rgba(' + col + ',0.8)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x + i * w * 0.13, y - Math.sin(i) * w * 0.08, w * 0.22, 0, 6.28); c.fill();
    }
  }

  // ---------- Layer 4: Sea, cliff, temple, palms ----------
  function layerScene(d, p, now) {
    if (d > H * 1.4) return;
    const t = reduced ? 0 : now / 1000;
    layout();
    const { cx, pw, hy, py } = geo;
    c.save();
    c.translate(0, d);

    // sea
    const sg = c.createLinearGradient(0, hy, 0, H);
    sg.addColorStop(0, curPal.sea[0]);
    sg.addColorStop(0.5, curPal.sea[1]);
    sg.addColorStop(1, curPal.sea[2]);
    c.fillStyle = sg;
    c.fillRect(0, hy, W, H - hy);

    sunRef(hy, now);

    // far coast
    c.fillStyle = curPal.farLand;
    c.beginPath();
    c.moveTo(0, hy);
    for (let x = 0; x <= W * 0.35; x += 20) {
      c.lineTo(x, hy - 14 - Math.sin(x * 0.05) * 5 - Math.sin(x * 0.013) * 10);
    }
    c.lineTo(W * 0.35, hy);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillRect(0, hy, W, 1.5);

    // cliff
    const L = cx - pw * 0.95, R = cx + pw * 1.1, top = py;
    const cg = c.createLinearGradient(L, 0, R, 0);
    cg.addColorStop(0, curPal.cliff[0]);
    cg.addColorStop(0.5, curPal.cliff[1]);
    cg.addColorStop(1, curPal.cliff[2]);
    const pts = [[L - pw * 0.3, H], [L - pw * 0.15, hy + 30], [L, top + 20], [L + pw * 0.1, top],
      [R - pw * 0.05, top], [R, top + 15], [R + pw * 0.25, hy + 20], [R + pw * 0.5, H]];
    poly(pts); c.fillStyle = cg; c.fill();
    // cliff top vegetation
    c.fillStyle = curPal.palmLeaf[0];
    poly([[L, top + 4], [L + pw * 0.1, top - 8], [R - pw * 0.05, top - 8], [R, top + 6], [R, top + 14], [L, top + 14]]);
    c.fill();
    c.strokeStyle = 'rgba(60,35,20,0.3)';
    c.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = L + ((i * 97) % 100) / 100 * (R - L);
      const y = top + 30 + ((i * 53) % 100) / 100 * (hy - top);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y + 10); c.lineTo(x + 6, y + 24); c.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = L + i * (R - L) / 8;
      c.fillStyle = i % 2 ? curPal.palmLeaf[0] : curPal.palmLeaf[1];
      c.beginPath(); c.arc(x, top - 4, pw * 0.07, 0, 6.28); c.fill();
    }

    // temple
    geo.temple = [cx - pw * 0.5, top - pw * 0.62, pw, pw * 0.62];
    drawTemple(cx, top, pw, hoverT, t);

    // palms
    const bendBase = curWx.palmBend * curWind;
    const palms = mob
      ? [[L - pw * 0.05, top + pw * 0.25, 0.7], [R - pw * 0.05, top + pw * 0.05, 0.8], [W * 0.12, H * 0.92, 1]]
      : [[L + pw * 0.05, top + pw * 0.05, 0.8], [R - pw * 0.15, top + pw * 0.02, 0.9], [R + pw * 0.25, top + pw * 0.3, 0.7], [W * 0.05, H * 0.98, 1], [W * 0.17, H * 1.0, 0.8]];
    palms.forEach(([x, y, s], i) => {
      const sway = reduced ? 0 : Math.sin(t * 1.3 + i) * 0.06 * bendBase + (mx - 0.5) * 0.05;
      drawPalm(x, y, s * pw / 260 * (mob ? 1.3 : 1), sway, i, t);
    });

    // waves
    drawWaves(hy, t);

    // ripples
    if (!reduced) {
      for (const r of ripples) {
        r.r += 3;
        c.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 1 - r.r / 120) + ')';
        c.lineWidth = 2;
        c.beginPath(); c.ellipse(r.x, r.y - d, r.r, r.r * 0.3, 0, 0, 6.28); c.stroke();
      }
      ripples = ripples.filter(r => r.r < 120);
    }

    // raindrop ripples on sea (when raining, below galaxy)
    if (curWx.rainAlpha > 0.05 && p < 0.65 && !reduced) {
      c.save();
      c.globalAlpha = curWx.rainAlpha * 0.4;
      for (let i = 0; i < 8; i++) {
        const rx = ((t * 40 + i * 137) % W);
        const ry = hy + 20 + ((t * 60 + i * 89) % (H - hy - 40));
        const rr = 4 + (i % 3) * 3;
        c.strokeStyle = 'rgba(200,230,255,0.5)';
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(rx, ry, rr, rr * 0.3, 0, 0, 6.28); c.stroke();
      }
      c.restore();
    }

    // clear-weather birds / sparkles
    if (curWx.birds && p < 0.45) {
      c.save();
      for (let i = 0; i < 5; i++) {
        const x = (W * 0.1 + i * W * 0.22 + (reduced ? i * 40 : t * 30 * (1 + i * 0.2))) % W;
        const y = H * 0.25 + Math.sin((reduced ? i : t) + i) * 20 + i * 15;
        c.strokeStyle = curPal.bird;
        c.lineWidth = 2;
        c.beginPath();
        const f = reduced ? 0 : Math.sin(t * 8 + i) * 6;
        c.moveTo(x - 10, y - f);
        c.quadraticCurveTo(x - 5, y - 4, x, y);
        c.quadraticCurveTo(x + 5, y - 4, x + 10, y - f);
        c.stroke();
      }
      c.restore();
    }

    c.restore();
  }

  function drawTemple(cx, top, pw, h, t) {
    const s = pw;
    const stone = curPal.stone;
    c.save();
    if (h > 0) {
      c.shadowColor = curPal.moon
        ? 'rgba(47,255,192,' + h + ')'
        : 'rgba(255,210,120,' + h + ')';
      c.shadowBlur = 40 * h;
    }
    const st = (x, y, w, hh, c1, c2) => {
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, c2); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
      c.fillStyle = g; c.fillRect(x, y, w, hh);
    };
    for (let i = 0; i < 3; i++) {
      const w = s * (1 - i * 0.12), y = top - s * 0.1 * (i + 1);
      st(cx - w / 2, y, w, s * 0.1, stone[0], stone[1]);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(cx - w / 2, y + s * 0.09, w, s * 0.01);
    }
    const sw = s * 0.22;
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? stone[1] : stone[0];
      c.fillRect(cx - sw / 2, top - s * 0.3 * (i / 8) - s * 0.3 / 8, sw, s * 0.3 / 8);
    }
    const ty = top - s * 0.3, tw = s * 0.62;
    st(cx - tw / 2, ty - s * 0.24, tw, s * 0.24, stone[0], stone[1]);
    // doorways
    c.fillStyle = curPal.doorDark;
    [-0.3, 0, 0.3].forEach(o => { c.fillRect(cx + o * tw - s * 0.045, ty - s * 0.17, s * 0.09, s * 0.17); });
    // glow — stronger in jade night
    const glowA = curPal.moon
      ? (0.55 + 0.25 * Math.sin(t * 2) + 0.2 * h)
      : (0.4 + 0.3 * Math.sin(t * 2) * h + 0.3 * h);
    c.fillStyle = curPal.doorGlow[0];
    c.globalAlpha = Math.max(0.15, glowA);
    [-0.3, 0, 0.3].forEach(o => { c.fillRect(cx + o * tw - s * 0.035, ty - s * 0.15, s * 0.07, s * 0.15); });
    if (curPal.moon) {
      c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 1.5);
      c.fillStyle = curPal.doorGlow[1];
      [-0.3, 0, 0.3].forEach(o => { c.fillRect(cx + o * tw - s * 0.025, ty - s * 0.13, s * 0.05, s * 0.13); });
    }
    c.globalAlpha = 1;
    st(cx - tw * 0.56, ty - s * 0.3, tw * 1.12, s * 0.06, stone[0], stone[2]);
    st(cx - tw * 0.5, ty - s * 0.34, tw, s * 0.04, stone[0], stone[1]);
    c.restore();
  }

  function drawPalm(x, y, s, sw, i, t) {
    c.save();
    c.translate(x, y);
    c.rotate(sw * 0.3);
    c.strokeStyle = curPal.palmTrunk;
    c.lineWidth = 10 * s;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-20 * s, -110 * s, 12 * s, -220 * s); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2 * s;
    for (let k = 1; k < 10; k++) {
      c.beginPath(); c.moveTo(-6 * s + k * 0.5 * s, -k * 22 * s); c.lineTo(6 * s + k * s, -k * 22 * s); c.stroke();
    }
    c.translate(12 * s, -220 * s);
    for (let j = 0; j < 9; j++) {
      const a = -Math.PI + j * Math.PI / 8 + (reduced ? 0 : Math.sin(t * 1.4 + j + i) * 0.06) + sw;
      c.save(); c.rotate(a);
      const g = c.createLinearGradient(0, 0, 130 * s, 0);
      g.addColorStop(0, curPal.palmLeaf[0]);
      g.addColorStop(1, curPal.palmLeaf[1]);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(65 * s, -28 * s, 135 * s, 22 * s);
      c.quadraticCurveTo(65 * s, 0, 0, 6 * s);
      c.fill();
      c.restore();
    }
    c.fillStyle = curPal.palmTrunk;
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.arc(-6 * s + k * 7 * s, 6 * s, 6 * s, 0, 6.28); c.fill();
    }
    c.restore();
  }

  function drawWaves(hy, t) {
    const amp = curWx.waveAmp;
    for (let i = 0; i < 6; i++) {
      const y0 = hy + (H - hy) * (0.15 + i * 0.16);
      c.strokeStyle = 'rgba(255,255,255,' + (0.15 + i * 0.08) + ')';
      c.lineWidth = 1 + i * 0.6;
      c.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const y = y0 + Math.sin(x * 0.012 + t * (1 + i * 0.3) + i) * (3 + i * 2) * amp + (mx - 0.5) * i * 4 * Math.cos(x * 0.004);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    // beach
    c.fillStyle = curPal.sand;
    c.beginPath();
    c.moveTo(0, H); c.lineTo(0, H * 0.9);
    c.quadraticCurveTo(W * 0.25, H * 0.86, W * 0.45, H * 0.95);
    c.lineTo(W * 0.5, H); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x <= W * 0.48; x += 8) {
      const y = H * 0.9 + (x / W) * 0.1 * H * 0.6 - Math.sin(x * 0.03 + t * 2) * 4 * amp + Math.sin(t) * 6;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }

  // ---------- Layer 5: Weather overlay (rain / lightning), masked behind cards ----------
  function layerWeather(p, now) {
    // above storm: no rain in galaxy
    const rainFade = 1 - sm(0.55, 0.75, p);
    if (curWx.rainAlpha > 0.02 && rainFade > 0.02) {
      c.save();
      // mask out card rects so text stays crisp
      const cards = document.querySelectorAll('.card');
      // draw rain first, then punch holes — use destination-out over cards
      c.globalAlpha = curWx.rainAlpha * rainFade;
      const dens = curWx.rainDensity;
      const n = Math.min(rainDrops.length, Math.round(140 * dens));
      c.strokeStyle = curPal.night ? 'rgba(180,230,240,0.55)' : 'rgba(220,235,255,0.55)';
      c.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        const d = rainDrops[i];
        if (!reduced) {
          d.y += d.sp * d.z * (1.2 + curWind);
          d.x += 0.0015 * curWind;
          if (d.y > 1.1) { d.y = -0.05; d.x = rnd(); }
          if (d.x > 1.1) d.x = -0.05;
        }
        const x = d.x * W;
        const y = d.y * H;
        const len = d.len * d.z;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 4 + curWind * 6, y + len);
        c.stroke();
      }
      // punch card areas
      c.globalCompositeOperation = 'destination-out';
      c.globalAlpha = 1;
      cards.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > H) return;
        const pad = 10;
        c.beginPath();
        roundRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2, 18);
        c.fill();
      });
      c.restore();
    }

    // distant lightning (storm only, never in reduced motion)
    if (curWx.lightning && !reduced && p < 0.7) {
      if (now > nextLightning) {
        lightningFlash = 1;
        nextLightning = now + 8000 + rnd(4000);
      }
      if (lightningFlash > 0) {
        const hy = (geo.hy || H * 0.6) + dist();
        c.save();
        c.globalAlpha = lightningFlash * 0.22 * (1 - sm(0.5, 0.75, p));
        const lg = c.createRadialGradient(W * 0.7, hy - 40, 0, W * 0.7, hy - 40, W * 0.5);
        lg.addColorStop(0, 'rgba(200,220,255,0.9)');
        lg.addColorStop(1, 'rgba(200,220,255,0)');
        c.fillStyle = lg;
        c.fillRect(0, 0, W, H);
        c.restore();
        lightningFlash *= 0.88;
        if (lightningFlash < 0.02) lightningFlash = 0;
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- paint / loop ----------
  function paint() {
    const now = performance.now();
    tickBlend(now);
    const p = prog(), d = dist();

    // temple hover
    const tp = geo.temple;
    if (tp) {
      const X = mx * W, Y = my * H - d;
      hoverT += ((X > tp[0] && X < tp[0] + tp[2] && Y > tp[1] && Y < tp[1] + tp[3]) ? 1 : 0 - hoverT) * 0.1;
      hoverT = Math.max(0, Math.min(1, hoverT));
    }

    // Layer order
    layerSky(p, now);           // 1
    layerSunMoon(p, d, now);    // 2
    layerClouds(d, p, now);     // 3
    layerScene(d, p, now);      // 4
    layerWeather(p, now);       // 5

    document.documentElement.style.setProperty('--p', p.toFixed(3));
    // nav contrast: brighten to white as we scroll up into dark sky
    const navMix = sm(0.15, 0.55, p);
    if (!curPal.night) {
      // blend nav text toward white when sky darkens
      const base = T.parseRgba(curPal.navText);
      const white = [255, 255, 255, 1];
      const r = Math.round(base[0] + (white[0] - base[0]) * navMix);
      const g = Math.round(base[1] + (white[1] - base[1]) * navMix);
      const b = Math.round(base[2] + (white[2] - base[2]) * navMix);
      document.documentElement.style.setProperty('--nav-text-live', 'rgb(' + r + ',' + g + ',' + b + ')');
      document.documentElement.style.setProperty('--nav-halo-live',
        navMix > 0.4 ? '0 1px 8px rgba(0,0,0,0.45)' : curPal.navHalo);
    } else {
      document.documentElement.style.setProperty('--nav-text-live', curPal.navText);
      document.documentElement.style.setProperty('--nav-halo-live', curPal.navHalo);
    }

    if (!reduced) {
      document.querySelectorAll('.rv').forEach(el => {
        const r = el.getBoundingClientRect();
        el.classList.toggle('in', r.top < H * 0.9 && r.bottom > H * 0.1);
      });
    } else {
      document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
    }
    needsPaint = false;
  }

  function loop() {
    paint();
    if (!reduced) rafId = requestAnimationFrame(loop);
  }

  function requestPaint() {
    needsPaint = true;
    if (reduced) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => paint());
    }
  }

  function setReduced(on) {
    reduced = on;
    document.documentElement.classList.toggle('reduced-motion', on);
    if (on) {
      cancelAnimationFrame(rafId);
      // freeze: one static paint
      blendT = 1;
      paint();
    } else {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }
  }

  // events
  addEventListener('resize', () => { initScene(); requestPaint(); });
  addEventListener('mousemove', e => { mx = e.clientX / W; my = e.clientY / H; if (reduced) requestPaint(); });
  addEventListener('touchmove', e => { mx = e.touches[0].clientX / W; my = e.touches[0].clientY / H; if (reduced) requestPaint(); }, { passive: true });
  addEventListener('scroll', () => { if (reduced) requestPaint(); }, { passive: true });
  addEventListener('click', e => {
    if (e.target.closest('a,.card,#az-theme-wrap')) return;
    const p = prog();
    if (p > 0.45) {
      for (let i = 0; i < 3; i++) shoot.push({ x: e.clientX, y: e.clientY, vx: rnd(-9, -4), vy: rnd(2, 5), l: 60 });
    } else {
      ripples.push({ x: e.clientX, y: e.clientY, r: 0 });
    }
    if (reduced) requestPaint();
  });

  // reduced motion media
  const mql = matchMedia('(prefers-reduced-motion: reduce)');
  setReduced(mql.matches);
  if (mql.addEventListener) mql.addEventListener('change', e => setReduced(e.matches));
  else if (mql.addListener) mql.addListener(e => setReduced(e.matches));

  // wire weather
  function applySnap(s) {
    startBlend(s.time, s.weather, s.windFactor);
    if (reduced) requestPaint();
  }

  // initial palette from synchronous clock (weather module already set state)
  const snap0 = WX.getSnapshot();
  curPal = T.clonePal(T.PALETTES[snap0.time] || T.PALETTES.sunset);
  toPal = curPal; fromPal = curPal;
  curWx = Object.assign({}, T.WEATHER_MOD[snap0.weather] || T.WEATHER_MOD.clear);
  toWx = curWx; fromWx = curWx;
  curWind = snap0.windFactor; toWind = curWind; fromWind = curWind;
  T.applyCss(curPal, curWx);

  WX.onChange(applySnap);
  WX.init();

  initScene();
  scrollTo(0, 1e6);
  addEventListener('load', () => scrollTo(0, 1e6));
  if (!reduced) rafId = requestAnimationFrame(loop);
  else paint();

  root.AztecaEngine = { requestPaint, paint, setReduced };
})(typeof window !== 'undefined' ? window : global);
