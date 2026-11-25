// Hero card hover: that product's illustration cluster blooms on both sides of the headline.
// Line illustrations from the Marketing Figma for now (colour and more pieces come later). Every piece is
// data (drawing, place, size, tilt, depth), so swapping art never touches the motion.
(() => {
  const fold = document.querySelector('.hero-fold');
  const title = document.querySelector('.hero-title');
  const cards = document.querySelector('.hero-cards');
  if (!fold || !title || !cards || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const ART = '/assets/new-landing/hoverart/';
  // coloured illustrations (GPT-drawn, thick black outline, thin white rim, flat body, darker side, no highlights).
  // width / height of each trimmed image
  const AR = {camera: 1.3559, polaroid: 1.0774, filmroll: 1.3061, frame: 1.1189, cloud: 1.7978, heart: 0.6891, album: 0.7766, mappin: 0.7000, shield: 0.9031, lock: 0.7344, fingerprint: 0.9609, codephone: 0.6906, keys: 0.9859, otp: 1.4612, stopwatch: 0.7781, qrcode: 0.9859, vault: 1.2355, passport: 0.8386, docfolder: 1.3599, password: 2.2222, diploma: 1.8955, idcard: 1.4055, housedeed: 0.8406, medical: 0.8145};

  // ---- composition: four pieces per side, placed by hand like stickers thrown around a title. Every product and
  // side has its own arrangement (a pair up top, a pair at the bottom, a loose arc, a sweep), so there are no
  // rows, no zig-zag and no mirror between the two sides. Fixed numbers, the same on every load.
  // slot = [u across (0 = screen edge, 1 = headline side), v down, size, tilt]. Rules the table keeps:
  //   two pieces share a height only at the very top or bottom, and then sit at opposite ends of the zone;
  //   beside the headline and the cards a piece stays in the outer half, so the text has air;
  //   sizes stay within a narrow band, so every piece carries about the same weight.
  // pieces redrawn as clean vectors (Quiver), the rest are still the GPT pictures
  const VEC = new Set(['locker-passport', 'locker-idcard', 'locker-docfolder', 'locker-housedeed', 'locker-medical', 'locker-diploma']);
  const PER = 4;
  const PLACE = {
    photos: [
      [[.08, .17, .95, -9], [.72, .86, 1, 7], [.30, .50, .9, -5], [.95, .06, .85, 11]],     // pair on top, then a drift inward
      [[.35, .15, .9, 6], [.95, .97, .95, -8], [.08, .87, 1, 10], [.15, .51, .88, -4]],     // starts lower, pair at the bottom
    ],
    auth: [
      [[.85, .04, .9, -10], [.05, .63, 1, 6], [.30, .33, 1, -6], [.60, .97, .88, 12]],      // an arc that opens to the headline
      [[.88, .13, .95, 8], [.06, .22, .9, -12], [.40, .58, 1, 7], [.15, .90, .95, -7]],     // pair on top, set lower than the left
    ],
    locker: [
      [[.45, .45, 1, -7], [.15, .14, .9, 5], [.05, .90, .95, 9], [.85, .78, .9, -11]],      // short stack, pair low, inner one higher
      [[.20, .06, .95, -6], [.05, .38, .95, 9], [.45, .68, 1, -10], [.90, .97, .9, 5]],     // a sweep from the edge in to the cards
    ],
  };
  const scatter = (name, side) => PLACE[name][side].map(([u, v, size, tilt]) => [u, v, size, tilt, .5 + (size - .72) * 1.1]);
  // per product: four for the left, then four for the right; every piece used once per set
  const SETS = {
    photos: ['frame', 'heart', 'camera', 'polaroid', 'cloud', 'mappin', 'filmroll', 'album'],
    auth:   ['shield', 'otp', 'codephone', 'stopwatch', 'lock', 'qrcode', 'fingerprint', 'keys'],
    locker: ['vault', 'password', 'passport', 'idcard', 'docfolder', 'housedeed', 'medical', 'diploma'],
  };

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hero-hoverart'); svg.setAttribute('aria-hidden', 'true');
  fold.insertBefore(svg, fold.firstChild);

  // build every piece once; layout() places and sizes them
  const sets = {};
  for (const [name, list] of Object.entries(SETS)) {
    const g = document.createElementNS(NS, 'g'); svg.appendChild(g);
    const items = [];
    [[scatter(name, 0), 0], [scatter(name, 1), 1]].forEach(([slots, side]) => slots.forEach(([u, v, s, tilt, d], i) => {
      const art = list[side * PER + i], ar = AR[art], x = u * 300, y = v * 420;
      const outer = document.createElementNS(NS, 'g'), inner = document.createElementNS(NS, 'g'), img = document.createElementNS(NS, 'image');
      img.setAttribute('href', ART + 't-' + name + '-' + art + (VEC.has(name + '-' + art) ? '.svg?v=1' : '.webp?v=4'));   // each set drawn in its product's colour; bump to refetch
      inner.appendChild(img); outer.appendChild(inner); outer.setAttribute('opacity', '0');
      g.appendChild(outer);
      const draw = w => { draw.w = w; const h = w / ar; img.setAttribute('width', w.toFixed(1)); img.setAttribute('height', h.toFixed(1)); img.setAttribute('x', (-w / 2).toFixed(1)); img.setAttribute('y', (-h / 2).toFixed(1)); };
      items.push({ role: i === 2 ? 'main' : 'obj', side, u, vv: v, x, y, s, d, tilt, ar, draw, outer, inner, p: 0, v: 0,
        ph: (x * 7 + y * 13) % 6.28, w: .6 + ((x + y) % 50) / 100, rot: 3 + (x % 3) });
    }));
    sets[name] = { g, items, target: 0, since: 0, mode: 'down' };
  }

  // ---- spread each side's pieces over its whole zone ----
  let ok = false;
  const layout = () => {
    const f = fold.getBoundingClientRect();
    // the headline's real text box (the h1 itself is wider than its words)
    const t = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    const tw = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) { const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width) { t.left = Math.min(t.left, r.left); t.right = Math.max(t.right, r.right); t.top = Math.min(t.top, r.top); t.bottom = Math.max(t.bottom, r.bottom); } }
    if (!isFinite(t.left)) Object.assign(t, title.getBoundingClientRect().toJSON());
    if (innerWidth <= 820) { ok = false; return; }
    svg.setAttribute('viewBox', `0 0 ${f.width} ${f.height}`);
    const edge = 28, gap = 28, top = 24, bot = f.height - 24, H = bot - top;
    const zones = [[edge - f.left, t.left - f.left - gap], [t.right - f.left + gap, innerWidth - f.left - edge]];
    const zw = Math.max(80, Math.min(zones[0][1] - zones[0][0], zones[1][1] - zones[1][0]));
    const heroK = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hero-k')) || 1;
    const base = Math.max(76, Math.min(230, zw * .55, H * .17) * heroK);   // piece width unit, from the room we have
    const cx0 = (t.left + t.right) / 2 - f.left, cy0 = (t.top + t.bottom) / 2 - f.top;
    for (const set of Object.values(sets)) for (const o of set.items) {
      // same visual weight for every shape: size by area, not width (a wide chat bubble and a tall lock read
      // the same size), and keep the slot-to-slot variation small so nothing looks tiny or oversized
      const ss = .82 + (o.s - .6) * .4;
      const [z0, z1] = zones[o.side], w = Math.max(56, ss * base * Math.sqrt(o.ar)), h = w / o.ar;
      // fit the tilted piece, not the upright one, so a turned corner never leaves the zone
      const ta = Math.abs(o.tilt) * Math.PI / 180, bw = w * Math.cos(ta) + h * Math.sin(ta), bh = w * Math.sin(ta) + h * Math.cos(ta);
      o.bw = bw; o.bh = bh;
      const uu = o.side ? 1 - o.u : o.u;   // u is measured from the screen edge on both sides
      o.tx = z0 + bw / 2 + uu * Math.max(0, z1 - z0 - bw);
      o.ty = top + bh / 2 + o.vv * Math.max(0, H - bh);
      o.cx = o.tx; o.cy = o.ty;   // each piece pops in place, from its own centre
      o.k = base / 120;
      o.draw(w); o.h = h;
      o.delay = (1 - o.vv) * .12 + (o.side ? .02 : 0);   // rise from below: lower pieces first, a short ripple upward
      o.rise = Math.max(70, H * .12);
      o.lift = o.rise * .5;
    }
    // safety net for in-between window sizes: the table already keeps pieces apart, this only pushes a pair
    // apart vertically if an odd zone shape ever brings two closer than 24px
    for (const set of Object.values(sets)) for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const a of set.items) for (const b of set.items) {
        if (a === b || a.side !== b.side || a.ty > b.ty) continue;
        const ox = (a.bw + b.bw) / 2 + 24 - Math.abs(a.tx - b.tx), oy = (a.bh + b.bh) / 2 + 24 - (b.ty - a.ty);
        if (ox <= 0 || oy <= 0) continue;
        const push = oy / 2 + .5;
        a.ty = Math.max(top + a.bh / 2, a.ty - push); b.ty = Math.min(bot - b.bh / 2, b.ty + push);
        a.cy = a.ty; b.cy = b.ty; moved = true;
      }
      if (!moved) break;
    }
    ok = true;
  };

  // ---- motion: a spring per piece, running only while something is shown or moving ----
  const EXIT = .16, EXIT_LIFT = 34, SWAP_LAG = .07;   // old set gone in .16 s; the new one starts rising once it is mostly clear
  let mx = 0, my = 0, tmx = 0, tmy = 0, raf = 0, last = 0, now = 0;
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; kick(); }, { passive: true });
  const frame = ts => {
    raf = 0; if (!ok) return;
    const dt = Math.min(.033, (ts - (last || ts)) / 1000); last = ts; now = ts / 1000;
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    let busy = false;
    // every piece springs from wherever it is right now, so a hop mid-move never snaps.
    // in: float up from below and fade in (soft spring, one small overshoot)
    // up: another card took over, lift a short way and fade out fast (exits quicker than entrances)
    // down: off the cards, sink a little and fade out
    for (const set of Object.values(sets)) {
      const age = now - set.since;
      if (set.target) busy = true;
      for (const o of set.items) {
        if (o.a == null) { o.y = o.rise; o.vy = 0; o.a = 0; o.sc = 1; o.vs = 0; }   // y here is the offset from its resting spot
        let ty, ta, K, C, ka, ts = 1, KS = 260, CS = 26;
        if (set.mode === 'in' || set.mode === 'pop') {
          const wait = set.mode === 'pop' ? o.ripple : o.delay + (set.lag || 0);
          if (o.a < .02 && age < wait) {   // still waiting its turn: parked below (fresh) or shrunk in its slot (swap)
            if (set.mode === 'pop') { o.y = 0; o.vy = 0; o.sc = .55; o.vs = 0; } else { o.y = o.rise; o.vy = 0; o.sc = 1; o.vs = 0; }
            o.a = 0; o.outer.setAttribute('opacity', '0'); continue;
          }
          ty = 0; ta = 1; K = 90; C = 12.3; ka = set.mode === 'pop' ? 14 : 24;   // solid within ~.1 s: the rise carries the entrance, not a fade
          if (set.mode === 'pop') { KS = 320; CS = 17; }   // a quick pop with one small overshoot
        } else {
          if (o.a <= .004) { o.a = 0; o.y = o.rise; o.vy = 0; o.sc = 1; o.vs = 0; o.outer.setAttribute('opacity', '0'); continue; }   // gone: park below for next time
          if (set.mode === 'swap') {   // another card took over: the old set lifts a little and shrinks away, gone in EXIT s (never a slow see-through drift)
            if (o.sy == null) { o.sy = o.y; o.sa = o.a; o.ss = o.sc; }
            const e = Math.min(1, age / EXIT), k = 1 - (1 - e) * (1 - e);   // ease-out: moves the instant you hop
            o.y = o.sy - EXIT_LIFT * o.k * k; o.vy = 0; o.sc = o.ss * (1 - .4 * k); o.vs = 0; o.a = e >= 1 ? 0 : o.sa * (1 - k);
            if (e < 1) busy = true;
            K = 0; ka = 0; ta = o.a; ty = o.y; ts = o.sc;
          }
          else { ty = o.lift * .6; ta = 0; K = 260; C = 32; ka = 16; }
        }
        if (reduce) { o.y = 0; o.vy = 0; o.sc = 1; } else if (K) {
          { o.vy += (-K * (o.y - ty) - C * o.vy) * dt; o.y += o.vy * dt; }
          o.vs += (-KS * (o.sc - ts) - CS * o.vs) * dt; o.sc += o.vs * dt;
        }
        if (ka) o.a += (ta - o.a) * (1 - Math.exp(-ka * dt));
        if (Math.abs(o.a - ta) > .004 || Math.abs(o.y - ty) > .3 || Math.abs(o.vy) > .5 || Math.abs(o.sc - ts) > .003) busy = true;
        const A = reduce ? 0 : 1;
        const fy = Math.sin(now * o.w + o.ph) * (2 + o.d * 4) * o.k * A;
        const fr = o.tilt + Math.sin(now * o.w * .8 + o.ph * 1.3) * o.rot * A;
        const px = -mx * 30 * o.d * A, py = -my * 18 * o.d * A;
        o.outer.setAttribute('opacity', Math.max(0, Math.min(1, o.a)).toFixed(3));
        o.outer.setAttribute('transform', `translate(${(o.tx + px).toFixed(1)} ${(o.ty + o.y + py + fy).toFixed(1)})`);
        o.inner.setAttribute('transform', `rotate(${fr.toFixed(2)}) scale(${Math.max(0, o.sc).toFixed(3)})`);
        if (o.a > .004) busy = true;   // keeps the idle float going while visible
      }
    }
    if (busy) raf = requestAnimationFrame(frame); else last = 0;
  };
  const kick = () => { if (!raf && ok) raf = requestAnimationFrame(frame); };

  // ---- hover / focus on the cards ----
  let hideT = 0;
  // card to card: the old set scoops up and away while the new one floats up from below, like a fresh hover.
  const show = (name, card) => {
    clearTimeout(hideT);
    const t = performance.now() / 1000;
    const swapping = Object.entries(sets).some(([n, s]) => n !== name && (s.target || s.items.some(o => o.a > .05)));
    if (swapping && card) {
      const f = fold.getBoundingClientRect(), c = card.getBoundingClientRect(), cx = c.left + c.width / 2 - f.left, cy = c.top + c.height / 2 - f.top;
      const far = Math.hypot(f.width, f.height) * .6;
      for (const o of sets[name].items) o.ripple = .06 + Math.min(1, Math.hypot(o.tx - cx, o.ty - cy) / far) * .16;
    }
    for (const [n, set] of Object.entries(sets)) {
      const want = n === name ? 1 : 0;
      if (want && (!set.target || set.mode === 'swap')) { set.mode = 'in'; set.since = t; set.lag = swapping ? SWAP_LAG : 0; }   // the new set always rises from below
      if (!want && (set.target || set.mode === 'in' || set.mode === 'pop')) { set.mode = 'swap'; set.since = t; for (const o of set.items) o.sy = null; }   // exit starts from where each piece is now
      set.target = want;
    }
    kick();
  };
  const hide = () => { clearTimeout(hideT); hideT = setTimeout(() => { for (const set of Object.values(sets)) { if (set.target) { set.mode = 'down'; set.since = performance.now() / 1000; } set.target = 0; } kick(); }, 160); };   // off the cards: sink and fade (the wait lets you cross the gap to the next card)
  cards.querySelectorAll('.hero-card').forEach(a => {
    const name = Object.keys(SETS).find(n => a.classList.contains(`hero-card-${n}`));
    if (!name) return;
    const slot = a.closest('.hero-card-slot') || a;
    slot.addEventListener('pointerenter', () => show(name, slot));
    slot.addEventListener('pointerleave', hide);
    a.addEventListener('focus', () => show(name, slot));
    a.addEventListener('blur', hide);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); kick(); }, 150); }, { passive: true });
})();
