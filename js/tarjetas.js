/* Clic 24 · PARTE CUATRO · «Más servicios»: panel de llaves del taller (cerraduras, seguridad y copias), sin dependencias
   --s: escala del panel (px de diseño: tablero 1240 × 660; en móvil, cada estación ≈ 280 × 540). Se calcula siempre,
   también con movimiento reducido. --e por estación = encendido de su flexo (una a una); --x = salida.
   Relevo desde la parte tres: .tarjetas se superpone al final de .caja (margin-top negativo, z-index 2).
   u = recorrido desde que la sección toca el borde superior, en alturas de pantalla (scroll suavizado igual que caja.js).
     0.00–0.09  .tarjetas__oro sube encima del oro de la caja (mismo centro --ix/--iy): tapa su fundido a la noche
     0.14–0.50  el oro se retira y la luz se recoge en un halo detrás de las tarjetas; las tarjetas salen del oro, desfasadas
     PC  1.08–1.60  salida: las tarjetas se alejan (escala 0.9, opacidad baja) y el halo baja y se apaga
     Móvil         sin pin: cada tarjeta sale del oro al entrar en pantalla y se aleja al salir por arriba;
                   el halo acompaña (sticky) y baja y se apaga al acabar la sección. */
(() => {
  const sec = document.querySelector('.tarjetas');
  if (!sec) return;
  const esMovil = matchMedia('(max-width: 760px)');
  const panel = sec.querySelector('.panel');

  // escala del panel: cabe a lo ancho y, en PC, a lo alto junto al rótulo (sin pasar de 1,6 en 27")
  const escalar = () => {
    if (!panel) return;
    const w = document.documentElement.clientWidth, h = innerHeight;
    let s;
    if (esMovil.matches) s = Math.min((w - 52) / 280, 1.2);
    else {
      const esc = sec.querySelector('.tarjetas__escena'), cs = getComputedStyle(esc);
      const k = sec.querySelector('.tarjetas__kicker'), kc = getComputedStyle(k);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const arriba = parseFloat(cs.paddingTop) + k.offsetHeight + parseFloat(kc.marginBottom);
      s = Math.min((w - padX) / 1240, (h - arriba - Math.max(28, h * .06)) / 660, 1.6);
    }
    panel.style.setProperty('--s', Math.max(.3, s).toFixed(4));
  };
  escalar();
  addEventListener('resize', escalar);
  esMovil.addEventListener('change', escalar);
  if (document.fonts) document.fonts.ready.then(escalar);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const caja = document.querySelector('.caja');
  const oro = sec.querySelector('.tarjetas__oro');
  const halo = sec.querySelector('.tarjetas__halo');
  const kicker = sec.querySelector('.tarjetas__kicker');
  const tarjetas = [...sec.querySelectorAll('.tarjeta')];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);
  const mezcla = (a, b, t) => a + (b - a) * t;

  // el centro de la luz interior de la caja (lo escribe caja.js en .caja: --ix / --iy); solo lectura
  const centroCaja = () => {
    const cs = caja ? getComputedStyle(caja) : null;
    const x = cs && parseFloat(cs.getPropertyValue('--ix')), y = cs && parseFloat(cs.getPropertyValue('--iy'));
    return [isFinite(x) ? x : 72, isFinite(y) ? y : 48];
  };

  let objetivo = 0, actual = 0, visible = false, vh = innerHeight;
  const leer = () => {
    vh = innerHeight;
    const r = sec.getBoundingClientRect();
    visible = r.top < vh * 1.2 && r.bottom > -vh * .2;
    objetivo = -r.top / vh;
  };

  const pintar = u => {
    const movil = esMovil.matches;
    const r = sec.getBoundingClientRect();

    // 1 · oro a pantalla completa, encima del de la caja, y retirada
    const sube = suave(tramo(u, 0, .09));
    // retirada limpia: el oro se recoge hacia su centro (máscara, --rt) y solo al final baja su opacidad;
    // así nunca queda una capa dorada a media opacidad sobre la noche (eso daba un marrón apagado)
    const recogeOro = suave(tramo(u, .1, .36));
    const retira = suave(tramo(u, .24, .4));
    const [cx, cy] = centroCaja();
    oro.style.setProperty('--ix', cx + '%'); oro.style.setProperty('--iy', cy + '%');
    oro.style.setProperty('--rt', recogeOro.toFixed(3));
    oro.style.opacity = (sube * (1 - retira)).toFixed(3);

    // 2 · halo: nace del tamaño de la pantalla en el punto de luz de la caja y se recoge detrás de las tarjetas
    const recoge = suave(tramo(u, .12, .52));
    // salida: PC por recorrido; móvil cuando el final de la sección sube por la pantalla
    const salida = movil ? suave(tramo(1 - r.bottom / vh, -.5, .45)) : suave(tramo(u, 1.08, 1.6));
    const hx = mezcla(cx - 50, 0, recoge), hy = mezcla(cy - 50, movil ? 4 : 6, recoge) + 42 * salida;
    const hs = mezcla(2.6, 1, recoge) * mezcla(1, .82, salida);
    halo.style.transform = `translate(${hx.toFixed(2)}vw,${hy.toFixed(2)}vh) scale(${hs.toFixed(3)})`;
    halo.style.opacity = (sube * mezcla(1, .8, recoge) * (1 - .92 * salida)).toFixed(3);

    // 3 · kicker, tablero y llaves (cada una se enciende como con un flexo, una detrás de otra)
    if (!movil) {
      kicker.style.setProperty('--e', (suave(tramo(u, .2, .42)) * (1 - suave(tramo(u, 1.08, 1.4)))).toFixed(3));
      const pe = suave(tramo(u, .3, .46)), px = suave(tramo(u, 1.12, 1.55));
      panel.style.setProperty('--pe', pe.toFixed(3));
      panel.style.setProperty('--px', px.toFixed(3));
      panel.classList.toggle('activa', pe > .6 && px < .4);
      tarjetas.forEach((t, i) => {
        t.style.setProperty('--e', suave(tramo(u, .4 + i * .1, .6 + i * .1)).toFixed(3));
        t.style.setProperty('--x', suave(tramo(u, 1.08 + i * .03, 1.5 + i * .03)).toFixed(3));
      });
    } else {
      const entra = el => { const b = el.getBoundingClientRect(); return suave(tramo((vh - b.top) / vh, .04, .42)); };
      kicker.style.setProperty('--e', entra(kicker).toFixed(3));
      panel.style.setProperty('--pe', entra(panel).toFixed(3));
      panel.style.setProperty('--px', '0');
      panel.classList.add('activa');
      tarjetas.forEach(t => {
        const b = t.getBoundingClientRect();
        t.style.setProperty('--e', entra(t).toFixed(3));
        t.style.setProperty('--x', suave(tramo((vh * .14 - b.top) / b.height, 0, 1)).toFixed(3));
      });
    }
  };

  addEventListener('scroll', leer, { passive: true });
  addEventListener('resize', leer);
  esMovil.addEventListener('change', leer);
  leer(); actual = objetivo;

  const bucle = () => {
    actual += (objetivo - actual) * .1;
    if (Math.abs(objetivo - actual) < .0005) actual = objetivo;
    if (visible) pintar(actual);
    requestAnimationFrame(bucle);
  };
  pintar(actual);
  requestAnimationFrame(bucle);
})();
