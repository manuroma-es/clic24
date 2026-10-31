/* Clic 24 · PARTE CINCO · bloque de confianza (#como-trabajamos), sin dependencias
   Mapa: js/mapa-cuenca.js (calles y ríos reales de Cuenca, © OpenStreetMap). Aquí solo se pinta y se anima.
   PC (scroll, u = recorrido desde que la sección toca el borde superior, en alturas de pantalla; mismo suavizado que caja.js):
    -0.30–0.42  relevo: el halo de .tarjetas baja y se recoge en el punto de luz de la llave (.confianza__foco)
     0.10–0.52  aparecen el mapa, la zona de servicio y los textos
     0.42–1.00  la ruta se dibuja y la llave la recorre (Carretería → Plaza Mayor)
     1.00–1.13  la llave gira 90° como cerrando, destello pequeño y «¡Hemos llegado!»
     1.10–1.35  salida: el destello se abre en un resplandor cálido (hacia «Partes resueltos»)
   Móvil: sin pin; ruta más corta y la misma secuencia en 3,6 s al entrar el mapa en pantalla.
   Movimiento reducido: estado final quieto (ruta dibujada, llave girada en destino). */
(() => {
  const sec = document.querySelector('.confianza');
  const D = window.MAPA_CUENCA;
  if (!sec || !D) return;

  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esMovil = matchMedia('(max-width: 760px)');
  const $ = s => sec.querySelector(s);
  const escena = $('.confianza__escena'), luz = $('.confianza__luz'), foco = $('.confianza__foco'), calor = $('.confianza__calor');
  const fig = $('.confianza__mapa'), svg = $('.mapa'), texto = $('.confianza__texto');
  const velo = $('.confianza__velo'); // punto 5: fundido del borde inferior al soltar el pin
  const ruta = $('.mapa__ruta'), brillo = $('.mapa__ruta-brillo'), plan = $('.mapa__plan');
  const zona = $('.mapa__zona'), zonaBorde = $('.mapa__zona-borde');
  const llave = $('.mapa__llave'), giroEl = $('.mapa__llave-giro'), destello = $('.mapa__destello'), llegado = $('.mapa__llegado');
  const pIni = $('.mapa__punto--inicio'), pFin = $('.mapa__punto--fin'), lIni = $('.mapa__lugar--inicio'), lFin = $('.mapa__lugar--fin');
  const halo = document.querySelector('.conocenos__halo') || document.querySelector('.tarjetas__halo'); // relevo: el halo llega de «Conócenos»

  // trazado base (datos reales de OSM)
  const capas = { 'rio-cauce': D.rio, rio: D.rio, agua: D.agua, cortado: D.cortado, senda: D.senda, menor: D.menor, mayor: D.mayor };
  for (const k in capas) $('.mapa__' + k).setAttribute('d', capas[k]);
  $('#etqJucar').setAttribute('d', D.etqJucar);
  $('#etqHuecar').setAttribute('d', D.etqHuecar);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  const mezcla = (a, b, t) => a + (b - a) * t;
  const tr = (el, x, y, extra = '') => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${extra}`; };

  let modo = '', L = 1, s = 1, x0 = 0, y0 = 0, fin = [0, 0], ini = [0, 0];
  const aPx = (x, y) => [(x - x0) * s, (y - y0) * s];

  const preparar = () => {
    modo = esMovil.matches ? 'movil' : 'pc';
    const d = modo === 'movil' ? D.rutaMovil : D.rutaPc;
    [ruta, brillo, plan].forEach(p => p.setAttribute('d', d));
    L = ruta.getTotalLength();
    [ruta, brillo].forEach(p => { p.style.strokeDasharray = `${L} ${L}`; });
    const b = ruta.getBBox();
    const w = svg.clientWidth || innerWidth, h = svg.clientHeight || innerHeight;
    let cx, cy;
    if (modo === 'pc') {
      s = Math.min(w * .42 / b.width, h * .52 / b.height);
      cx = w * .69; cy = h * .6;
      svg.style.setProperty('--mx', '69%'); svg.style.setProperty('--my', '53%');
    } else {
      s = Math.min(w, h) * .66 / Math.max(b.width, b.height);
      cx = w * .5; cy = h * .55;
    }
    x0 = b.x + b.width / 2 - cx / s; y0 = b.y + b.height / 2 - cy / s;
    svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${(w / s).toFixed(1)} ${(h / s).toFixed(1)}`);
    svg.style.setProperty('--u', (1 / s).toFixed(4));
    // zona de servicio: un círculo suave que abarca la ruta con margen
    const zx = b.x + b.width / 2, zy = b.y + b.height / 2, zr = Math.hypot(b.width, b.height) / 2;
    zona.setAttribute('cx', zx); zona.setAttribute('cy', zy); zona.setAttribute('r', zr * 1.9);
    zonaBorde.setAttribute('cx', zx); zonaBorde.setAttribute('cy', zy); zonaBorde.setAttribute('r', zr * 1.32);
    // marcas fijas
    const a = ruta.getPointAtLength(0), z = ruta.getPointAtLength(L);
    ini = aPx(a.x, a.y); fin = aPx(z.x, z.y);
    tr(pIni, ini[0], ini[1]); tr(pFin, fin[0], fin[1]);
    const dentro = (el, x) => clamp(x, 6, w - el.offsetWidth - 6);
    if (modo === 'pc') {
      tr(lIni, dentro(lIni, ini[0] - lIni.offsetWidth - 14), ini[1] - lIni.offsetHeight / 2);
      tr(lFin, dentro(lFin, fin[0] + 16), fin[1] + 4);
    } else {
      tr(lIni, dentro(lIni, ini[0] - lIni.offsetWidth / 2), ini[1] + 13);
      tr(lFin, dentro(lFin, fin[0] - lFin.offsetWidth / 2), fin[1] + 15);
    }
  };

  // la luz vive en .confianza__luz: convertir de coordenadas del mapa a las de la luz
  const enLuz = (p) => {
    const f = fig.getBoundingClientRect(), l = luz.getBoundingClientRect();
    return [p[0] + f.left - l.left, p[1] + f.top - l.top];
  };

  // estado común: p (ruta 0–1), giro, destello, llegado, calor, foco (desde/peso del relevo)
  const pintarRuta = (p, vis) => {
    const pt = ruta.getPointAtLength(L * p);
    const k = aPx(pt.x, pt.y);
    ruta.style.strokeDashoffset = brillo.style.strokeDashoffset = (L * (1 - p)).toFixed(1);
    tr(llave, k[0], k[1]);
    llave.style.opacity = vis.toFixed(3);
    return k;
  };
  const pintarLlegada = (giro, flash, rot, cal, kLuz) => {
    giroEl.style.setProperty('--giro', giro.toFixed(3));
    tr(destello, fin[0], fin[1], ` scale(${(.25 + 1.5 * flash).toFixed(3)})`);
    destello.style.opacity = (Math.sin(Math.PI * flash) * .95).toFixed(3);
    tr(llegado, clamp(fin[0] - llegado.offsetWidth / 2, 6, fig.clientWidth - llegado.offsetWidth - 6), fin[1] - 34 - llegado.offsetHeight - 10 * (1 - rot), ` scale(${mezcla(.9, 1, rot).toFixed(3)})`);
    llegado.style.opacity = rot.toFixed(3);
    lFin.style.setProperty("--fuera", rot.toFixed(3));
    const c = enLuz(fin);
    tr(calor, c[0], c[1], ` scale(${mezcla(.03, 1, cal).toFixed(3)})`);
    calor.style.opacity = (cal > 0 ? mezcla(.5, 1, cal) * Math.min(1, cal * 6) : 0).toFixed(3);
    sec.style.setProperty('--bg-warm', cal.toFixed(3));
  };
  const pintarFoco = (desde, peso, op, kLuz) => {
    // desde: [x, y, ancho, alto] en coords de la luz; peso 0 = como el halo, 1 = luz de la llave
    const x = mezcla(desde[0], kLuz[0], peso), y = mezcla(desde[1], kLuz[1], peso);
    const sx = mezcla(desde[2], 230, peso) / 1200, sy = mezcla(desde[3], 230, peso) / 800;
    tr(foco, x, y, ` scale(${sx.toFixed(4)},${sy.toFixed(4)})`);
    foco.style.opacity = op.toFixed(3);
  };
  const ponTexto = (vals) => {
    ['ek', 'et', 'ep', 'eb', 'eg'].forEach((n, i) => sec.style.setProperty('--' + n, vals[i].toFixed(3)));
    if (vals[0] < .02) texto.setAttribute('data-oculto', ''); else texto.removeAttribute('data-oculto');
  };
  const ponMapa = (em, ez) => { svg.style.setProperty('--em', em.toFixed(3)); fig.style.setProperty('--ez', ez.toFixed(3)); };

  // de dónde sale la luz: el halo de las tarjetas tal como está ahora en pantalla
  const origenHalo = () => {
    const l = luz.getBoundingClientRect();
    if (halo) {
      const r = halo.getBoundingClientRect();
      if (r.width > 0) return [r.left + r.width / 2 - l.left, r.top + r.height / 2 - l.top, r.width, r.height];
    }
    return [innerWidth / 2 - l.left, innerHeight * .98 - l.top, innerWidth * .9, innerHeight * .75];
  };

  // ---------- PC: scroll ----------
  const pintarPC = u => {
    const em = suave(tramo(u, .1, .42)), ez = suave(tramo(u, .3, .5));
    ponMapa(em, ez);
    ponTexto([tramo(u, .16, .34), tramo(u, .2, .4), tramo(u, .26, .44), tramo(u, .3, .48), tramo(u, .34, .52)].map(suave));
    const p = suave(tramo(u, .42, 1));
    const k = pintarRuta(p, suave(tramo(u, .34, .46)));
    const giro = suave(tramo(u, 1, 1.06)), flash = tramo(u, 1.03, 1.12), rot = suave(tramo(u, 1.06, 1.13)), cal = suave(tramo(u, 1.1, 1.35));
    const kLuz = enLuz(k);
    pintarLlegada(giro, flash, rot, cal, kLuz);
    const peso = suave(tramo(u, -.05, .42));
    const op = suave(tramo(u, -.3, .05)) * mezcla(.8, 1, peso) * (1 - .55 * cal);
    pintarFoco(origenHalo(), peso, op, kLuz);
    if (velo) velo.style.opacity = suave(tramo(u, 1.16, 1.34)).toFixed(3);
  };

  // ---------- Móvil: animación por tiempo al entrar en pantalla ----------
  const DUR = 3600;
  let t0 = null, haciendo = false;
  const pintarMovil = ms => {
    const t = ms / 1000;
    ponMapa(suave(tramo(t, 0, .5)), suave(tramo(t, .25, .9)));
    const p = suave(tramo(t, .55, 2.85));
    const k = pintarRuta(p, suave(tramo(t, .35, .7)));
    const kLuz = enLuz(k);
    const cal = suave(tramo(t, 3.25, 4.6));
    pintarLlegada(suave(tramo(t, 2.85, 3.15)), tramo(t, 3.0, 3.45), suave(tramo(t, 3.15, 3.6)), cal * .55, kLuz);
    const f = fig.getBoundingClientRect(), l = luz.getBoundingClientRect();
    const desde = [f.left + f.width / 2 - l.left, f.top - l.top, innerWidth * 1.3, innerHeight * .7];
    pintarFoco(desde, suave(tramo(t, 0, .9)), suave(tramo(t, 0, .4)) * (1 - .5 * cal), kLuz);
  };
  const animarMovil = now => {
    if (t0 === null) t0 = now;
    const ms = now - t0;
    pintarMovil(ms);
    if (ms < DUR + 1100 && modo === 'movil') requestAnimationFrame(animarMovil); else haciendo = false;
  };
  const ioMapa = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && modo === 'movil' && !haciendo && t0 === null && !reducido) { haciendo = true; requestAnimationFrame(animarMovil); }
  }), { threshold: .85 });
  // textos en móvil: entran al aparecer (transición CSS)
  const vars = ['ek', 'et', 'ep', 'eb', 'eg'];
  const ioTexto = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && modo === 'movil') sec.style.setProperty('--' + e.target.dataset.v, '1');
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  [...texto.children].forEach((el, i) => { el.dataset.v = vars[i]; });

  // ---------- final quieto (movimiento reducido) ----------
  const pintarFinal = () => {
    ponMapa(1, 1); ponTexto([1, 1, 1, 1, 1]);
    const k = pintarRuta(1, 1);
    const kLuz = enLuz(k);
    pintarLlegada(1, 0, 1, .45, kLuz);
    pintarFoco(kLuz.concat([230, 230]), 1, .9, kLuz);
  };

  // ---------- arranque y bucle ----------
  let objetivo = 0, actual = 0, visible = false;
  const leer = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    visible = r.top < vh * 1.3 && r.bottom > -vh * .2;
    objetivo = -r.top / vh;
  };
  const montar = () => {
    preparar();
    if (reducido) { pintarFinal(); return; }
    if (modo === 'movil') {
      ioMapa.observe(fig);
      [...texto.children].forEach(el => ioTexto.observe(el));
      if (t0 === null) { ponTexto([0, 0, 0, 0, 0]); texto.removeAttribute('data-oculto'); pintarMovil(0); }
      else pintarMovil(performance.now() - t0);
    } else {
      ioMapa.disconnect(); ioTexto.disconnect();
      leer(); pintarPC(actual);
    }
  };

  addEventListener('scroll', leer, { passive: true });
  let espera;
  addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(() => { leer(); montar(); }, 120); });
  esMovil.addEventListener('change', () => { t0 = null; montar(); });
  const iniciar = () => {
    montar();
    if (reducido) return;
    leer(); actual = objetivo;
    const bucle = () => {
      if (modo === 'pc') {
        actual += (objetivo - actual) * .1;
        // punto 5: al soltar el pin (u = 1.35) el suavizado no puede ir retrasado: el velo ya debe estar puesto
        const lim = .03 + .3 * (1 - tramo(objetivo, 1.12, 1.33));
        if (objetivo > 1 && Math.abs(objetivo - actual) > lim) actual = objetivo - Math.sign(objetivo - actual) * lim;
        if (Math.abs(objetivo - actual) < .0005) actual = objetivo;
        if (visible) pintarPC(actual);
      }
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  };
  // las fuentes cambian el ancho de los rótulos: medir cuando estén listas
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(iniciar); else iniciar();
})();
