/* Clic 24 · PARTE CUATRO BIS · «Conócenos» (#conocenos), sin dependencias. Solo transform/opacity (y currentTime del vídeo).
   PC (u = recorrido desde que la sección toca el borde superior, en alturas de pantalla; scroll suavizado como caja.js):
    -0.15–0.20  el plano aparece difuminado mientras el halo de .tarjetas baja (la escena se contrarresta: no entra como bloque)
     0.00–0.25  kicker «Conócenos» y H2 «El del clic»
     0.05–1.55  vídeo 0 → 8,04 s con el scroll (conocenos-cerrajero-scroll.mp4, todo fotogramas clave)
     ~0.90      el chasquido (4,55 s): aro de latón en los dedos
     0.93–1.30  la tarjeta de presentación salta a la derecha (muelle con rebote) y se rellena: nombre, dato, frase, micro
     1.85–2.25  salida: plano y tarjeta se apagan; el halo baja al borde inferior y lo recoge el bloque de confianza
   Móvil: sin pin. conocenos-cerrajero.mp4 se reproduce una vez al entrar; en el clic salta la tarjeta.
   Movimiento reducido: no hace nada (CSS: último fotograma + tarjeta). */
(() => {
  const sec = document.querySelector('.conocenos');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = s => sec.querySelector(s);
  const esMovil = matchMedia('(max-width: 760px)');
  const fijo = $('.conocenos__fijo'), medio = $('.conocenos__medio'), video = $('.conocenos__video'), final = $('.conocenos__final');
  const halo = $('.conocenos__halo'), clic = $('.conocenos__clic'), tarjeta = $('.conocenos__tarjeta');
  const destello = $('.conocenos__destello'); // punto 5: destello dorado de salida hacia el bloque de confianza

  const DUR = 8.04, T_CLIC = 4.55, T_TARJETA = 4.75;
  const DEDOS = [0.455, 0.5];        // yema de los dedos en el chasquido (fotograma normalizado)
  const ASPECTO = 1920 / 1088;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  const mezcla = (a, b, t) => a + (b - a) * t;
  // muelle amortiguado: 0 → 1 con rebote
  const muelle = p => p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-5.2 * p) * Math.cos(10.5 * p) * (1 - p) - 0 * p;
  const set = (k, v) => sec.style.setProperty(k, (+v).toFixed(4));

  sec.classList.add('conocenos--anima');

  // posición en pantalla de un punto del fotograma con object-fit: cover
  const enPantalla = (f, posX, posY) => {
    const w = medio.clientWidth, h = medio.clientHeight;
    let W, H; if (w / h > ASPECTO) { W = w; H = w / ASPECTO; } else { H = h; W = h * ASPECTO; }
    return [(w - W) * posX + f[0] * W, (h - H) * posY + f[1] * H];
  };
  const pintaClic = a => {
    if (a <= 0 || a >= 1) { clic.style.opacity = 0; return; }
    // encuadre del plano según el CSS (object-position; en tablet vertical se centra en el cerrajero)
    const m = esMovil.matches, op = getComputedStyle(final).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const [x, y] = enPantalla(DEDOS, isFinite(op[0]) ? op[0] : (m ? .25 : 0), isFinite(op[1]) ? op[1] : (m ? .5 : .42));
    clic.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${mezcla(.15, 1.6, Math.sqrt(a)).toFixed(3)})`;
    clic.style.opacity = (Math.min(1, a * 6) * (1 - a)).toFixed(3);
  };
  const pintaTarjeta = (tj, t) => {
    set('--tj', tj);
    set('--p1', suave(tramo(t, 0.05, 0.3)));
    set('--p2', suave(tramo(t, 0.22, 0.48)));
    set('--p3', suave(tramo(t, 0.4, 0.68)));
    set('--p4', suave(tramo(t, 0.58, 0.82)));
    set('--brillo', suave(tramo(t, 0.1, 0.75)));
    tarjeta.style.visibility = tj > 0.001 ? 'visible' : 'hidden';
  };

  // ---------- vídeo ----------
  let fuente = '', duracion = 0, ultimoT = -1;
  const elegirFuente = () => {
    const f = esMovil.matches ? video.dataset.movil : video.dataset.pc;
    if (f === fuente) return;
    fuente = f; video.preload = 'auto'; video.src = f; video.load(); ultimoT = -1;
  };
  video.addEventListener('loadedmetadata', () => { duracion = video.duration || DUR; if (!esMovil.matches) video.pause(); });
  const ioCarga = new IntersectionObserver(e => { if (e[0].isIntersecting) { elegirFuente(); ioCarga.disconnect(); } }, { rootMargin: '150% 0px' });
  ioCarga.observe(sec);

  // ---------- PC: scroll ----------
  const pintarPC = u => {
    const vh = innerHeight;
    // mientras la escena aún sube, se contrarresta: el plano se queda en su sitio y solo aparece (sin borde de bloque)
    fijo.style.transform = u < 0 ? `translate3d(0,${(u * vh).toFixed(1)}px,0)` : 'none';
    const salida = suave(tramo(u, 1.85, 2.25));
    set('--v', suave(tramo(u, -.15, .2)) * (1 - salida));
    set('--cab', suave(tramo(u, 0, .25)) * (1 - salida));
    const t = DUR * tramo(u, .05, 1.55);
    final.style.opacity = u >= 1.55 ? 1 : 0;
    // halo: llega de .tarjetas (abajo), se queda tenue detrás de la tarjeta y al salir baja al borde inferior
    const hy = mezcla(mezcla(.3, 0, suave(tramo(u, -.35, .2))), .5, salida) * vh;
    const hx = mezcla(0, innerWidth * .22, suave(tramo(u, .9, 1.3)) * (1 - salida));
    halo.style.transform = `translate3d(${hx.toFixed(1)}px,${hy.toFixed(1)}px,0) scale(${mezcla(1, .7, salida).toFixed(3)})`;
    halo.style.opacity = (suave(tramo(u, -.4, 0)) * mezcla(.75, .4, suave(tramo(u, .15, .6))) * (1 - suave(tramo(u, 2.05, 2.35)))
      + .35 * suave(tramo(u, .9, 1.2)) * (1 - salida)).toFixed(3);
    if (destello) {
      const d = tramo(u, 1.82, 2.32);
      destello.style.opacity = (.8 * Math.sin(Math.PI * d)).toFixed(3);
      destello.style.transform = `scale(${mezcla(.35, 1.05, suave(d)).toFixed(3)})`;
    }
    pintaClic(tramo(t, T_CLIC - .05, T_CLIC + .55));
    const pt = tramo(t, T_TARJETA, T_TARJETA + 1.9);
    pintaTarjeta(muelle(tramo(t, T_TARJETA, T_TARJETA + 1.1)) * (1 - salida), pt);
    if (duracion && video.readyState >= 1 && !video.seeking) {
      const tv = Math.min(t, duracion - .05);
      if (Math.abs(tv - ultimoT) > .008) { video.currentTime = tv; ultimoT = tv; }
    }
  };

  // ---------- móvil: por tiempo ----------
  let movilEstado = 'espera', tTarjeta0 = null;
  const pintarMovilTarjeta = ahora => {
    if (tTarjeta0 === null) tTarjeta0 = ahora;
    const s = (ahora - tTarjeta0) / 1000;
    pintaTarjeta(muelle(tramo(s, 0, 1.1)), tramo(s, 0, 1.9));
    return s < 1.95;
  };
  const bucleMovil = ahora => {
    if (!esMovil.matches) return;
    const t = video.currentTime || 0;
    pintaClic(tramo(t, T_CLIC - .05, T_CLIC + .55));
    let sigue = movilEstado === 'reproduce';
    if (t >= T_TARJETA || movilEstado === 'tarjeta') { movilEstado = movilEstado === 'reproduce' ? 'tarjeta' : movilEstado; sigue = pintarMovilTarjeta(ahora) || !video.ended; }
    if (sigue) requestAnimationFrame(bucleMovil);
  };
  const sinVideo = () => { // si el navegador no deja reproducir: último fotograma y tarjeta
    final.style.opacity = 1; video.style.opacity = 0; movilEstado = 'tarjeta'; requestAnimationFrame(bucleMovil);
  };
  const ioMovil = new IntersectionObserver(es => {
    if (!es[0].isIntersecting || !esMovil.matches || movilEstado !== 'espera') return;
    elegirFuente(); movilEstado = 'reproduce';
    const p = video.play();
    if (p && p.catch) p.catch(sinVideo);
    requestAnimationFrame(bucleMovil);
  }, { threshold: .45 });
  const iniciaMovil = () => {
    fijo.style.transform = 'none'; set('--v', 1); set('--cab', 1); final.style.opacity = 0;
    halo.style.transform = 'none'; halo.style.opacity = .45;
    if (movilEstado === 'espera') pintaTarjeta(0, 0);
    ioMovil.observe(medio);
  };

  // ---------- bucle PC ----------
  let objetivo = 0, actual = 0, visible = false;
  const leer = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    visible = r.top < vh * 1.5 && r.bottom > -vh * .3;
    objetivo = -r.top / vh;
  };
  const bucle = () => {
    if (!esMovil.matches) {
      actual += (objetivo - actual) * .1;
      // punto 5: cerca de soltar el pin el suavizado no puede quedarse atrás (si no, el plano sube como un bloque)
      const lim = .03 + .3 * (1 - tramo(objetivo, 2, 2.28));
      if (objetivo > 1.8 && Math.abs(objetivo - actual) > lim) actual = objetivo - Math.sign(objetivo - actual) * lim;
      if (Math.abs(objetivo - actual) < .0004) actual = objetivo;
      if (visible) pintarPC(actual);
    }
    requestAnimationFrame(bucle);
  };
  addEventListener('scroll', leer, { passive: true });
  addEventListener('resize', leer);
  const modo = () => { if (esMovil.matches) iniciaMovil(); else { video.loop = false; fuente && elegirFuente(); } };
  esMovil.addEventListener('change', modo);
  leer(); actual = objetivo; modo();
  if (!esMovil.matches) pintarPC(actual);
  requestAnimationFrame(bucle);
})();
