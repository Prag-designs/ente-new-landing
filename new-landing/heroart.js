// Hero illustration clusters (rough pass with placeholder shapes).
// Two loose clusters either side of the headline: Photos things on the left,
// Auth + Locker things on the right, a Ducky stand-in leading each side.
// They pop out right after the dot hits, then each floats on its own slow loop,
// and the near ones shift more than the far ones when the mouse moves.
(() => {
  const fold = document.querySelector('.hero-fold');
  const title = document.querySelector('.hero-title');
  const cards = document.querySelector('.hero-cards');
  if (!fold || !title) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const G = '#1cc22c', P = '#9610d6', B = '#1668f2', Y = '#F5C842', O = '#F59A2C', R = '#F92B1C', CREAM = '#F3F0EA', INK = '#2C2C2A';

  const S = {
    duck: s => `<g class="lg"><line x1="${-s * .28}" y1="${s * .8}" x2="${-s * .34}" y2="${s * 1.35}" stroke="${INK}" stroke-width="${s * .12}" stroke-linecap="round"/><line x1="${s * .28}" y1="${s * .8}" x2="${s * .34}" y2="${s * 1.35}" stroke="${INK}" stroke-width="${s * .12}" stroke-linecap="round"/></g><circle r="${s}" fill="${Y}"/><circle cx="${-s * .35}" cy="${-s * .15}" r="${s * .1}" fill="${INK}"/><circle cx="${s * .35}" cy="${-s * .15}" r="${s * .1}" fill="${INK}"/><ellipse cx="0" cy="${s * .2}" rx="${s * .28}" ry="${s * .14}" fill="${O}"/><path d="M${-s * .5} ${-s * .9} q${s * .3} ${-s * .5} ${s * .5} 0" fill="${Y}"/>`,
    photo: (s, c) => `<rect x="${-s}" y="${-s * 1.1}" width="${s * 2}" height="${s * 2.3}" rx="${s * .18}" fill="#fff" stroke="#D3D1C7" stroke-width="1"/><rect x="${-s * .8}" y="${-s * .9}" width="${s * 1.6}" height="${s * 1.5}" rx="${s * .12}" fill="${c}"/>`,
    heart: (s, c) => `<path d="M0 ${s * .9} C${-s * 1.4} 0 ${-s} ${-s} 0 ${-s * .35} C${s} ${-s} ${s * 1.4} 0 0 ${s * .9}Z" fill="${c}"/>`,
    shield: (s, c) => `<path d="M0 ${-s} L${s * .85} ${-s * .6} L${s * .75} ${s * .3} Q0 ${s * 1.1} ${-s * .75} ${s * .3} L${-s * .85} ${-s * .6}Z" fill="${c}"/><path d="M${-s * .35} 0 l${s * .25} ${s * .25} l${s * .45} ${-s * .5}" stroke="#fff" stroke-width="${s * .14}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    lock: (s, c) => `<path d="M${-s * .5} ${-s * .1} v${-s * .35} a${s * .5} ${s * .5} 0 0 1 ${s} 0 v${s * .35}" stroke="${c}" stroke-width="${s * .22}" fill="none"/><rect x="${-s * .8}" y="${-s * .15}" width="${s * 1.6}" height="${s * 1.15}" rx="${s * .25}" fill="${c}"/>`,
    key: (s, c) => `<circle cx="${-s * .5}" cy="0" r="${s * .45}" fill="none" stroke="${c}" stroke-width="${s * .25}"/><path d="M0 0 h${s * 1.1} m${-s * .35} 0 v${s * .35} m${-s * .3} ${-s * .35} v${s * .3}" stroke="${c}" stroke-width="${s * .22}" stroke-linecap="round"/>`,
    star: (s, c) => { let p = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .45 : s, a = Math.PI / 5 * i - Math.PI / 2; p += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1); } return `<path d="${p}Z" fill="${c}" stroke="${c}" stroke-width="${s * .15}" stroke-linejoin="round"/>`; },
    spark: (s, c) => `<path d="M0 ${-s} Q${s * .15} ${-s * .15} ${s} 0 Q${s * .15} ${s * .15} 0 ${s} Q${-s * .15} ${s * .15} ${-s} 0 Q${-s * .15} ${-s * .15} 0 ${-s}Z" fill="${c}"/>`,
    dot: (s, c) => `<circle r="${s}" fill="${c}"/>`,
    cloud: (s, c) => `<g fill="${c}"><circle cx="${-s * .5}" cy="${s * .1}" r="${s * .55}"/><circle cx="${s * .1}" cy="${-s * .2}" r="${s * .7}"/><circle cx="${s * .7}" cy="${s * .15}" r="${s * .5}"/><rect x="${-s * .9}" y="${s * .1}" width="${s * 1.9}" height="${s * .55}" rx="${s * .27}"/></g>`,
    chip: (s, c) => `<rect x="${-s * 1.4}" y="${-s * .5}" width="${s * 2.8}" height="${s}" rx="${s * .3}" fill="${c}"/><text x="0" y="${s * .18}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="600" font-size="${(s * .55).toFixed(1)}" fill="#fff">482 913</text>`,
    folder: (s, c) => `<path d="M${-s} ${-s * .6} h${s * .7} l${s * .2} ${s * .25} h${s * 1.1} v${s * 1.15} h${-s * 2}Z" fill="${c}"/>`,
    film: (s, c) => `<rect x="${-s * 1.2}" y="${-s * .5}" width="${s * 2.4}" height="${s}" rx="${s * .12}" fill="${INK}"/>${[-.8, -.27, .27].map(x => `<rect x="${s * x}" y="${-s * .3}" width="${s * .48}" height="${s * .6}" rx="${s * .06}" fill="${c}"/>`).join('')}`,
    blob: s => `<circle r="${s}" fill="${CREAM}"/>`,
  };

  // [kind, x, y, size, colour, depth] in a 680x360 sketch, left cluster x 20..240, right 440..660
  const ITEMS = [
    ['blob', 150, 130, 46, 0, .2],
    ['duck', 120, 150, 26, 0, 1], ['photo', 182, 92, 16, G, .8], ['heart', 70, 95, 13, R, .7], ['star', 212, 150, 11, Y, .6], ['spark', 152, 52, 6, Y, .4],
    ['blob', 540, 260, 48, 0, .2],
    ['duck', 570, 205, 24, 0, 1], ['shield', 505, 105, 18, P, .8], ['lock', 620, 115, 15, B, .7], ['key', 492, 240, 14, G, .7], ['spark', 655, 165, 7, Y, .5],
  ];

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hero-art');
  svg.setAttribute('aria-hidden', 'true');
  const layers = ['back', 'mid', 'front'].map(() => { const g = document.createElementNS(NS, 'g'); svg.appendChild(g); return g; });
  fold.insertBefore(svg, fold.firstChild);

  const st = ITEMS.map(([k, x, y, s, c, d]) => {
    const g = document.createElementNS(NS, 'g'), inner = document.createElementNS(NS, 'g');
    g.appendChild(inner);
    (k === 'blob' ? layers[0] : d >= .9 ? layers[2] : layers[1]).appendChild(g);
    return { k, x, y, s, c, d, g, inner, ph: Math.random() * 6.28, w: .6 + Math.random() * .5, rotA: k === 'duck' ? 4 : 2 + Math.random() * 4 };
  });

  // map the sketch onto the space either side of the headline
  let geo = null;
  const layout = () => {
    if (getComputedStyle(svg).display === 'none') { geo = null; return; }
    const f = fold.getBoundingClientRect(), t = title.getBoundingClientRect();
    const c = cards ? cards.getBoundingClientRect() : t;
    const W = f.width, H = f.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const tl = t.left - f.left, tr = t.right - f.left;
    const top = t.top - f.top - Math.min(140, t.height * .9), bot = c.bottom - f.top + 24;
    const gap = 16, edge = 24;
    const vl = -f.left + edge, vr = innerWidth - f.left - edge;   // the art may run past the fold box to the screen edges
    const zl = [vl, Math.max(vl + 140, tl - gap)], zr = [Math.min(vr - 140, tr + gap), vr];
    const zw = Math.min(zl[1] - zl[0], zr[1] - zr[0]);
    const k = Math.max(1, Math.min(2.4, (bot - top) / 260, zw / 120));   // size from the room we have
    const cx = (t.left + t.right) / 2 - f.left, cy = (t.top + t.bottom) / 2 - f.top;
    st.forEach(o => {
      const left = o.x < 340;
      const u = left ? (o.x - 20) / 220 : (o.x - 440) / 220;
      const z = left ? zl : zr;
      o.tx = z[0] + u * (z[1] - z[0]);
      o.ty = top + ((o.y - 40) / 280) * (bot - top);
      o.size = k;
      o.inner.innerHTML = S[o.k](o.s * k, o.c);
      o.legs = o.inner.querySelector('.lg');
      o.ox = cx; o.oy = cy;
      o.delay = Math.hypot(o.tx - cx, o.ty - cy) / Math.max(1, W / 2) * .5 + (o.k === 'blob' ? 0 : .06);
    });
    geo = { W, H };
  };

  let mx = 0, my = 0, tx = 0, ty = 0, t0 = performance.now(), raf = 0, visible = true;
  const START = 1.35;  // right after the dot hits
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  const overshoot = p => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  const frame = now => {
    raf = 0;
    if (!geo || !visible) return;
    const t = (now - t0) / 1000;
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    for (const o of st) {
      const p = reduce ? 1 : Math.min(1, Math.max(0, (t - START - o.delay) / .55));
      const e = p <= 0 ? 0 : overshoot(p);
      const x = o.ox + (o.tx - o.ox) * e, y = o.oy + (o.ty - o.oy) * e;
      const A = reduce ? 0 : 1;
      const fy = Math.sin(t * o.w + o.ph) * (3 + o.d * 5) * o.size * .5 * A;
      const fr = Math.sin(t * o.w * .8 + o.ph * 1.3) * o.rotA * A;
      const px = -mx * 36 * o.d * A, py = -my * 22 * o.d * A;
      o.g.setAttribute('transform', `translate(${(x + px).toFixed(1)} ${(y + py + fy).toFixed(1)}) scale(${Math.max(0, e).toFixed(3)})`);
      o.inner.setAttribute('transform', `rotate(${fr.toFixed(2)})`);
      if (o.legs && A) {
        const sw = Math.sin(t * 3 + o.ph) * 14, ly = o.s * o.size * .8, lx = o.s * o.size * .28;
        o.legs.children[0].setAttribute('transform', `rotate(${sw.toFixed(1)} ${(-lx).toFixed(1)} ${ly.toFixed(1)})`);
        o.legs.children[1].setAttribute('transform', `rotate(${(-sw).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})`);
      }
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(fold);
  const go = () => { layout(); kick(); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(go, 150); }, { passive: true });
})();
