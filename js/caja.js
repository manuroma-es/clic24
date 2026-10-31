/* Clic 24 · PARTE TRES · cajas fuertes ligada al scroll (sin dependencias)
   Encadena con la parte dos: la caja fuerte que se abre en el destello de los faros es el primer
   fotograma de este vídeo (img/caja/caja-inicio.webp), así que el relevo es invisible.
   Recorrido de p (0 → 1) mientras .caja__pin está fijado:
     0.00–0.62  la mano gira la rueda: vídeo 0 → 6,6 s; anillo de latón y textos
     0.50–0.70  luz dorada que se cuela por la junta de la puerta (y el tirador) hasta llenar la pantalla
     0.705      bajo la luz, salto a la caja ya abierta (vídeo 7,3 s): el corte del vídeo queda tapado
     0.72–0.88  la luz se recoge hacia el interior y deja ver la caja abierta y dorada (7,3 → 7,95 s)
     0.88–1.00  la luz interior vuelve a llenar la pantalla y se funde a #0A0D14
   Fin: con p ≥ 0.99 se añade .fin-caja a <html> y se emite "clic24:caja". */
(() => {
  const sec = document.querySelector('.caja');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const raiz = document.documentElement;
  const esMovil = matchMedia('(max-width: 760px)');
  const pin = sec.querySelector('.caja__pin');
  const still = sec.querySelector('.caja__still');
  const video = sec.querySelector('.caja__video');
  const lienzo = sec.querySelector('.caja__luz');
  const ctx = lienzo.getContext('2d');
  const velo = sec.querySelector('.caja__velo');
  const oro = sec.querySelector('.caja__oro');
  const noche = sec.querySelector('.caja__noche');
  const giro = sec.querySelector('.caja__anillo-giro');
  const claves = [...sec.querySelectorAll('.caja__clave span')];

  const FW = 1920, FH = 1088;
  const T_RUEDA = 6.6;            // fin del tramo de la rueda (antes del salto del vídeo, ~6,7 s)
  const T_ABRE0 = 7.3, T_ABRE1 = 7.95;
  const CORTE = 0.705;            // p en que se cambia a la caja abierta (velo opaco)
  const JUNTA = [0.80, 0.50];     // junta derecha de la puerta (fotograma ~6,6 s)
  const TIRADOR = [0.52, 0.60];   // tirador de radios (fotograma ~6,6 s)
  const INTERIOR = [0.76, 0.47];  // centro del interior iluminado (caja abierta)

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  const mezcla = (a, b, t) => a + (b - a) * t;

  // ---------- anillo de latón (marcas finas, cada 10 un número) ----------
  (() => {
    const ns = 'http://www.w3.org/2000/svg'; let h = '<circle class="c" r="100"/><circle class="c" r="78"/>';
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * Math.PI * 2, m = i % 10 === 0, r1 = 100, r0 = m ? 90 : (i % 5 === 0 ? 93.5 : 96);
      const s = Math.sin(a), c = -Math.cos(a);
      h += `<line class="t${m ? ' t--m' : ''}" x1="${(s * r0).toFixed(2)}" y1="${(c * r0).toFixed(2)}" x2="${(s * r1).toFixed(2)}" y2="${(c * r1).toFixed(2)}"/>`;
      if (m) h += `<text class="n" x="${(s * 84).toFixed(2)}" y="${(c * 84).toFixed(2)}" transform="rotate(${i * 3.6} ${(s * 84).toFixed(2)} ${(c * 84).toFixed(2)})">${String(i).padStart(2, '0')}</text>`;
    }
    giro.innerHTML = h; void ns;
  })();

  // ---------- medidas: dónde cae un punto del fotograma en pantalla (object-fit: cover) ----------
  let vw = 0, vh = 0, diag = 0, dpr = 1;
  const medir = () => {
    vw = pin.clientWidth; vh = pin.clientHeight; diag = Math.hypot(vw, vh);
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    lienzo.width = Math.round(vw * dpr); lienzo.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const enPantalla = (f, posX, z = 1) => {
    const k = Math.max(vw / FW, vh / FH), W = FW * k, H = FH * k;
    const x = (vw - W) * posX + f[0] * W, y = (vh - H) * .5 + f[1] * H;
    return [vw / 2 + (x - vw / 2) * z, vh / 2 + (y - vh / 2) * z];
  };

  // ---------- vídeo: se carga al acercarse ----------
  // punto 3: el vídeo se descarga entero (blob) antes de usarlo. Con un servidor sin peticiones Range
  // (p. ej. un hosting estático sencillo) el <video> no podía saltar de tiempo, se quedaba en t = 0 y
  // solo se veía la imagen fija con zoom; al cambiar luego de tiempo, el salto. Hasta tener el primer
  // fotograma listo, el vídeo está transparente (opacity) y se ve caja-inicio.webp con la MISMA
  // transformación; cuando está listo aparece con un fundido corto sobre el mismo encuadre.
  let fuente = '', duracion = 0, ultimoT = -1, encuadre = '', listo = false, urlBlob = '';
  const ponerListo = v => { listo = v; video.style.opacity = v ? '1' : '0'; };
  ponerListo(false);
  const cargar = src => { video.preload = 'auto'; video.src = src; video.load(); ultimoT = -1; };
  const elegirFuente = () => {
    const f = esMovil.matches ? video.dataset.movil : video.dataset.pc;
    if (f === fuente) return;
    fuente = f; ponerListo(false); duracion = 0;
    fetch(f).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => {
      if (fuente !== f) return;
      if (urlBlob) URL.revokeObjectURL(urlBlob);
      urlBlob = URL.createObjectURL(b); cargar(urlBlob);
    }).catch(() => { if (fuente === f) cargar(f); });   // p. ej. file:// → como antes
  };
  video.addEventListener('loadedmetadata', () => { duracion = video.duration || 8; video.pause(); video.currentTime = 0; ultimoT = 0; });
  // listo cuando hay fotograma pintable y el vídeo puede ir a cualquier tiempo
  const comprobar = () => { if (!listo && video.readyState >= 2 && !video.seeking && video.seekable.length && video.seekable.end(0) > 7.9) ponerListo(true); };
  video.addEventListener('seeked', comprobar); video.addEventListener('loadeddata', comprobar); video.addEventListener('canplaythrough', comprobar);
  const io = new IntersectionObserver(e => { if (e[0].isIntersecting) { elegirFuente(); io.disconnect(); } }, { rootMargin: '250% 0px' });
  io.observe(sec);
  addEventListener('clic24:faros', elegirFuente, { once: true });
  esMovil.addEventListener('change', () => { if (fuente) elegirFuente(); });

  // ---------- luz (canvas, mezcla «screen») ----------
  const ORO = '243,213,138', BLANCO = '255,244,214', LATON = '201,162,74';
  const brillo = (x, y, r, a, rgbC = BLANCO) => {
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgbC},${a})`); g.addColorStop(.3, `rgba(${ORO},${a * .7})`);
    g.addColorStop(.65, `rgba(${LATON},${a * .22})`); g.addColorStop(1, `rgba(${LATON},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // luz que se cuela por la junta: franja vertical que se ensancha
  const junta = (x, a, ancho) => {
    if (a <= 0) return;
    const g = ctx.createLinearGradient(x - ancho, 0, x + ancho, 0);
    g.addColorStop(0, `rgba(${LATON},0)`); g.addColorStop(.38, `rgba(${ORO},${a * .45})`);
    g.addColorStop(.5, `rgba(${BLANCO},${a})`); g.addColorStop(.62, `rgba(${ORO},${a * .45})`); g.addColorStop(1, `rgba(${LATON},0)`);
    const gv = ctx.createLinearGradient(0, 0, 0, vh);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - ancho, 0, ancho * 2, vh);
    // halo blando alrededor de la línea
    gv.addColorStop(0, `rgba(${ORO},0)`); gv.addColorStop(.5, `rgba(${ORO},${a * .25})`); gv.addColorStop(1, `rgba(${ORO},0)`);
    ctx.fillStyle = gv; ctx.fillRect(x - ancho * 3, 0, ancho * 6, vh); ctx.restore();
  };

  // ---------- pintado de un estado p ----------
  let enFin = false;
  const pintar = p => {
    const s = sec.style, movil = esMovil.matches;
    const abierta = p >= CORTE;
    const posX = movil ? (abierta ? .74 : .62) : (abierta ? .62 : .6);
    const pos = `${posX * 100}% 50%`;
    if (pos !== encuadre) { encuadre = pos; video.style.objectPosition = pos; still.style.objectPosition = pos; still.src = abierta ? 'img/caja/caja-abierta' + (movil ? '-movil' : '') + '.webp' : 'img/caja/caja-inicio.webp'; }

    // «cámara»: empuje lento hacia la rueda; tras el corte, la luz nos echa hacia atrás; al final, entramos en la luz
    const z = abierta ? mezcla(1.08, 1, suave(tramo(p, CORTE, .88))) + .12 * suave(tramo(p, .88, 1))
                      : 1 + .07 * suave(tramo(p, 0, .66));
    const tz = `scale(${z.toFixed(4)})`;
    video.style.transform = tz; still.style.transform = tz;
    const bri = abierta ? mezcla(1.7, 1, suave(tramo(p, CORTE, .86))) : mezcla(1, 1.35, suave(tramo(p, .56, .7)));
    video.style.filter = Math.abs(bri - 1) > .01 ? `brightness(${bri.toFixed(2)})` : 'none';

    // luz
    ctx.clearRect(0, 0, vw, vh);
    const [jx] = enPantalla(JUNTA, posX, z), [tx, ty] = enPantalla(TIRADOR, posX, z);
    const juntaVisible = jx < vw * .96;
    const ox = juntaVisible ? jx : tx, oy = juntaVisible ? vh * .5 : ty;
    if (!abierta) {
      const v = suave(tramo(p, .5, .68));
      if (juntaVisible && listo) junta(jx, .95 * v, mezcla(2, vw * .55, v * v));   // punto 3: la junta solo existe en el vídeo (no sobre la imagen fija)
      brillo(tx, ty, mezcla(14, diag * .5, v * v), .85 * suave(tramo(p, .5, .6)));         // destello en el tirador al agarrarlo
      brillo(ox, oy, mezcla(40, diag * 1.1, v * v), v);
    } else {
      const [ix, iy] = enPantalla(INTERIOR, posX, z);
      const r = suave(tramo(p, CORTE, .88));
      brillo(ix, iy, mezcla(diag * 1.2, vh * .45, r), mezcla(1, .32, r));                 // la luz se recoge en el interior
      const f = suave(tramo(p, .86, .95));
      if (f > 0) brillo(ix, iy, mezcla(vh * .45, diag * 1.3, f), mezcla(.32, 1, f));       // y vuelve a salir hasta llenar la pantalla
      s.setProperty('--ix', (ix / vw * 100).toFixed(1) + '%'); s.setProperty('--iy', (iy / vh * 100).toFixed(1) + '%');
    }
    s.setProperty('--gx', (ox / vw * 100).toFixed(1) + '%'); s.setProperty('--gy', (oy / vh * 100).toFixed(1) + '%');
    // velo opaco que tapa el salto (cubre de .66 a .72)
    velo.style.opacity = (suave(tramo(p, .6, .69)) * (1 - suave(tramo(p, .72, .86)))).toFixed(3);
    // final: la luz interior llena la pantalla y se va a la noche
    oro.style.opacity = suave(tramo(p, .88, .95)).toFixed(3);
    noche.style.opacity = suave(tramo(p, .935, .995)).toFixed(3);

    // textos + anillo (en la zona oscura de la izquierda)
    const sale = 1 - suave(tramo(p, .48, .57));
    s.setProperty('--k-k', (suave(tramo(p, .03, .11)) * sale).toFixed(3));
    s.setProperty('--k-t', (suave(tramo(p, .08, .19)) * sale).toFixed(3));
    s.setProperty('--k-l', (suave(tramo(p, .14, .25)) * sale).toFixed(3));
    s.setProperty('--k-anillo', (suave(tramo(p, .02, .16)) * (1 - suave(tramo(p, .5, .6)))).toFixed(3));
    // giro: avance con pequeñas idas y vueltas, como la mano en la rueda
    const pr = tramo(p, 0, .62);
    s.setProperty('--k-giro', (-160 * pr + 22 * Math.sin(pr * Math.PI * 6)).toFixed(2) + 'deg');
    claves.forEach((c, i) => c.classList.toggle('on', pr > .3 + i * .25));

    // vídeo
    if (duracion && video.readyState >= 1 && !video.seeking) {
      const tv = abierta ? mezcla(T_ABRE0, Math.min(T_ABRE1, duracion - .05), tramo(p, CORTE, .9))
                         : T_RUEDA * tramo(p, 0, .62);
      if (Math.abs(tv - ultimoT) > .008) { video.currentTime = tv; ultimoT = tv; }
    }

    // fin de la parte tres → enganche de la siguiente sección
    if (p >= .99 !== enFin) {
      enFin = !enFin; raiz.classList.toggle('fin-caja', enFin);
      if (enFin) dispatchEvent(new CustomEvent('clic24:caja'));
    }
  };

  // ---------- scroll suavizado ----------
  let objetivoP = 0, actual = 0, visible = false;
  const leer = () => {
    const r = sec.getBoundingClientRect();
    visible = r.top < innerHeight * 1.2 && r.bottom > -innerHeight * .2;
    sec.classList.toggle('activa', r.top <= .5 && r.bottom > 0);   // aparece justo cuando .coche suelta su pin
    objetivoP = clamp(-r.top / ((sec.offsetHeight - pin.clientHeight) || 1));
  };
  addEventListener('scroll', leer, { passive: true });
  addEventListener('resize', () => { medir(); leer(); });
  medir(); leer(); actual = objetivoP;
  addEventListener('touchstart', () => { if (fuente) video.play().then(() => video.pause()).catch(() => {}); }, { once: true, passive: true });

  const bucle = () => {
    actual += (objetivoP - actual) * .1;
    if (Math.abs(objetivoP - actual) < .0004) actual = objetivoP;
    // punto 2: al volver hacia el coche, el estado no puede quedarse atrás (velo/oro rezagado sobre el relevo)
    const lim = .02 + .18 * tramo(objetivoP, 0, .1);
    actual = clamp(actual, objetivoP - lim, objetivoP + lim);
    if (visible) pintar(actual);
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
})();
