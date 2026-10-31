/* Clic 24 · PARTE SIETE · Cierre (#cierre), sin dependencias. Solo transform/opacity.
   PC (scroll, u = recorrido desde que la escena se fija, en alturas de pantalla):
     0.00–1.05  la cámara avanza hacia la cerradura hasta entrar por el ojo de la llave
     0.90–1.30  aparece el mecanismo (pistones, muelles, cilindro)
     1.15–2.15  las letras del titular encajan una a una como pistones (y los pistones se alinean)
     ≥ 2.22     sacudida y estallido (por tiempo): piezas hacia el espectador → .abierto
     Marcha atrás (punto 6): al subir tras el estallido se revierte al instante (vuelven cerradura y mecanismo) y el
     scroll vuelve a mandar en sentido inverso; al bajar de nuevo pasado 2.22 el estallido se repite igual.
   Móvil: la misma secuencia por tiempo al entrar la escena en pantalla; al salir por abajo (subiendo) se reinicia.
   Movimiento reducido: estado final directo (texto y botones, sin cerradura). */
(() => {
  const sec = document.querySelector('.cierre');
  if (!sec) return;
  const $ = s => sec.querySelector(s);
  const escena = $('.cierre__escena'), zoom = $('.cerradura'), puerta = $('.cierre__puerta'), meca = $('.cierre__meca');
  const contenido = $('.cierre__contenido'), titulo = $('.cierre__titulo'), frags = $('.cierre__fragmentos');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido || !Element.prototype.animate) { sec.classList.add('abierto'); return; }

  // titular: copia accesible + letras visuales
  const sr = document.createElement('span'); sr.className = 'cierre__sr'; sr.textContent = titulo.textContent.replace(/\s+/g, ' ').trim();
  const letras = [];
  titulo.querySelectorAll('.cierre__frase').forEach(fr => {
    const txt = fr.textContent; fr.textContent = ''; fr.setAttribute('aria-hidden', 'true');
    txt.split(' ').forEach((w, wi, arr) => {
      const pal = document.createElement('span'); pal.className = 'cierre__palabra';
      for (const ch of w) { const l = document.createElement('span'); l.className = 'cierre__letra'; l.textContent = ch; pal.appendChild(l); letras.push(l); }
      fr.appendChild(pal); if (wi < arr.length - 1) fr.appendChild(document.createTextNode(' '));
    });
  });
  titulo.prepend(sr);
  const N = letras.length;
  const pilas = [...sec.querySelectorAll('.meca__pila')].map(g => ({
    muelle: g.querySelector('.meca__muelle'), driver: g.querySelector('.meca__driver'), llavin: g.querySelector('.meca__llavin') }));

  sec.classList.add('cierre--anima');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  // encaje: baja acelerando y rebota un poco al asentarse
  const encaje = f => f < .78 ? Math.pow(f / .78, 2) : 1 + Math.sin((f - .78) / .22 * Math.PI) * .09;

  let dy = 0;
  const mide = () => {
    contenido.style.transform = 'none';
    const r = titulo.getBoundingClientRect(), e = escena.getBoundingClientRect();
    dy = (e.top + e.height / 2) - (r.top + r.height / 2);
    if (!sec.classList.contains('abierto')) contenido.style.transform = `translateY(${dy}px)`;
  };

  let estallado = false, puedeEstallar = true;
  function pinta(u) {
    if (estallado) return;
    const z = tramo(u, 0, 1.05);
    zoom.style.transform = `scale(${Math.pow(60, z * z).toFixed(4)})`;
    zoom.style.opacity = u > 1.12 ? 0 : 1;
    puerta.style.transform = `scale(${(1 + .3 * z).toFixed(4)})`;
    puerta.style.opacity = (1 - tramo(u, .55, 1)).toFixed(3);
    const m = suave(tramo(u, .9, 1.3));
    meca.style.opacity = tramo(u, .9, 1.2).toFixed(3);
    meca.style.transform = `scale(${(1.35 - .35 * m).toFixed(4)})`;
    const L = tramo(u, 1.15, 2.15) * N;
    letras.forEach((l, i) => {
      const f = clamp(L - i);
      l.style.opacity = Math.min(1, f * 3).toFixed(3);
      l.style.transform = f >= 1 ? 'none' : `translateY(${(-(1 - encaje(f)) * .8).toFixed(3)}em)`;
      if (f >= 1) { if (!l.dataset.ok) { l.dataset.ok = 1; l.classList.add('encaja'); } }
      else if (l.dataset.ok) { delete l.dataset.ok; l.classList.remove('encaja'); }
    });
    const S = pilas.length, prog = L / N;
    pilas.forEach((p, j) => {
      const g = encaje(clamp(prog * S - j));
      p.driver.style.transform = `translateY(${(-44 * g).toFixed(2)}px)`;
      p.muelle.style.transform = `scaleY(${(1 - .17 * g).toFixed(4)})`;
      p.llavin.style.transform = `translateY(${(30 * g).toFixed(2)}px)`;
    });
    if (u >= 2.22 && puedeEstallar) estalla();
  }

  // piezas del estallido
  const tipos = [];
  for (let i = 0; i < 18; i++) tipos.push('pin');
  for (let i = 0; i < 20; i++) tipos.push('esquirla');
  for (let i = 0; i < 8; i++) tipos.push('muelle');
  for (let i = 0; i < 14; i++) tipos.push('chispa');
  const muelleSVG = '<svg viewBox="0 0 28 70"><path d="M14 2 L3 8 L25 15 L3 22 L25 29 L3 36 L25 43 L3 50 L25 57 L3 64 L14 68" fill="none" stroke="#D9D4C8" stroke-width="3" stroke-linejoin="round"/></svg>';
  const piezas = tipos.map((t, i) => {
    const d = document.createElement('span'); d.className = 'frag frag--' + t;
    if (t === 'muelle') d.innerHTML = muelleSVG;
    if (t === 'esquirla') {
      const r = () => (Math.random() * 30).toFixed(0) + '%';
      d.style.clipPath = `polygon(${r()} 0, 100% ${r()}, ${100 - Math.random() * 30}% 100%, 0 ${70 - Math.random() * 40}%)`;
      d.style.transform = 'scale(' + (.5 + Math.random() * .9).toFixed(2) + ')';
    }
    frags.appendChild(d); return d;
  });

  function estalla() {
    if (estallado) return; estallado = true;
    const W = escena.clientWidth, H = escena.clientHeight, movil = W < 760;
    escena.animate([
      { transform: 'none' }, { transform: 'translate(-6px,3px) rotate(-.3deg)' }, { transform: 'translate(7px,-4px) rotate(.35deg)' },
      { transform: 'translate(-5px,-2px)' }, { transform: 'translate(4px,4px) rotate(.2deg)' }, { transform: 'translate(-2px,1px)' }, { transform: 'none' }
    ], { duration: 300, easing: 'linear' });
    meca.animate([
      { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' },
      { offset: .3, opacity: 1, transform: 'scale(1.03)', filter: 'brightness(1.8)' },
      { opacity: 0, transform: 'scale(1.6)', filter: 'brightness(1.2)' }
    ], { duration: 820, delay: 260, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    piezas.forEach((d, i) => {
      const t = tipos[i];
      const sx = (Math.random() - .5) * W * .8, sy = (Math.random() - .5) * H * .45;
      const ang = Math.atan2(sy, sx || 1), dist = (movil ? .5 : .55) * Math.max(W, H) * (.45 + Math.random() * .75);
      const ex = sx + Math.cos(ang) * dist, ey = sy + Math.sin(ang) * dist + H * .15;
      const ez = 60 + Math.random() * 380, rx = (Math.random() - .5) * 900, ry = (Math.random() - .5) * 900, rz = (Math.random() - .5) * 720;
      const s0 = d.style.transform || '';
      const dur = (t === 'chispa' ? 900 : 1500) + Math.random() * 600;
      d.animate([
        { opacity: 0, transform: `translate3d(${sx}px,${sy}px,0) ${s0}` },
        { offset: .08, opacity: 1 },
        { offset: .75, opacity: 1 },
        { opacity: 0, transform: `translate3d(${ex}px,${ey}px,${ez}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) ${s0}` }
      ], { duration: dur, delay: 280 + Math.random() * 90, easing: 'cubic-bezier(.22,.6,.35,1)', fill: 'backwards' });
    });
    tFin = setTimeout(() => {
      tFin = null;
      sec.classList.add('abierto');
      contenido.style.transform = 'none';
      letras.forEach(l => { l.style.opacity = 1; l.style.transform = 'none'; });
    }, 300);
  }

  // punto 6: deshacer el estallido (rápido, sin tocar cómo se ve al bajar) y volver al estado ligado al scroll
  let tFin = null;
  function revierte() {
    if (!estallado) return;
    clearTimeout(tFin); tFin = null;
    [escena, meca, ...piezas].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    sec.classList.remove('abierto');
    contenido.style.transition = 'none';
    estallado = false;
    mide();
    void contenido.offsetWidth;
    requestAnimationFrame(() => { contenido.style.transition = ''; });
  }

  if (matchMedia('(max-width:760px)').matches) {
    // móvil: por tiempo al entrar
    pinta(0); requestAnimationFrame(mide);
    let corriendo = false;
    const io = new IntersectionObserver(es => {
      const e = es[es.length - 1];
      // subiendo: la escena ya no se ve y queda por debajo → se reinicia para repetir al volver a bajar
      if (!e.isIntersecting) {
        if (e.boundingClientRect.top > 0 && (estallado || corriendo)) { corriendo = false; revierte(); pinta(0); }
        return;
      }
      if (e.intersectionRatio < .55 || corriendo || estallado) return;
      corriendo = true;
      const t0 = performance.now();
      const paso = ahora => {
        if (!corriendo) return;
        const t = ahora - t0;
        const u = t < 1300 ? (t / 1300) * 1.05 : 1.05 + ((t - 1300) / 2600) * 1.17;
        pinta(u); if (!estallado) requestAnimationFrame(paso); else corriendo = false;
      };
      requestAnimationFrame(paso);
    }, { threshold: [0, .55] });
    io.observe(escena);
  } else {
    let pend = false, uAnt = null, uMax = 0;
    const lee = () => {
      pend = false;
      const u = (scrollY - (sec.getBoundingClientRect().top + scrollY)) / innerHeight;
      if (estallado) {
        // subiendo tras el estallido (más de un toque de rueda y aún en la escena fijada): marcha atrás
        uMax = Math.max(uMax, u);
        if (uMax - u > .06 && u < 3.02) { revierte(); puedeEstallar = false; }
      }
      // tras una marcha atrás solo vuelve a estallar bajando (o al quedar por debajo de 2.22)
      if (!estallado) {
        if (u < 2.22 || (uAnt !== null && u > uAnt)) puedeEstallar = true;
        pinta(u);
        if (estallado) uMax = u;
      }
      uAnt = u;
    };
    addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(lee); } }, { passive: true });
    addEventListener('resize', () => { if (!estallado) { mide(); lee(); } });
    mide(); lee();
    document.fonts && document.fonts.ready.then(() => { if (!estallado) mide(); });
  }
})();
