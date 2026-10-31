/* Clic 24 · PARTE DOS · escena de coches ligada al scroll (sin dependencias)
   Encadena con la cabecera: arranca del oro final (.fin-resplandor / "clic24:resplandor").
   Vídeo: Google Flow (img/coche/coche-scroll-*.mp4, 0 → 9 s): ganzúa en la cerradura de la puerta (0–3 s),
   la mano agarra la maneta (3 s), la puerta se abre (4–5 s) y deja ver el interior ámbar hasta el final.
   Tres planos con el mismo encuadre: fotograma 0 (coche-faros*.webp) → vídeo → último fotograma (coche-final*.webp).
   Recorrido de q (0 → 1) mientras .coche__pin está fijado:
     0.00–0.24  el oro de pantalla completa se recoge como un resplandor en la cerradura y abre el plano
     0.16–0.80  vídeo 0 → 9 s con el scroll; textos
     0.80–0.90  la luz ámbar del interior crece hasta llenar la pantalla (sin rayas)
     0.875–0.97 dentro de esa luz asoma la caja fuerte (inicio de la parte tres)
   Fin: con q ≥ 0.97 se añade .fin-faros a <html> y se emite "clic24:faros".
   La parte tres (js/caja.js) toma el relevo con el vídeo de la caja, cuyo primer fotograma es
   img/caja/caja-inicio.webp (la imagen que queda aquí a pantalla completa). */
(() => {
  const sec = document.querySelector('.coche');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const raiz = document.documentElement;
  const esMovil = matchMedia('(max-width: 760px)');
  const pin = sec.querySelector('.coche__pin');
  const marcoI = sec.querySelector('.coche__inicio-marco');
  const marcoF = sec.querySelector('.coche__fin-marco');
  const planos = [...sec.querySelectorAll('.coche__plano')];
  const video = sec.querySelector('.coche__video');
  const lienzo = sec.querySelector('.coche__luz');
  const ctx = lienzo.getContext('2d');
  const caja = sec.querySelector('.coche__caja');

  const ASPECTO = 1920 / 1088;
  const CERRADURA = [0.53, 0.51];  // bombín de la maneta (fotograma 0)
  const INTERIOR = [0.36, 0.56];   // salpicadero iluminado en ámbar (puerta abierta, PC)
  const INTERIOR_M = [0.8, 0.72];  // panel de cuero coñac de la puerta (puerta abierta, móvil)
  const T_FIN = 8.95;              // último instante que se recorre (= coche-final*.webp)
  const T_ABRE0 = 3.8, T_ABRE1 = 5.2; // la puerta se abre: la cámara (móvil) acompaña hacia el interior

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  const mezcla = (a, b, t) => a + (b - a) * t;
  const mezcla2 = (a, b, t) => [mezcla(a[0], b[0], t), mezcla(a[1], b[1], t)];

  // ---------- medidas y «cámara» ----------
  let vw = 0, vh = 0, W = 0, H = 0, diag = 0, dpr = 1;
  const medir = () => {
    vw = pin.clientWidth; vh = pin.clientHeight; diag = Math.hypot(vw, vh);
    if (vw / vh > ASPECTO) { W = vw; H = vw / ASPECTO; } else { H = vh; W = vh * ASPECTO; }
    for (const el of planos) { el.style.width = W + 'px'; el.style.height = H + 'px'; }
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    lienzo.width = Math.round(vw * dpr); lienzo.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  // coloca el punto f (normalizado del fotograma) en (sx, sy) con zoom z, sin dejar ver bordes
  const camara = (f, sx, sy, z) => {
    const Wz = W * z, Hz = H * z;
    const tx = clamp(sx - f[0] * Wz, vw - Wz, 0), ty = clamp(sy - f[1] * Hz, vh - Hz, 0);
    return { tx, ty, z, x: tx + f[0] * Wz, y: ty + f[1] * Hz };
  };
  const enPantalla = (c, f) => [c.tx + f[0] * W * c.z, c.ty + f[1] * H * c.z];
  const aplicar = (el, c) => { el.style.transform = `translate3d(${c.tx.toFixed(1)}px,${c.ty.toFixed(1)}px,0) scale(${c.z.toFixed(4)})`; };
  const mascara = (el, x, y, r, suavidad = .5) => {
    const v = r === null ? 'none' : `radial-gradient(circle at ${x.toFixed(0)}px ${y.toFixed(0)}px,#000 ${(r * suavidad).toFixed(0)}px,transparent ${Math.max(1, r).toFixed(0)}px)`;
    el.style.webkitMaskImage = v; el.style.maskImage = v;
  };

  // ---------- vídeo: se carga al acercarse ----------
  let fuente = '', duracion = 0, ultimoT = -1;
  const elegirFuente = () => {
    const f = esMovil.matches ? video.dataset.movil : video.dataset.pc;
    if (f === fuente) return;
    fuente = f; video.preload = 'auto'; video.src = f; video.load(); ultimoT = -1;
  };
  video.addEventListener('loadedmetadata', () => { duracion = video.duration || 9; video.pause(); });
  const io = new IntersectionObserver(e => { if (e[0].isIntersecting) { elegirFuente(); io.disconnect(); } }, { rootMargin: '150% 0px' });
  io.observe(sec);
  addEventListener('clic24:resplandor', elegirFuente, { once: true });
  esMovil.addEventListener('change', () => { if (fuente) elegirFuente(); });

  // ---------- luz (canvas, mezcla «screen»): solo resplandores radiales, nada de rayas ----------
  const ORO = '243,213,138', BLANCO = '255,244,214', LATON = '201,162,74', AMBAR = '255,196,120';
  const brillo = (x, y, r, a, rgbC = ORO, rgbB = ORO) => {
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgbC},${a})`); g.addColorStop(.25, `rgba(${rgbB},${a * .7})`);
    g.addColorStop(.6, `rgba(${LATON},${a * .22})`); g.addColorStop(1, `rgba(${LATON},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // ---------- pintado de un estado q ----------
  let enFin = false;
  const pintar = q => {
    const s = sec.style, movil = esMovil.matches;
    const tv = T_FIN * tramo(q, .16, .8);          // tiempo del vídeo que toca en este q
    const pan = suave(tramo(tv, T_ABRE0, T_ABRE1));  // la puerta se abre → mirada al interior

    // cámara: en móvil (plano vertical) seguimos la cerradura y luego el interior; en PC encuadre fijo con empuje lento
    const foco = movil ? mezcla2([0.53, 0.5], [0.8, 0.5], pan) : [0.5, 0.5];
    const z = 1 + .05 * suave(tramo(q, .1, .8)) + .1 * suave(tramo(q, .8, .97));
    const c = camara(foco, vw * .5, vh * (movil ? .42 : .5), z);
    for (const el of planos) aplicar(el, c);
    const [kx, ky] = enPantalla(c, CERRADURA), [ix, iy] = enPantalla(c, movil ? INTERIOR_M : INTERIOR);

    // 1 · llegada: el oro plano (::before) se retira y queda un resplandor que se recoge en la cerradura
    pin.style.setProperty('--c-oro0', (1 - suave(tramo(q, .01, .1))).toFixed(3));
    const rI = suave(tramo(q, 0, .12));   // puerta → coche: el plano se abre antes (relevo corto)
    mascara(marcoI, kx, ky, rI >= 1 ? null : mezcla(vh * .08, diag * 1.25, rI), .35);
    // puerta → coche (31/10/2026): con q = 0 el coche es idéntico al resplandor final de la cabecera (::before)
    // y aparece en el sitio (.activa); la luz de la cerradura florece (q 0 → .015) y el plano asoma tras ella.
    const florece = suave(tramo(q, 0, .015));
    marcoI.style.opacity = q < .5 ? suave(tramo(q, .004, .022)).toFixed(3) : '0'; // el fotograma 0 nunca vuelve al final (ni puerta cerrada)
    video.style.opacity = (suave(tramo(q, .1, .16))).toFixed(3);

    // 2 · fin: el último fotograma (idéntico al vídeo en T_FIN) asegura el plano bajo la luz
    marcoF.style.opacity = suave(tramo(q, .8, .84)).toFixed(3);

    ctx.clearRect(0, 0, vw, vh);
    const aL = florece * (1 - suave(tramo(q, .03, .18)));
    if (aL > 0) {
      brillo(kx, ky, mezcla(diag * 1.3, vh * .22, suave(tramo(q, 0, .2))), aL, BLANCO, ORO);
      brillo(kx, ky, mezcla(vh * .5, 26, suave(tramo(q, 0, .22))), aL * .9, BLANCO, BLANCO);
    }
    // la puerta se abre: un soplo de ámbar del interior (suave)
    const aA = Math.sin(Math.PI * tramo(tv, T_ABRE0, T_ABRE1 + .6)) * (q < .8 ? 1 : 0);
    if (aA > 0) brillo(ix, iy, vh * .9, .28 * aA, AMBAR, ORO);
    // 3 · salida: la luz ámbar del interior crece hasta llenar la pantalla
    const f1 = suave(tramo(q, .8, .9)), salida = 1 - suave(tramo(q, .91, .99));
    if (f1 > 0 && salida > 0) {
      brillo(ix, iy, mezcla(vh * .3, diag * 1.4, f1), salida * mezcla(.5, 1, f1), BLANCO, AMBAR);
      const ff = suave(tramo(q, .83, .89)) * salida;
      if (ff > 0) {
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, diag);
        g.addColorStop(0, `rgba(${BLANCO},${ff})`); g.addColorStop(.5, `rgba(${ORO},${ff})`); g.addColorStop(1, `rgba(228,193,113,${ff})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
      }
    }

    // viñeta: lleva la mirada a la cerradura y luego al interior; fuera en la luz final
    const vin = .7 * suave(tramo(q, .12, .22)) * (1 - suave(tramo(q, .78, .86)));
    s.setProperty('--c-vin', vin.toFixed(3));
    const [vx, vy] = mezcla2([kx, ky], [ix, iy], pan);
    s.setProperty('--vx', (vx / vw * 100).toFixed(1) + '%'); s.setProperty('--vy', (vy / vh * 100).toFixed(1) + '%');

    // textos
    const sale = 1 - suave(tramo(q, .78, .86));
    s.setProperty('--c-k', (suave(tramo(q, .14, .22)) * sale).toFixed(3));
    s.setProperty('--c-t', (suave(tramo(q, .5, .6)) * sale).toFixed(3));

    // caja fuerte: asoma dentro de la luz ámbar
    const rc = suave(tramo(q, .875, .97));
    caja.style.opacity = rc > 0 ? '1' : '0';
    mascara(caja, ix, iy, rc >= 1 ? null : rc * diag * 1.25, .5);
    caja.style.transform = `scale(${mezcla(1.12, 1, suave(tramo(q, .875, 1))).toFixed(4)})`;
    caja.style.transformOrigin = `${ix.toFixed(0)}px ${iy.toFixed(0)}px`;
    const bc = mezcla(2.4, 1, suave(tramo(q, .875, .99)));
    caja.style.filter = bc > 1.01 ? `brightness(${bc.toFixed(2)})` : 'none';

    // vídeo
    if (duracion && video.readyState >= 1 && !video.seeking) {
      const t = Math.min(tv, duracion - .05);
      if (Math.abs(t - ultimoT) > .008) { video.currentTime = t; ultimoT = t; }
    }

    // fin de la parte dos → enganche de la parte tres
    if (q >= .97 !== enFin) {
      enFin = !enFin; raiz.classList.toggle('fin-faros', enFin);
      if (enFin) dispatchEvent(new CustomEvent('clic24:faros'));
    }
  };

  // ---------- scroll suavizado ----------
  let objetivoQ = 0, actual = 0, visible = false;
  const leer = () => {
    const r = sec.getBoundingClientRect();
    visible = r.top < innerHeight * 1.2 && r.bottom > -innerHeight * .2;
    sec.classList.toggle('activa', r.top <= .5);   // relevo en el sitio: aparece justo cuando .cine suelta su pin
    objetivoQ = clamp(-r.top / ((sec.offsetHeight - pin.clientHeight) || 1));
  };
  addEventListener('scroll', leer, { passive: true });
  addEventListener('resize', () => { medir(); leer(); });
  medir(); leer(); actual = objetivoQ;
  addEventListener('touchstart', () => { if (fuente) video.play().then(() => video.pause()).catch(() => {}); }, { once: true, passive: true });

  const bucle = () => {
    actual += (objetivoQ - actual) * .1;
    if (Math.abs(objetivoQ - actual) < .0004) actual = objetivoQ;
    // punto 2: al final el suavizado no puede quedarse atrás (si no, el pin se suelta aún con el oro pintado)
    const lim = .02 + .18 * (1 - tramo(objetivoQ, .85, .97));
    actual = clamp(actual, objetivoQ - lim, objetivoQ + lim);
    if (visible) pintar(actual);
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
})();
