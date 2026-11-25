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
  const AR = {camera: 1.3153, polaroid: 0.8306, filmroll: 1.3229, frame: 1.2514, cloud: 1.3314, heart: 1.0336, album: 0.7769, mappin: 0.7306, shield: 0.8857, lock: 0.7983, fingerprint: 0.961, codephone: 0.6903, keys: 0.8004, otp: 1.5611, stopwatch: 0.7889, qrcode: 1.0047, vault: 1.2339, passport: 0.8386, docfolder: 1.3599, password: 2.2115, diploma: 1.8955, idcard: 1.4055, housedeed: 0.8406, medical: 0.8145};

  // ---- composition: four pieces per side, placed by hand like stickers thrown around a title. Every product and
  // side has its own arrangement (a pair up top, a pair at the bottom, a loose arc, a sweep), so there are no
  // rows, no zig-zag and no mirror between the two sides. Fixed numbers, the same on every load.
  // slot = [u across (0 = screen edge, 1 = headline side), v down, size, tilt]. Rules the table keeps:
  //   two pieces share a height only at the very top or bottom, and then sit at opposite ends of the zone;
  //   beside the headline and the cards a piece stays in the outer half, so the text has air;
  //   sizes stay within a narrow band, so every piece carries about the same weight.
  // pieces redrawn as clean vectors (Quiver), the rest are still the GPT pictures
  const VEC = { has: () => true };   // every piece is now a clean Quiver vector
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

  // the boss's own layouts, placed by hand at 14 inch (1512 x 860): icon centre x/y and width in px, tilt in degrees.
  // Other laptop sizes keep each icon's place relative to the headline (x between screen edge and headline, y down the
  // fold) and scale it with the headline. Big monitors over 2200 wide keep the eight-piece table.
  const HAND_F = { w: 1512, top: 82, h: 778, l: 363.39, r: 1150.49 };
  const HAND = {
    auth:   [['shield', 260, 189, 115, 6], ['codephone', 155, 433, 126, -16], ['stopwatch', 254, 688, 132, -15], ['keys', 1250, 206, 129, -6], ['fingerprint', 1378, 436, 128, 5], ['otp', 1285, 719, 219, 16]],
    locker: [['password', 232, 206, 227, -25], ['vault', 171, 473, 156, -5], ['idcard', 260, 744, 158, -23], ['housedeed', 1297, 242, 131, -11], ['diploma', 1346, 470, 192, 5], ['medical', 1249, 717, 117, 14]],
    photos: [['frame', 236, 232, 160, -26], ['heart', 173, 483, 139, -16], ['camera', 240, 704, 138, -8], ['cloud', 1282, 207, 148, 13], ['filmroll', 1345, 447, 152, 11], ['album', 1273, 697, 115, 23]],
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
      img.setAttribute('href', ART + 't-' + name + '-' + art + (VEC.has(name + '-' + art) ? '.svg?v=6' : '.webp?v=4'));   // each set drawn in its product's colour; bump to refetch
      inner.appendChild(img); outer.appendChild(inner); outer.setAttribute('opacity', '0');
      g.appendChild(outer);
      const draw = w => { draw.w = w; const h = w / ar; img.setAttribute('width', w.toFixed(1)); img.setAttribute('height', h.toFixed(1)); img.setAttribute('x', (-w / 2).toFixed(1)); img.setAttribute('y', (-h / 2).toFixed(1)); };
      items.push({ art, role: i === 2 ? 'main' : 'obj', side, u, vv: v, x, y, s, d, tilt, ar, draw, outer, inner, p: 0, v: 0, T: { u, vv: v, s, d, tilt },
        ph: (x * 7 + y * 13) % 6.28, w: .6 + ((x + y) % 50) / 100, rot: 3 + (x % 3) });
    }));
    sets[name] = { g, items, target: 0, since: 0, mode: 'down' };
  }

  // ---- spread each side's pieces over its whole zone ----
  let ok = false, G = null;
  const place = set => {
    if (!G) return;
    const { zones, top, bot, H, base, t, f } = G;
    const hk = (t.right - t.left) / (HAND_F.r - HAND_F.l);   // the headline's width against the 14 inch one
    for (const o of set.items) {
      if (o.hand) {   // a hand-placed piece
        const [, x, y, w0, rot] = o.hand, left = x < HAND_F.w / 2;
        const w = Math.max(56, w0 * hk), h = w / o.ar;
        const ta = Math.abs(rot) * Math.PI / 180, bw = w * Math.cos(ta) + h * Math.sin(ta), bh = w * Math.sin(ta) + h * Math.cos(ta);
        let vx = left ? x / HAND_F.l * t.left : innerWidth - (HAND_F.w - x) / (HAND_F.w - HAND_F.r) * (innerWidth - t.right);
        const lo = left ? 8 + bw / 2 : t.right + bw / 2, hi = left ? t.left - bw / 2 : innerWidth - 8 - bw / 2;   // never over the headline or off screen
        vx = hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, vx));
        const vy = f.top + (y - HAND_F.top) * f.height / HAND_F.h;
        o.bw = bw; o.bh = bh; o.tilt = rot; o.vv = Math.min(1, Math.max(0, (y - HAND_F.top) / HAND_F.h));
        o.tx = vx - f.left; o.ty = Math.max(8 + bh / 2, Math.min(f.height - 8 - bh / 2, vy - f.top));
        o.cx = o.tx; o.cy = o.ty;
        o.d = Math.min(1, Math.max(.35, .5 + (w0 / 140 - .88) * .9));   // bigger reads closer: more parallax
        o.k = base / 120; o.draw(w); o.h = h;
        o.delay = (1 - o.vv) * .12 + (left ? 0 : .02);
        o.rise = Math.max(70, H * .12); o.lift = o.rise * .5;
        continue;
      }
      // same visual weight for every shape: size by area, not width (a wide chat bubble and a tall lock read
      // the same size). The hand-made table keeps sizes close; a random small-screen pick (o.ssz) varies more
      const ss = o.ssz || .82 + (o.s - .6) * .4;
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
    // safety net: push a pair of shown pieces apart vertically if they ever come closer than 24px
    const on = set.items.filter(o => !o.off && !o.hand);
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const a of on) for (const b of on) {
        if (a === b || a.side !== b.side || a.ty > b.ty) continue;
        const ox = (a.bw + b.bw) / 2 + 24 - Math.abs(a.tx - b.tx), oy = (a.bh + b.bh) / 2 + 24 - (b.ty - a.ty);
        if (ox <= 0 || oy <= 0) continue;
        const push = oy / 2 + .5;
        a.ty = Math.max(top + a.bh / 2, a.ty - push); b.ty = Math.min(bot - b.bh / 2, b.ty + push);
        a.cy = a.ty; b.cy = b.ty; moved = true;
      }
      if (!moved) break;
    }
  };
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
    G = { zones, top, bot, H, base, t, f };
    for (const set of Object.values(sets)) place(set);
    ok = true;
  };

  // ---- motion: a spring per piece, running only while something is shown or moving ----
  const EXIT = .16, EXIT_LIFT = 34, SWAP_LAG = .07;
  const OUT = .2, OUT_DROP = 14, OUT_STAGGER = .05;   // leaving the cards
  const PAR = .7;   // on scroll a piece moves up 1.35-1.55x the page speed, by its depth   // old set gone in .16 s; the new one starts rising once it is mostly clear
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
        if (o.off && (set.mode === 'in' || set.mode === 'pop') && o.a <= .004) { o.a = 0; o.y = o.rise; o.vy = 0; o.sc = 1; o.vs = 0; o.outer.setAttribute('opacity', '0'); continue; }   // not picked this time (small window)
        let ty, ta, K, C, ka, ts = 1, KS = 260, CS = 26;
        if ((set.mode === 'in' || set.mode === 'pop') && !o.off) {   // an unpicked piece still showing sinks away like 'down'
          const wait = set.mode === 'pop' ? o.ripple : o.delay + (set.lag || 0);
          if (o.a < .02 && age < wait) {   // still waiting its turn: parked below (fresh) or shrunk in its slot (swap)
            if (set.mode === 'pop') { o.y = 0; o.vy = 0; o.sc = .55; o.vs = 0; } else { o.y = o.rise; o.vy = 0; o.sc = 1; o.vs = 0; }
            o.a = 0; o.outer.setAttribute('opacity', '0'); continue;
          }
          ty = 0; ta = 1; K = 90; C = 12.3; ka = set.mode === 'pop' ? 14 : 24;   // solid within ~.1 s: the rise carries the entrance, not a fade
          if (set.mode === 'pop') { KS = 320; CS = 17; }   // a quick pop with one small overshoot
        } else {
          if (o.a <= .004) { o.a = 0; o.y = o.rise; o.vy = 0; o.sc = 1; o.vs = 0; o.outer.setAttribute('opacity', '0'); continue; }   // gone: park below for next time
          if (set.mode === 'swap' || set.mode === 'out') {   // swap: another card took over, the old set lifts a little and shrinks away in EXIT s.
            // out: off the cards, each piece shrinks back into its own spot and drops a touch, top ones first (the entrance in reverse), all gone in under .25 s
            if (o.sy == null) { o.sy = o.y; o.sa = o.a; o.ss = o.sc; }
            const out = set.mode === 'out', wait = out ? o.vv * OUT_STAGGER : 0, dur = out ? OUT : EXIT;
            const e = Math.max(0, Math.min(1, (age - wait) / dur)), k = 1 - (1 - e) * (1 - e) * (1 - e);   // strong ease-out: moves the instant you leave
            o.y = o.sy + (out ? OUT_DROP : -EXIT_LIFT) * o.k * k; o.vy = 0; o.sc = o.ss * (1 - (out ? .3 : .4) * k); o.vs = 0; o.a = e >= 1 ? 0 : o.sa * (1 - k);
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
        const px = -mx * 30 * o.d * A, py = -my * 18 * o.d * A - (scrollY - (set.sy0 ?? scrollY)) * PAR * o.d * A;   // scroll parallax: each piece outruns the page by its depth
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
  // fewer pieces on smaller screens: 13-16 inch laptops (up to 1800 wide) get 5 or 6, big monitors (27-32 inch)
  // 7 or 8. Below 8, every hover throws a fresh composition: which pieces, where, how big and how tilted. Each side
  // splits its height into one band per piece (so they never stack), alternates near-edge / near-headline, and gets
  // a spread of sizes and tilts, so no two pieces on a side look alike. 8 keeps the hand-made table.
  const R = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const pick = (set, name) => {
    const hand = innerWidth <= 2200 && HAND[name];
    for (const o of set.items) o.hand = hand ? hand.find(h => h[0] === o.art) || null : null;
    if (hand) { for (const o of set.items) { o.off = !o.hand; o.ssz = 0; } place(set); return; }
    const n = innerWidth <= 1440 ? 5 : innerWidth <= 1800 ? 6 : innerWidth <= 2200 ? 7 : 8, big = Math.random() < .5 ? 0 : 1;
    for (const side of [0, 1]) {
      const its = set.items.filter(o => o.side === side);
      if (n >= 8) { for (const o of its) { Object.assign(o, o.T); o.off = false; o.ssz = 0; } continue; }
      const keep = side === big ? Math.ceil(n / 2) : Math.floor(n / 2), order = shuffle(its);
      const sizes = shuffle([.88, 1, 1.12, 1.26]), par = Math.random() < .5 ? 0 : 1, sgn = Math.random() < .5 ? -1 : 1;
      order.forEach((o, i) => {
        o.off = i >= keep; if (o.off) return;
        o.vv = Math.min(1, Math.max(0, (i + R(.1, .9)) / keep));   // its own band of the height
        o.u = (i + par) % 2 ? R(.55, 1) : R(0, .4);                 // near the edge, then near the headline, in turn
        o.ssz = sizes[i]; o.d = .5 + (o.ssz - .88) * .9;             // bigger reads closer: more parallax
        o.tilt = (i % 2 ? sgn : -sgn) * R(5, 15);
      });
    }
    place(set);
  };
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
      if (want && (!set.target || set.mode === 'swap')) { if (!set.items.some(o => o.a > .05)) pick(set, n); set.mode = 'in';   // new composition only when none of it is still on screen
         set.since = t; set.lag = swapping ? SWAP_LAG : 0; set.sy0 = scrollY; }   // the new set always rises from below
      if (!want && (set.target || set.mode === 'in' || set.mode === 'pop')) { set.mode = 'swap'; set.since = t; for (const o of set.items) o.sy = null; }   // exit starts from where each piece is now
      set.target = want;
    }
    kick();
  };
  const hide = () => { hold(null); clearTimeout(hideT); hideT = setTimeout(() => { for (const set of Object.values(sets)) { if (set.target || set.mode === 'in' || set.mode === 'pop') { set.mode = 'out'; set.since = performance.now() / 1000; for (const o of set.items) o.sy = null; } set.target = 0; } kick(); }, 160); };   // off the cards: shrink away in place (the wait lets you cross the gap to the next card)
  // scrolling slides the card out from under a still cursor and the browser reports that as a leave. That is not
  // the visitor leaving: the pieces stay put and ride up with the hero. They go once the mouse really moves off.
  let scrolledAt = 0, parked = false, heldSlot = null;
  // the card under the parked pieces keeps its hover look, so the page never shows pieces with no card lit
  const hold = s => { if (heldSlot && heldSlot !== s) heldSlot.classList.remove('is-held'); heldSlot = s; if (s) s.classList.add('is-held'); };
  const scrolled = () => { scrolledAt = performance.now(); kick(); };
  addEventListener('wheel', scrolled, { passive: true }); addEventListener('scroll', scrolled, { passive: true });
  // the leave can arrive before the scroll event, so decide a beat later
  let leaveT = 0;   // a leave is decided a beat later; entering the next card cancels it, or it would hide the new set
  const leave = slot => { const t = performance.now(); clearTimeout(leaveT); leaveT = setTimeout(() => { if (cards.querySelector('.hero-card-slot:hover')) return; if (scrolledAt > t - 400) { parked = true; hold(slot); } else hide(); }, 150); };
  let px0 = -1, py0 = -1;   // after a scroll the browser sends a move at the same spot: only a real move counts
  addEventListener('pointermove', e => {
    const moved = Math.abs(e.clientX - px0) + Math.abs(e.clientY - py0) > 2; px0 = e.clientX; py0 = e.clientY;
    if (parked && moved && !(e.target.closest && e.target.closest('.hero-card-slot'))) { parked = false; hide(); }
  }, { passive: true });
  cards.querySelectorAll('.hero-card').forEach(a => {
    const name = Object.keys(SETS).find(n => a.classList.contains(`hero-card-${n}`));
    if (!name) return;
    const slot = a.closest('.hero-card-slot') || a;
    slot.addEventListener('pointerenter', () => { clearTimeout(leaveT); parked = false; hold(null); show(name, slot); });
    slot.addEventListener('pointerleave', () => leave(slot));
    a.addEventListener('focus', () => { clearTimeout(leaveT); show(name, slot); });
    a.addEventListener('blur', hide);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); kick(); }, 150); }, { passive: true });
})();
