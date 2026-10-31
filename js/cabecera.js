/* Clic 24 · cabecera con vídeo ligado al scroll (sin dependencias)
   Fin de escena: al llegar a p = 1 se añade .fin-resplandor a <html> y se emite el evento
   "clic24:resplandor". La próxima escena (faros de coche) puede encadenarse desde ahí. */
(() => {
  const raiz = document.documentElement;
  const cine = document.querySelector('.cine');
  const video = document.getElementById('cineVideo');
  const segundo = document.querySelector('.cine__segundo');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const esMovil = matchMedia('(max-width: 760px)');

  // Botones de demo: solo animación (onda), no navegan
  document.querySelectorAll('.js-boton').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const r = b.getBoundingClientRect(), o = document.createElement('span');
    o.className = 'onda';
    o.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + 'px';
    o.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + 'px';
    b.appendChild(o); setTimeout(() => o.remove(), 750);
  }));

  if (reducido.matches || !cine || !video) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => clamp((p - a) / (b - a));
  const suave = x => x * x * (3 - 2 * x);

  // Momentos clave del recorrido (0 → 1)
  const CLIC = 0.42;      // la cerradura cede (mitad del vídeo)
  const FIN_VIDEO = 0.86; // el vídeo termina aquí; el resto es resplandor puro

  let fuente = '';
  const elegirFuente = () => {
    const f = esMovil.matches ? video.dataset.movil : video.dataset.pc;
    if (f === fuente) return;
    fuente = f; video.src = f; video.load(); ultimoT = -1;
  };

  let duracion = 0, objetivo = 0, actual = 0, ultimoT = -1, clicado = false, enFin = false;
  video.addEventListener('loadedmetadata', () => { duracion = video.duration || 8; video.pause(); });
  elegirFuente();
  esMovil.addEventListener('change', elegirFuente);
  // iOS: un play/pause tras el primer gesto desbloquea el decodificado
  addEventListener('touchstart', () => { video.play().then(() => video.pause()).catch(() => {}); }, { once: true, passive: true });

  const leerScroll = () => {
    const r = cine.getBoundingClientRect();
    objetivo = clamp(-r.top / ((cine.offsetHeight - innerHeight) || 1));
  };
  addEventListener('scroll', leerScroll, { passive: true });
  addEventListener('resize', leerScroll);
  leerScroll(); actual = objetivo;

  const pintar = p => {
    const s = raiz.style;
    s.setProperty('--p', p.toFixed(4));
    s.setProperty('--pista', (1 - suave(tramo(p, 0, .06))).toFixed(3));
    // H1, kicker y símbolo: se van cuando la luz lo inunda todo
    s.setProperty('--t1', (1 - suave(tramo(p, .62, .76))).toFixed(3));
    // subtítulo y botones: entran cuando cede la cerradura
    const t2 = suave(tramo(p, .37, .47)) * (1 - suave(tramo(p, .62, .74)));
    s.setProperty('--t2', t2.toFixed(3));
    segundo.toggleAttribute('data-oculto', t2 < .05);
    // luz: primero se suma al vídeo (screen) y después lo cubre todo
    s.setProperty('--oro-a', suave(tramo(p, .54, .80)).toFixed(3));
    s.setProperty('--resplandor', suave(tramo(p, .68, .86)).toFixed(3));
    // destello suave en la cerradura al ceder: la luz tapa el paso del plano macro al plano abierto (sin manos)
    // penumbra sobre la ganzúa suelta (solo PC; vídeo seg. ~5,3–6,3 ⇔ p ≈ .575–.69)
    s.setProperty('--ganzua', (suave(tramo(p, .545, .572)) * (1 - suave(tramo(p, .685, .71)))).toFixed(3));
    s.setProperty('--clic', (.8 * Math.sin(Math.PI * tramo(p, .43, .67)) ** 2).toFixed(3));

    // «clic» del símbolo al ceder la cerradura (se rearma al volver atrás)
    if (p >= CLIC !== clicado) { clicado = !clicado; raiz.classList.toggle('clic', clicado); }
    // estado final, listo para encadenar la siguiente escena
    if (p >= .97 !== enFin) {
      enFin = !enFin; raiz.classList.toggle('fin-resplandor', enFin);
      if (enFin) dispatchEvent(new CustomEvent('clic24:resplandor'));
    }

    if (duracion && video.readyState >= 1 && !video.seeking) {
      const t = clamp(p / FIN_VIDEO) * (duracion - .05);
      if (Math.abs(t - ultimoT) > 0.008) { video.currentTime = t; ultimoT = t; }
    }
  };

  const bucle = () => {
    actual += (objetivo - actual) * 0.1;
    if (Math.abs(objetivo - actual) < 0.0004) actual = objetivo;
    // franja cabecera → coche: cerca del final el retraso del suavizado se limita para que el resplandor
    // esté completo cuando el pin se suelta (si no, se ve el vídeo a medio cubrir sobre el oro del coche)
    const lim = .02 + .18 * (1 - tramo(objetivo, .78, .85));   // p ≥ .86 (= FIN_VIDEO): el coche toma el relevo en el sitio
    actual = clamp(actual, objetivo - lim, objetivo + lim);
    pintar(actual);
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
})();
