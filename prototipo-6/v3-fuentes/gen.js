/* Build prototipo-6-dinamico.html from v3 modules — does NOT touch prototipo-1..5 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const themes = fs.readFileSync(path.join(__dirname, 'themes.js'), 'utf8');
const weather = fs.readFileSync(path.join(__dirname, 'weather.js'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
const ph = s => `<span class="ph">[PLACEHOLDER: ${s}]</span>`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AztecaWeb · Prototipo 6 · Tema dinámico (hora + clima)</title>
<style>
*{box-sizing:border-box;margin:0}
html{scroll-behavior:auto}
body{
  font-family:'Trebuchet MS',Helvetica,sans-serif;
  color:var(--card-text,#1d1b33);
  overflow-x:hidden;
  background:#05030f;
}
#bg{position:fixed;inset:0;width:100vw;height:100vh;z-index:0}
.ph{outline:2px dashed #e00;color:#d00;background:rgba(255,255,255,.9);padding:0 4px;font-size:.8em;font-family:Arial,sans-serif;font-weight:normal}

nav{
  position:fixed;top:0;left:0;right:0;z-index:20;
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 4vw;
  background:var(--nav-bg,rgba(255,255,255,.28));
  backdrop-filter:blur(8px);
  transition:background .5s,color .5s;
}
nav b{
  font-size:22px;
  color:var(--nav-text-live,var(--nav-text,#142033));
  text-shadow:var(--nav-halo-live,var(--nav-halo,0 1px 8px rgba(255,255,255,.85)));
  transition:color .5s,text-shadow .5s;
}
nav b i{color:var(--accent,#0b8f9e);font-style:normal}
nav a{
  margin-left:16px;
  color:var(--nav-text-live,var(--nav-text,#142033));
  text-decoration:none;font-size:14px;
  text-shadow:var(--nav-halo-live,var(--nav-halo,0 1px 8px rgba(255,255,255,.85)));
  transition:color .5s;
}
.btn,nav .cta{
  display:inline-block;
  background:var(--accent,#0b8f9e);
  color:var(--accent-text,#fff);
  padding:11px 20px;border-radius:30px;font-weight:bold;
  text-decoration:none;text-shadow:none;
  transition:transform .2s,background .5s,color .5s;
}
.btn:hover,nav .cta:hover{transform:translateY(-3px) scale(1.04)}

main{position:relative;z-index:5}
section{min-height:100vh;display:flex;align-items:center;padding:12vh 5vw;position:relative}
.card{
  background:var(--card-bg,rgba(255,255,255,.86));
  color:var(--card-text,#142033);
  border:var(--card-border,1px solid rgba(20,32,51,.08));
  border-radius:22px;padding:26px;max-width:480px;
  backdrop-filter:blur(8px);
  box-shadow:0 20px 60px rgba(0,0,0,.2);
  transition:transform .35s,box-shadow .35s,background .5s,color .5s,border .5s;
}
.card:hover{transform:translateY(-8px)}
.rv{opacity:0;transform:translateY(40px);transition:opacity .8s,transform .8s}
.rv.in{opacity:1;transform:none}
h1{font-size:clamp(40px,6vw,80px);line-height:1}
h2{font-size:clamp(26px,3.5vw,44px);margin-bottom:10px}
p{line-height:1.5;margin:8px 0}
.tag{letter-spacing:3px;font-size:12px;text-transform:uppercase;opacity:.85}
#hero{height:100vh;align-items:center}
.svcs{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;width:100%}
.svcs .card{width:290px}
.ico{font-size:34px}
#galaxy,#vision{justify-content:center;text-align:center}
#galaxy .card,#vision .card{
  background:var(--upper-card-bg,rgba(15,10,35,.5));
  color:var(--upper-card-text,#fff);
  border:1px solid rgba(255,255,255,.25);
}
.meter{
  position:fixed;right:18px;top:50%;transform:translateY(-50%);
  z-index:20;width:4px;height:160px;background:rgba(255,255,255,.3);border-radius:4px;
}
.meter i{position:absolute;bottom:0;left:0;right:0;height:calc(var(--p)*100%);background:var(--accent,#ff7a3d);border-radius:4px}
.hint{
  position:fixed;left:50%;bottom:16px;transform:translateX(-50%);
  z-index:20;color:#fff;font-size:13px;
  opacity:calc(1 - var(--p)*8);
  animation:b 1.5s infinite;
  text-shadow:0 1px 6px #000;
  pointer-events:none;
}
@keyframes b{50%{bottom:24px}}

/* Theme control pill — bottom-left, clear of nav / meter / hint */
#az-theme-wrap{
  position:fixed;left:14px;bottom:14px;z-index:40;
  font-family:'Trebuchet MS',Helvetica,sans-serif;
}
#az-theme-pill{
  appearance:none;border:1px solid rgba(255,255,255,.28);
  background:rgba(8,18,28,.72);color:#e8fff8;
  backdrop-filter:blur(10px);
  border-radius:999px;padding:8px 14px;font-size:12px;
  cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);
  max-width:min(92vw,360px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
#az-theme-pill:hover{background:rgba(8,18,28,.88)}
#az-theme-panel{
  position:absolute;left:0;bottom:46px;
  width:min(92vw,300px);
  background:rgba(6,16,26,.94);color:#e8fff8;
  border:1px solid rgba(47,255,192,.25);
  border-radius:16px;padding:12px;
  box-shadow:0 16px 40px rgba(0,0,0,.45);
  backdrop-filter:blur(14px);
}
#az-theme-panel[hidden]{display:none!important}
.az-row{font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.7;margin:8px 0 6px}
.az-head{font-size:13px;letter-spacing:0;text-transform:none;opacity:1;font-weight:bold;margin-top:0}
.az-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.az-chip,.az-opt{
  appearance:none;border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.06);color:#e8fff8;
  border-radius:10px;padding:8px 8px;font-size:12px;cursor:pointer;text-align:left;
}
.az-chip.on,.az-opt.on{border-color:rgba(47,255,192,.7);background:rgba(47,255,192,.16)}
.az-opt{width:100%;margin-bottom:4px}
.az-geo{margin-top:8px}
.az-meta{font-size:10px;opacity:.6;margin-top:8px;line-height:1.3}

@media(max-width:700px){
  nav a:not(.cta){display:none}
  #hero{align-items:flex-start;padding-top:72px}
  #hero .card{padding:16px;max-width:none}
  #hero h1{font-size:40px}
  #hero p{margin:4px 0;font-size:14px}
  section{padding:10vh 5vw}
  .meter{display:none}
  #az-theme-wrap{left:10px;bottom:10px}
  #az-theme-pill{font-size:11px;padding:7px 11px;max-width:78vw}
  .hint{bottom:58px} /* keep above pill on mobile */
}

@media(prefers-reduced-motion:reduce){
  .rv{opacity:1;transform:none;transition:none}
  .hint{animation:none}
  .btn:hover,nav .cta:hover,.card:hover{transform:none}
}
html.reduced-motion .rv{opacity:1;transform:none}
html.reduced-motion .hint{animation:none}
</style>
</head>
<body>
<canvas id="bg"></canvas>
<nav>
  <b>Azteca<i>Web</i></b>
  <div>
    <a href="#servicios">Servicios</a>
    <a href="#vision">Visión</a>
    <a class="cta" href="#galaxy">Contacto</a>
  </div>
</nav>
<div class="meter"><i></i></div>
<div class="hint">↑ desliza hacia arriba</div>
<main>
<section id="galaxy">
  <div class="card rv">
    <p class="tag">Contacto</p>
    <h2>Hasta las galaxias</h2>
    <p>AztecaWeb — desarrollo de sistemas, Web3 e IA.</p>
    <p>${ph('datos de contacto')}</p>
    <a class="btn" href="#">${ph('CTA final')}</a>
    <p style="font-size:12px;opacity:.7">Mueve el cursor: la galaxia te sigue · clic: estrella fugaz</p>
  </div>
</section>
<section id="vision">
  <div class="card rv">
    <p class="tag">Visión</p>
    <h2>Más allá del cielo</h2>
    <p>${ph('texto de visión / misión')}</p>
  </div>
</section>
<section id="servicios" style="min-height:130vh">
  <div class="svcs">
    <div class="card rv"><div class="ico">⚙️</div><h2>Sistemas</h2><p>Desarrollo de sistemas.</p><p>${ph('descripción')}</p></div>
    <div class="card rv"><div class="ico">⛓️</div><h2>Web3</h2><p>Soluciones Web3.</p><p>${ph('descripción')}</p></div>
    <div class="card rv"><div class="ico">🧠</div><h2>IA</h2><p>Inteligencia artificial.</p><p>${ph('descripción')}</p></div>
  </div>
</section>
<section id="hero">
  <div class="card">
    <p class="tag">Desarrollo de sistemas · Web3 · IA</p>
    <h1>AztecaWeb</h1>
    <p>${ph('eslogan / propuesta de valor')}</p>
    <a class="btn" href="#galaxy">${ph('CTA principal')}</a>
  </div>
</section>
</main>
<script>
${themes}
${weather}
${engine}
</script>
</body>
</html>`;

const out = path.join(root, 'prototipo-6-dinamico.html');
fs.writeFileSync(out, html);
console.log('Wrote', out, '(' + html.length + ' bytes)');
