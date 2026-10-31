/* Clic 24 · PARTE SEIS · «Partes resueltos» (#opiniones), sin dependencias (Web Animations API nativa)
   Hojas de albarán que vuelan en 3D hasta el tablón de corcho: entran desde fuera de pantalla girando como papel
   lanzado (la sombra en el corcho crece al acercarse), caen con un pequeño rebote, se clava la chincheta (temblor),
   se «escribe» la letra a boli y cae el sello «RESUELTO». Solo transform/opacity. Una vez por hoja.
   Movimiento reducido o sin soporte: todo clavado, escrito y sellado desde el principio. */
(() => {
  const sec = document.querySelector('.partes');
  const partes = [...document.querySelectorAll('.parte')];
  if (!sec || !partes.length) return;
  const listo = el => el.classList.add('vuela', 'clavada', 'escrita', 'sellada');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window) || !Element.prototype.animate) {
    partes.forEach(listo); return;
  }
  sec.classList.add('partes--anima');
  const esMovil = () => matchMedia('(max-width:760px)').matches;
  // de dónde viene cada hoja (fracción de pantalla) y cuánto gira en el aire
  const ORIGEN = [
    { x: -1.15, y: -.55, rx: 64, ry: -50, rz: -235 },
    { x: 1.2, y: -.7, rx: -56, ry: 54, rz: 215 },
    { x: -1.1, y: .75, rx: -70, ry: -38, rz: 195 },
    { x: 1.15, y: .7, rx: 60, ry: 46, rz: -250 }
  ];
  const VUELO = 1150, CLAVO = 300, LETRA = 1700;

  function lanza(li, i, espera) {
    const m = esMovil(), o = ORIGEN[i % 4], k = m ? .45 : 1;
    const g = parseFloat(getComputedStyle(li).getPropertyValue('--g')) || 0;
    const W = innerWidth, H = innerHeight;
    const dx = m ? (i % 2 ? 1 : -1) * 1.05 * W : o.x * W, dy = m ? .22 * H : o.y * H, dz = m ? 220 : 520;
    const t = (f, z, s, extra = 0) =>
      `translate3d(${dx * f}px,${dy * f}px,${z}px) rotateX(${o.rx * k * f}deg) rotateY(${o.ry * k * f}deg) rotateZ(${g + o.rz * k * f + extra}deg) scale(${s})`;
    li.classList.add('vuela');
    li.animate([
      { offset: 0, opacity: 0, transform: t(1, dz, 1.1), easing: 'cubic-bezier(.22,.55,.4,1)' },
      { offset: .14, opacity: 1 },
      { offset: .64, transform: t(.06, m ? 40 : 110, 1.025), easing: 'cubic-bezier(.55,0,.9,.45)' },
      { offset: .77, transform: `translate3d(0,0,-14px) rotateX(3deg) rotateY(0deg) rotateZ(${g}deg) scale(.985)`, easing: 'ease-out' },
      { offset: .88, transform: `translate3d(0,0,6px) rotateX(-3.5deg) rotateY(1.6deg) rotateZ(${g + .6}deg) scale(1.004)`, easing: 'ease-in-out' },
      { offset: .95, transform: `translate3d(0,0,-2px) rotateX(1.2deg) rotateY(-.6deg) rotateZ(${g - .2}deg) scale(1)` },
      { offset: 1, opacity: 1, transform: `translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(${g}deg) scale(1)` }
    ], { duration: VUELO, delay: espera, fill: 'backwards' });
    // sombra sobre el corcho: grande y difusa en el aire, se recoge al aterrizar
    li.querySelector('.parte__sombra')?.animate([
      { offset: 0, opacity: 0, transform: 'translate(70px,110px) scale(1.3)' },
      { offset: .4, opacity: .35 },
      { offset: .7, opacity: .6, transform: 'translate(14px,22px) scale(1.04)' },
      { offset: 1, opacity: 0, transform: 'translate(4px,8px) scale(1)' }
    ], { duration: VUELO, delay: espera, fill: 'backwards' });
    const tClavo = espera + VUELO - 40;
    setTimeout(() => li.classList.add('clavada'), tClavo);
    li.querySelector('.parte__chincheta')?.animate([
      { opacity: 0, transform: 'translate(22px,-80px) scale(1.8) rotate(-30deg)', easing: 'cubic-bezier(.55,0,.85,.4)' },
      { offset: .72, opacity: 1, transform: 'translate(0,2px) scale(.9) rotate(0deg)' },
      { opacity: 1, transform: 'none' }
    ], { duration: CLAVO, delay: tClavo, fill: 'backwards' });
    // temblor del pinchazo
    li.querySelector('.parte__ficha')?.animate([
      { transform: 'none' }, { transform: 'translate(0,2px) rotate(.35deg)' },
      { transform: 'translate(0,-1px) rotate(-.25deg)' }, { transform: 'none' }
    ], { duration: 260, delay: tClavo + CLAVO * .7, easing: 'ease-out' });
    const tLetra = tClavo + CLAVO + 60;
    setTimeout(() => li.classList.add('escrita'), tLetra);
    setTimeout(() => li.classList.add('sellada'), tLetra + LETRA);
  }

  let cola = 0;
  const io = new IntersectionObserver(entradas => {
    const nuevas = entradas.filter(e => e.isIntersecting).map(e => e.target)
      .sort((a, b) => partes.indexOf(a) - partes.indexOf(b));
    nuevas.forEach(li => {
      io.unobserve(li);
      lanza(li, partes.indexOf(li), 280 * cola++);
    });
    cola = 0;
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  partes.forEach(p => io.observe(p));
})();
