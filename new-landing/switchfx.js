// Switch: two phones lean in from the edges, a drawn arrow arcs between them, and photos fly
// from the old cloud (left) over the headline into Ente (right). Placeholder photo tiles for now.
(() => {
  const sec = document.querySelector('.switch');
  if (!sec || !matchMedia('(width > 820px)').matches) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  // flat-3D look: every object is one flat colour with a solid darker side (its extrusion), no soft shadows.
  // [face, side] per photo colour
  const PAL = [
    ['#ff8a3d', '#d4601c'], ['#3aa0ff', '#1d6dd0'], ['#08C225', '#06961C'], ['#ffc533', '#dc9500'],
    ['#8b6cff', '#5b3fe0'], ['#ff6b9a', '#d23d6c'], ['#2fd4c4', '#139a8e'], ['#ffd84d', '#e0aa00'], ['#6d8bff', '#3f5ae0'],
  ];
  // solid extrusion as stacked hard shadows. The element is rotated by rot (deg), so each layer is offset in its
  // own axes such that on screen the side always falls the same way (down, a touch to the right).
  const INK = '#0a0a0a';   // the hero illustrations' outline colour
  const ext = (rot, depth, col, rim, rimCol, ow) => {
    const r = rot * Math.PI / 180, wx = .28, wy = 1, lx = wx * Math.cos(r) + wy * Math.sin(r), ly = -wx * Math.sin(r) + wy * Math.cos(r), out = [];
    for (let i = 1; i <= depth; i++) out.push(`${(lx * i).toFixed(2)}px ${(ly * i).toFixed(2)}px 0 ${rim && i <= rim ? rimCol : col}`);
    // drawn outline, like the hero art: the same shapes again in near-black, grown by ow, behind the colour.
    // One at the face and one per side layer, so the line hugs the whole silhouette (face + side) at an even width.
    if (ow) for (let i = 0; i <= Math.ceil(depth); i++) { const k = Math.min(i, depth); out.push(`${(lx * k).toFixed(2)}px ${(ly * k).toFixed(2)}px 0 ${ow}px ${INK}`); }
    return out.join(',');
  };
  // the "Importing from Google Photos" card follows the photos: every one that lands moves the bar
  const demo = sec.querySelector('[data-upload-demo]');
  if (demo) demo.removeAttribute('data-upload-demo');   // the page's own script would run its 6s demo on top of ours
  const up = k => demo && demo.querySelector(`[data-upload-${k}]`);
  const TOTAL = 62247;
  const BASE = 0;     // every round starts from zero, the first one and each loop
  let shown = BASE, want = BASE, doneShown = false;
  const paint = () => {
    if (!demo) return;
    const pct = Math.min(100, Math.floor(shown * 100 + .0001)), done = want >= 1 && shown > .995;
    up('percent').textContent = `${done ? 100 : pct}% uploaded`;
    up('count').textContent = `${Math.round(TOTAL * (done ? 1 : shown)).toLocaleString('en-US')} of 62,247 items`;
    up('fill').style.width = `${(shown * 100).toFixed(2)}%`;
    up('progress').setAttribute('aria-valuenow', String(done ? 100 : pct));
    up('status').textContent = done ? 'Upload complete' : 'Uploading...';
    if (done !== doneShown) { doneShown = done; up('mascot').classList.toggle('is-done', done); up('announcement').textContent = done ? 'Upload complete. All 62,247 items uploaded.' : ''; }
  };
  const SLOTS = 18;      // photos per phone screen (3 x 6)
  const EVERY = .6;     // s between photos leaving (boss: faster)
  const FLIGHT = 2.2;    // s along the arc (boss: faster)
  const IN_AIR = Math.ceil(FLIGHT / EVERY) + 1;

  // ---- phones: drawn illustrations. Screen corners measured off each image (fractions of its box),
  // top-left, top-right, bottom-right, bottom-left as seen on the screen ----
  const ART = '/assets/new-landing/';
  const IMG = {
    left: { src: ART + 'sw-other-phone.svg?v=5', ar: .8889, mid: [.518, .442] },
    right: { src: ART + 'sw-ente-phone.svg?v=6', ar: .8889, q: [[0.4597, 0.0575], [0.9057, 0.0966], [0.4962, 0.851], [0.0572, 0.7624]] },
  };
  // the Ente screen is an empty grid; every item that lands drops into the next slot, so the phone fills up
  const GRID = { cols: 3, tile: 220, gap: 55, top: 330 };   // in the 1000 x 2100 screen space
  const slotAt = i => { const c = i % GRID.cols, r = Math.floor(i / GRID.cols), x0 = (1000 - (GRID.cols * GRID.tile + (GRID.cols - 1) * GRID.gap)) / 2;
    return [x0 + GRID.tile / 2 + c * (GRID.tile + GRID.gap), GRID.top + GRID.tile / 2 + r * (GRID.tile + GRID.gap)]; };
  const SPIRAL = Array.from({ length: 18 }, (_, i) => { const [x, y] = slotAt(i); return `<i style="left:${x - GRID.tile / 2}px;top:${y - GRID.tile / 2}px"></i>`; }).join('');
  const phone = side => {
    const el = document.createElement('div');
    el.className = `sw-phone is-${side}`; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<img src="${IMG[side].src}" alt="" draggable="false">` + (side === 'right' ? `<div class="sw-pq">${SPIRAL}</div>` : '');
    sec.appendChild(el);
    return el;
  };
  const left = phone('left'), right = phone('right');
  const portal = right.querySelector('.sw-pq'), tiles = [...portal.children];
  let H3 = null, brXY = [0, 0], tilePx = 30, screenAng = 0;
  // all three products travel: photos (Photos), codes (Auth), documents (Locker)
  const KINDS = ['photo', 'code', 'doc'];
  // the order things arrive in: mostly photos, codes and docs mixed in, so the Ente screen never fills in tidy columns
  const SEQ = 'pppcpdppcpdpcppdcp'.split('').map(c => ({ p: 'photo', c: 'code', d: 'doc' })[c]);
  const KIND_COL = { code: ['#8b6cff', '#5b3fe0'], doc: ['#3aa0ff', '#1d6dd0'] };
  const colour = (kind, i) => KIND_COL[kind] || [['#ff8a3d', '#d4601c'], ['#08C225', '#06961C'], ['#ffc533', '#dc9500'], ['#ff6b9a', '#d23d6c'], ['#2fd4c4', '#139a8e']][i % 5];

  // map a w x h rect onto four points: the CSS matrix3d (origin 0 0) for that projective transform
  const homography = (w, h, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) => {
    const adj = m => [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4], m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5], m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]];
    const mm = (a, b) => { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3*i+k] * b[3*k+j]; c.push(s); } return c; };
    const mv = (m, v) => [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
    const basis = (a, b, c, d) => { const m = [a[0], b[0], c[0], a[1], b[1], c[1], 1, 1, 1], v = mv(adj(m), [d[0], d[1], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
    const s = basis([0, 0], [w, 0], [w, h], [0, h]), d = basis([x0, y0], [x1, y1], [x2, y2], [x3, y3]);
    const t = mm(d, adj(s)).map(v => v / mm(d, adj(s))[8]);
    return { css: `matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',')})`, at: (x, y) => { const r = mv(t, [x, y, 1]); return [r[0] / r[2], r[1] / r[2]]; } };
  };

  // ---- arrow + flying photos layer ----
  const art = document.createElement('div');
  art.className = 'sw-art'; art.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  const arc = document.createElementNS(NS, 'path'), head = document.createElementNS(NS, 'path');
  arc.setAttribute('class', 'sw-arrow'); head.setAttribute('class', 'sw-arrow');
  svg.append(arc, head); art.appendChild(svg);
  const photos = Array.from({ length: IN_AIR }, () => { const p = document.createElement('i'); p.className = 'sw-photo'; art.appendChild(p); return p; });
  sec.appendChild(art);
  sec.classList.add('is-stage');

  let drawn = false;
  // ---- geometry, in the section's pixels ----
  // the headline's real text box (its spans are full-width blocks, so measure the text nodes)
  const textBox = () => {
    const s = sec.getBoundingClientRect(), z = s.width / sec.offsetWidth || 1, h = sec.querySelector('h2'), out = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width) { out.l = Math.min(out.l, (r.left - s.left) / z); out.r = Math.max(out.r, (r.right - s.left) / z); out.t = Math.min(out.t, (r.top - s.top) / z); out.b = Math.max(out.b, (r.bottom - s.top) / z); }
    }
    return out;
  };
  // where a phone's inner top corner lands, relative to its centre, for width w and tilt a (deg)
  const corner = (w, a) => { const h = w * 19.5 / 9, r = Math.abs(a) * Math.PI / 180; return [w / 2 * Math.cos(r) + h / 2 * Math.sin(r), -(h / 2 * Math.cos(r) - w / 2 * Math.sin(r))]; };
  let W = 0, H = 0, fly = null, photoDepth = 8;
  const LINE = 2;   // every outline here matches the sleeping Ducky's line on screen (1.5 of its 129 units at its fixed 168px = ~2px)
  const layout = () => {
    W = sec.clientWidth; H = sec.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const T = textBox();
    // the phones may sit past the section's edge but never past the window's: never cropped
    const sr = sec.getBoundingClientRect(), zz = sr.width / sec.offsetWidth || 1;
    const vl = -sr.left / zz + 16, vr = (innerWidth - sr.left) / zz - 16;   // window edges in section px
    const room = Math.min(T.l - vl, vr - T.r);
    const spread = Math.round(Math.min(180, Math.max(60, W * .09)));   // how far each phone sits out past the headline
    // laptop windows (boss mockup): the phones sit low beside the import card, sized off the card, a clear gap to it
    const cardEl = sec.querySelector('.upload-demo'), lap = innerWidth < 1700 && cardEl;
    const cr = lap && cardEl.getBoundingClientRect(), card = lap && { l: (cr.left - sr.left) / zz, r: (cr.right - sr.left) / zz, t: (cr.top - sr.top) / zz, w: cr.width / zz };
    const pw = Math.round(lap ? card.w * .29 : Math.max(200, Math.min(420, W * .24, room - spread + 40)));
    const box = (el, side) => {
      const h = pw / IMG[side].ar;
      let x = side === 'left' ? Math.max(vl, T.l + 10 - spread - pw) : Math.min(vr - pw, T.r - 30 + spread), y = T.b - h * .16;
      if (lap) {   // gap to the card ~12.5% of its width (less only when the window runs out), tops a little under the card's
        x = side === 'left' ? Math.max(vl, card.l - card.w * .125 - pw) : Math.min(vr - pw, card.r + card.w * .125);
        y = card.t + card.w * (side === 'left' ? .064 : .04);
      }
      el.style.setProperty('--pw', pw + 'px'); el.style.left = x + 'px'; el.style.top = y + 'px';
      return { x, y, h };
    };
    const bl = box(left, 'left'), br = box(right, 'right');
    // the portal rect lands exactly on the drawn Ente screen
    H3 = homography(1000, 2100, IMG.right.q.map(([u, v]) => [u * pw, v * br.h])); brXY = [br.x, br.y];
    { const [a, b] = [H3.at(0, 1050), H3.at(1000, 1050)]; tilePx = Math.hypot(b[0] - a[0], b[1] - a[1]) * GRID.tile / 1000; screenAng = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; }
    portal.style.transform = H3.css;
    const pc = H3.at(500, 1050);
    const kl = [bl.x + pw * .62, bl.y + bl.h * .08], kr = [br.x + pw * .45, br.y + br.h * .06];
    // the arrow: from just past the left phone's corner, up over the eyebrow, down to the right phone's corner
    const top = Math.max(24, T.t - Math.min(260, W * .17));
    const a0 = [kl[0] + 28, kl[1] - 26], a1 = [kr[0] - 34, kr[1] - 22], ac = [W / 2, top];
    arc.setAttribute('d', `M${a0} Q${ac} ${a1}`);
    // arrowhead along the curve's end direction
    const dx = a1[0] - ac[0], dy = a1[1] - ac[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, k = Math.min(24, W * .018);
    const h1 = [a1[0] - ux * k - uy * k * .75, a1[1] - uy * k + ux * k * .75], h2 = [a1[0] - ux * k + uy * k * .75, a1[1] - uy * k - ux * k * .75];
    head.setAttribute('d', `M${h1} L${a1} L${h2}`);
    const len = arc.getTotalLength();
    arc.style.strokeDasharray = len; if (!drawn) arc.style.strokeDashoffset = len;
    if (!drawn) head.style.opacity = 0;
    // the photos' path: out of the left screen, high over the arrow, into the right screen
    const p0 = [bl.x + IMG.left.mid[0] * pw, bl.y + IMG.left.mid[1] * bl.h], p3 = [br.x + pc[0], br.y + pc[1]];
    const eb = (() => { const e = sec.querySelector('.eyebrow'); if (!e) return T.t - 60; const r = e.getBoundingClientRect(); return (r.top - sr.top) / zz; })();
    // one clean parabola (a quadratic curve): no flat top, it rises, rounds over well above the eyebrow and falls
    const apex = eb - Math.min(130, Math.max(80, W * .075)), hc = (apex - .25 * p0[1] - .25 * p3[1]) / .5;   // B(.5) = .25 p0 + .5 c + .25 p3
    fly = { p0, c1: [p0[0] + (p3[0] - p0[0]) / 3, hc + (p0[1] - hc) / 3], c2: [p3[0] - (p3[0] - p0[0]) / 3, hc + (p3[1] - hc) / 3], p3 };   // the same parabola as a cubic
    if (lap) {   // boss's drawn path: a full round arch from the left screen to the right one, its top just over the import card
      const top = Math.min((T.b + card.t) / 2 - 10, card.t - Math.min(110, Math.max(64, W * .06)) * .75), D = p3[0] - p0[0];   // centred in the lane between headline and card, tiles clear the card's edge
      const yc = (top - .125 * (p0[1] + p3[1])) / .75;   // B(.5).y = .125 p0 + .375 c1 + .375 c2 + .125 p3
      fly = { p0, c1: [p0[0] + D * .25, yc], c2: [p3[0] - D * .285, yc], p3 };
    }
    photoDepth = Math.round(Math.min(110, Math.max(64, W * .06)) * .09);
    portal.style.setProperty('--pqb', (LINE * GRID.tile / tilePx).toFixed(1) + 'px');   // landed tiles' outline: LINE px on screen
    art.style.setProperty('--t', `${Math.round(Math.min(110, Math.max(64, W * .06)))}px`);
  };
  const at = t => {
    const u = 1 - t, { p0, c1, c2, p3 } = fly;
    return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p3[i]);
  };
  const slotXY = i => { const q = H3.at(...slotAt(i % 18)); return [brXY[0] + q[0], brXY[1] + q[1]]; };
  const place = (el, t, slot) => {
    let [x, y] = at(t); const apex = Math.sin(t * Math.PI);
    if (slot != null && H3) { const e = slotXY(slot), w = t * t; x += (e[0] - fly.p3[0]) * w; y += (e[1] - fly.p3[1]) * w; }   // same curve, bent to end on its own slot
    el.style.opacity = String(Math.min(1, t / .04, (1 - t) / .04));
    const pull = Math.max(0, (t - .8) / .2), pe = pull * pull * (3 - 2 * pull);   // last 20%: caught by the portal
    const free = -22 + t * 40 + Math.sin(t * Math.PI * 2) * 6, rot = free + (screenAng - free) * pe;   // tossed, then squared up with the screen
    const out = Math.min(1, t / .16), oe = 1 - (1 - out) * (1 - out) * (1 - out);   // pops out of the old screen, small to full
    const size = parseFloat(art.style.getPropertyValue('--t')) || 90, fly0 = .2 + oe * .35 + apex * .5, land = tilePx / size, sc = fly0 + (land - fly0) * pe;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    el.style.boxShadow = ext(rot, 0, 'var(--cs)', 0, '', +(LINE / sc).toFixed(2));   // flat tile, outline only; LINE px on screen at any scale
  };

  // ---- the arrow draws itself in once, the first time the section is seen ----
    const drawArrow = () => {
    if (drawn) return; drawn = true;
    arc.style.transition = reduce ? 'none' : 'stroke-dashoffset 1.1s cubic-bezier(.65,0,.35,1)';
    arc.style.strokeDashoffset = 0;
    head.style.transition = reduce ? 'none' : 'opacity .25s ease 1s';
    head.style.opacity = 1;
  };

  // ---- the loop: one photo leaves every EVERY s; when Ente is full, both screens reset ----
  let sent = 0, landed = 0, start = 0, raf = 0, running = false, hold = 0, lastNow = 0, first = true;
  const flights = [];
  const reset = () => { hold = Infinity; tiles.forEach((tl, i) => setTimeout(() => tl.classList.remove('is-in', 'is-locked'), (17 - i) * 25)); setTimeout(() => { sent = 0; landed = 0; start = 0; hold = 0; want = BASE; }, 400); };   // card back to 0%, photos keep coming
  const launch = t0 => {
    const el = photos.find(p => !flights.some(f => f.el === p));
    if (el) { const slot = sent++, k = SEQ[slot % 18], [f, sd] = colour(k, slot); el.dataset.k = k; el.style.setProperty('--cf', f); el.style.setProperty('--cs', sd); flights.push({ el, t0, slot }); }
  };
  const frame = now => {
    raf = 0; if (!running) return;
    if (!start) start = now;
    // first time in: it is already going, three photos already in the air
    if (first) { first = false; const ahead = 3 * EVERY - .05; start = now - ahead * 1000; while (sent < 3) launch(start + sent * EVERY * 1000); }
    // paused (scrolled away, background tab): stop the clock too, so nothing launches in a burst on return
    const gap = lastNow ? now - lastNow : 0; lastNow = now;
    if (gap > 1000) { const d = gap - 16; start += d; flights.forEach(f => { f.t0 += d; }); }   // a real pause only (hidden tab); slow frames on a busy page must not freeze the upload
    const t = (now - start) / 1000;
    if (!hold && sent < SLOTS && t >= sent * EVERY) {
      launch(now);
    }
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i], k = (now - f.t0) / 1000 / FLIGHT;
      if (k >= 1) {
        f.el.style.opacity = '0'; flights.splice(i, 1);
        want = BASE + (1 - BASE) * (landed + 1) / SLOTS;
        { const tl = tiles[f.slot % 18]; tl.dataset.k = f.el.dataset.k; tl.style.setProperty('--cf', f.el.style.getPropertyValue('--cf')); tl.classList.remove('is-locked'); tl.classList.add('is-in'); setTimeout(() => tl.classList.contains('is-in') && tl.classList.add('is-locked'), 380); }   // lands, then turns into a lock: encrypted
        if (++landed === SLOTS) setTimeout(reset, 1800);   // a beat to enjoy the awake duck
      } else place(f.el, k, f.slot);
    }
    if (Math.abs(want - shown) > .0005) { shown += (want - shown) * (want < shown ? .25 : .08); paint(); } else if (shown !== want) { shown = want; paint(); }
    raf = requestAnimationFrame(frame);
  };

  const go = () => {
    layout();
    if (drawn) { arc.style.transition = 'none'; arc.style.strokeDashoffset = 0; head.style.opacity = 1; }
    if (reduce) { want = shown = 1; paint(); }
    if (reduce) tiles.forEach((tl, i) => { tl.dataset.k = SEQ[i]; tl.style.setProperty('--cf', colour(SEQ[i], i)[0]); tl.classList.add('is-in', 'is-locked'); });
    if (reduce) photos.forEach((el, i) => { const k = KINDS[i % 3], [f, sd] = colour(k, i); el.dataset.k = k; el.style.setProperty('--cf', f); el.style.setProperty('--cs', sd); place(el, (i + .5) / photos.length); });
  };
  paint();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(go, 150); }, { passive: true });
  new IntersectionObserver(es => {
    const vis = es[0].isIntersecting;
    if (vis) { drawArrow(); setTimeout(go, 800); }
    if (reduce) return;
    if (vis && !running) {   // resume without jumps: shift every clock by the time we were away
      running = true; lastNow = 0;   // this path already shifts the clocks below
      const now = performance.now(); if (frame.away) { const gap = now - frame.away; start && (start += gap); flights.forEach(f => f.t0 += gap); }
      if (!raf) raf = requestAnimationFrame(frame);
    } else if (!vis && running) { running = false; frame.away = performance.now(); }
  }, { threshold: .2 }).observe(sec);
})();
