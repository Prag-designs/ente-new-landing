// Hero intro.
// 1. The full stop after "stuff" winds up: it pulls back to the right,
//    then shoots left and smacks into the "f".
// 2. The hit runs through "All the good stuff" as a compression wave: the
//    letters are masses on springs, so they bunch a little to the left and
//    spring back. Each letter turns Ente green the instant the wave reaches it.
// 3. Then "nonsense" is struck out, goes grey and gets knocked crooked.
(() => {
  const root = document.documentElement;
  const title = document.querySelector('.hero-title');
  const dot = title && title.querySelector('.hero-dot');
  if (!dot) return;
  const struck = title.querySelector('.hero-word-struck');
  const words = [...title.querySelectorAll('.hero-line-good .hero-word')];
  const SLOW = Math.max(1, +new URLSearchParams(location.search).get('slow') || 1); // ?slow=5 to study the hit
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // split each word into letter spans (inline, so kerning is kept)
  const letters = [];
  words.forEach(w => {
    const text = w.textContent;
    w.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'hl';
      s.textContent = ch;
      w.appendChild(s);
      letters.push(s);
    }
  });

  const green = () => {
    letters.forEach(l => l.classList.add('is-green'));
    dot.classList.add('is-green');
    // the f/. pair again, now in Nunito
    const fsz = parseFloat(getComputedStyle(title).fontSize);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `900 ${fsz}px Nunito`;
    const k = c.measureText('f.').width - c.measureText('f').width - c.measureText('.').width;
    dot.style.marginLeft = (k / fsz - 0.06).toFixed(4) + 'em';
  };
  if (reduce) {
    green();
    struck && struck.classList.add('is-dead');
    root.classList.add('strike-go', 'cards-go');
    return;
  }

  // grey "nonsense" while the strike is being drawn (strike: 1.15s, .42s)
  // grey as the line is drawn, then the knock when it finishes (strike: 1.15s + .3s)
  // order: the dot swings and hits first (green wave), THEN the strike draws through "nonsense".
  // The strike's CSS animation stays paused until html.strike-go; is-dead / is-knocked follow it.
  let strikeDone = false;
  const strike = () => {
    if (strikeDone) return; strikeDone = true;
    setTimeout(() => {
      root.classList.add('strike-go');
      setTimeout(() => struck && struck.classList.add('is-dead'), 420);
      setTimeout(() => struck && struck.classList.add('is-knocked'), 400);
    }, 350 * SLOW);
  };
  addEventListener('hero:hit', strike, { once: true });
  setTimeout(strike, 3500);   // never leave the strike undrawn if the hit never fires

  const START = 100;    // everything starts together: blur-in, strike, dot swing, duckies
  const t0 = performance.now();
  (document.fonts ? Promise.all([document.fonts.ready, document.fonts.load('900 1em Nunito').catch(() => {})]) : Promise.resolve()).then(() => {
    const cs = getComputedStyle(title);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // the dot sits in its own element, so put the f/. kerning back
    const kern = ctx.measureText('f.').width - ctx.measureText('f').width - ctx.measureText('.').width;
    dot.style.marginLeft = (kern / parseFloat(cs.fontSize)).toFixed(4) + 'em';
    setTimeout(() => run(parseFloat(cs.fontSize), ctx), Math.max(0, START - (performance.now() - t0)));
  });

  function run(fs, ctx) {
    dot.style.animation = 'none';
    dot.style.opacity = '1';
    dot.style.transform = 'none';

    // scale the dot around its ink centre (it sits on the baseline)
    const dm = ctx.measureText('.');
    const d = dm.actualBoundingBoxAscent + dm.actualBoundingBoxDescent;
    const r = dot.getBoundingClientRect();
    const probe = document.createElement('i');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    dot.appendChild(probe);
    const base = probe.getBoundingClientRect().top;
    probe.remove();
    const inkCx = (dm.actualBoundingBoxRight - dm.actualBoundingBoxLeft) / 2;
    dot.style.transformOrigin = `${inkCx}px ${base - d / 2 - r.top}px`;
    const setDot = (x, sx, sy, y = 0) => {
      dot.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    };

    // ---- the chain: every letter, then the dot, joined by springs ----
    const N = letters.length + 1;          // last mass is the dot
    const KC = 1700;                        // letter to letter: soft, so the wave is visible
    const KA = 300;                         // each letter back to its place
    const CA = 7;                           // damping to its place
    const CC = 5;                           // damping between neighbours
    const M = Float64Array.from({ length: N }, (_, i) => (i === N - 1 ? 2.2 : 1));
    const step = (u, v, dt) => {
      const a = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        a[i] = -KA * u[i] - CA * v[i];
        if (i > 0) a[i] += -KC * (u[i] - u[i - 1]) - CC * (v[i] - v[i - 1]);
        if (i < N - 1) a[i] += -KC * (u[i] - u[i + 1]) - CC * (v[i] - v[i + 1]);
      }
      for (let i = 0; i < N; i++) { v[i] += a[i] / M[i] * dt; u[i] += v[i] * dt; }
    };

    // hit speed that moves the "f" by SHIFT (the system is linear)
    const DT = 1 / 480;
    const SHIFT = 0.2 * fs;
    let V0;
    {
      const u = new Float64Array(N), v = new Float64Array(N);
      v[N - 1] = -1;
      let peak = 0;
      for (let s = 0; s < 480; s++) { step(u, v, DT); peak = Math.max(peak, Math.abs(u[N - 2])); }
      V0 = -SHIFT / peak;
    }

    // ---- stage for the trail and the sparks ----
    const wrap = dot.parentElement;            // .hero-nowrap
    wrap.style.position = 'relative';
    const wr = wrap.getBoundingClientRect();
    const restX = r.left - wr.left + inkCx;    // dot ink centre, in wrap space
    const restY = base - d / 2 - wr.top;
    // echo: three faint copies of the dot a few frames behind it, only when it moves fast
    const ECHO = [ { lag: 14, op: .26 }, { lag: 28, op: .14 }, { lag: 42, op: .06 } ];
    const echoes = ECHO.map(() => {
      const e = document.createElement('i');
      e.className = 'hero-dot-echo';
      e.style.cssText = `position:absolute;left:${restX - d / 2}px;top:${restY - d / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:currentColor;pointer-events:none;opacity:0;`;
      wrap.insertBefore(e, dot);
      return e;
    });
    const history = [];
    const xAt = (tt) => {
      for (let i = history.length - 1; i > 0; i--) {
        if (history[i - 1].t <= tt) {
          const a = history[i - 1], b = history[i];
          return a.x + (b.x - a.x) * ((tt - a.t) / Math.max(1e-6, b.t - a.t));
        }
      }
      return history.length ? history[0].x : 0;
    };
    const drawTrail = (now, x) => {
      now = now / SLOW;
      history.push({ t: now, x });
      while (history.length > 2 && now - history[1].t > 60) history.shift();
      ECHO.forEach((c, i) => {
        const ex = xAt(now - c.lag);
        const gap = Math.abs(x - ex);
        const show = gap > d * 0.6 ? Math.min(1, (gap - d * 0.6) / d) : 0;
        echoes[i].style.opacity = (c.op * show).toFixed(3);
        echoes[i].style.transform = `translateX(${ex.toFixed(2)}px)`;
      });
    };
    const hideEcho = () => echoes.forEach(e => { e.style.opacity = '0'; });

    const sparks = (x, y) => {
      const angles = [-115, -82, -52, -22, 22, 52, 82, 115];
      angles.forEach((deg, i) => {
        const s = document.createElement('i');
        const len = d * (0.9 + (i % 3) * 0.25), th = Math.max(2, d * 0.22);
        s.style.cssText = `position:absolute;left:${x}px;top:${y - th / 2}px;width:${len}px;height:${th}px;border-radius:999px;background:var(--ente-green);transform-origin:0 50%;pointer-events:none;`;
        wrap.appendChild(s);
        const rad = deg * Math.PI / 180, dist = d * (1.6 + (i % 2) * 0.7);
        s.animate([
          { transform: `rotate(${deg}deg) translateX(${d * 0.5}px) scaleX(.2)`, opacity: 1 },
          { transform: `rotate(${deg}deg) translateX(${dist}px) scaleX(1)`, opacity: 1, offset: .45 },
          { transform: `rotate(${deg}deg) translateX(${dist * 1.35}px) scaleX(0)`, opacity: 0 },
        ], { duration: 380 * SLOW, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => s.remove();
      });
    };

    const line = title.querySelector('.hero-line-good');

    // ---- the wind-up, the shot, the hit ----
    const PULL = 1.05 * fs;                    // how far right it swings out
    // out and straight back, no hold: out decelerates to a stop at the far end,
    // back accelerates from that same instant (like a spring released at its stretch)
    const T_OUT = 0.27, T_BACK = 0.14;
    const T_PULL = T_OUT, T_HOLD = 0, T_SHOT = T_BACK;
    const DARK = getComputedStyle(dot).color;

    const u = new Float64Array(N), v = new Float64Array(N);
    const lit = new Uint8Array(N);
    let startT = null, hitT = null, acc = 0, last = 0;
    const T_HIT = T_PULL + T_HOLD + T_SHOT;

    // when a letter changes font the line re-lays; every glyph glides from where it was
    const els = [...letters, dot];
    const fx = new Float64Array(N), fy = new Float64Array(N), fvx = new Float64Array(N), fvy = new Float64Array(N);
    const jl = new Float64Array(N), jv = new Float64Array(N);
    const FK = 520, FC = 2 * 0.5 * Math.sqrt(520);    // glide: a little overshoot
    const JK = 650, JC = 2 * 0.22 * Math.sqrt(650);   // jelly: wobbly
    const nunitoKern = () => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `900 ${fs}px Nunito`;
      const k = c.measureText('f.').width - c.measureText('f').width - c.measureText('.').width;
      return (k / fs - 0.06).toFixed(4) + 'em';
    };
    const layout = () => {
      const saved = els.map(e => e.style.transform);
      els.forEach(e => { e.style.transform = 'none'; });
      const p = els.map(e => { const q = e.getBoundingClientRect(); return [q.left, q.top]; });
      els.forEach((e, i) => { e.style.transform = saved[i]; });
      return p;
    };
    const swap = idx => {
      const before = layout();
      idx.forEach(i => {
        els[i].classList.add('is-green');
        if (els[i] === dot) dot.style.marginLeft = nunitoKern();
        jv[i] += 14;                       // pop: the letter stretches up as it changes
      });
      const after = layout();
      for (let i = 0; i < N; i++) { fx[i] += before[i][0] - after[i][0]; fy[i] += before[i][1] - after[i][1]; }
    };

    const frame = now => {
      if (startT === null) startT = now;
      const t = (now - startT) / 1000 / SLOW;

      if (t < T_HIT) {
        let x, sx, sy;
        if (t < T_OUT) {
          // out: sine ease, fast leaving, slowing only at the very end; leans away
          const p = t / T_OUT, k = Math.sin(p * Math.PI / 2);
          x = PULL * k;
          const lean = Math.sin(p * Math.PI);
          sx = 1 + 0.14 * lean - 0.1 * p * p; sy = 1 - 0.08 * lean + 0.1 * p * p;
        } else {
          // back: cosine from rest at the far end, accelerating hard into the f
          const p = (t - T_OUT) / T_BACK, k = 1 - Math.cos(p * Math.PI / 2);
          x = PULL * (1 - (k * 0.35 + p * p * p * 0.65));
          sx = 0.9 + 0.85 * p; sy = 1.1 - 0.48 * p;
        }
        setDot(x, sx, sy);
        drawTrail(now, x);
        return requestAnimationFrame(frame);
      }

      if (hitT === null) {
        // contact: the f and the dot change first, sparks fly, the wave starts at once
        hitT = now; last = now;
        v[N - 1] = V0;
        // the whole line turns green in one go, on the hit
        swap([...Array(N).keys()]);
        lit.fill(1);
        sparks(restX - d * 0.5, restY);
        hideEcho();
        setTimeout(() => root.classList.add('cards-go'), 240);
        dispatchEvent(new Event('hero:hit'));   // hitshine.js: the light sweep and the stars
      }
      const ph = (now - hitT) / 1000 / SLOW;

      const dt = Math.min(0.05, (now - last) / 1000) / SLOW;
      acc += dt;
      last = now;
      while (acc >= DT) { step(u, v, DT); acc -= DT; }
      // FLIP springs (glide from the old layout to the new one) and jelly springs
      for (let i = 0; i < N; i++) {
        fvx[i] += (-FK * fx[i] - FC * fvx[i]) * dt; fx[i] += fvx[i] * dt;
        fvy[i] += (-FK * fy[i] - FC * fvy[i]) * dt; fy[i] += fvy[i] * dt;
        jv[i] += (-JK * jl[i] - JC * jv[i]) * dt; jl[i] += jv[i] * dt;
      }

      // draw: slide + glide + jelly squash from how hard the neighbours press in
      const LW = fs * 0.5;
      for (let i = 0; i < N - 1; i++) {
        const left = i ? u[i - 1] : u[i], right = u[i + 1];
        const press = Math.max(-0.3, Math.min(0.3, (right - left) / (2 * LW) * 1.8)); // <0 squeezed
        const sx = 1 + press * 0.9 - jl[i] * 0.07;
        const sy = 1 - press * 0.7 + jl[i] * 0.1;
        const lift = -Math.max(0, -press) * fs * 0.05;
        letters[i].style.transform =
          `translate(${(u[i] + fx[i]).toFixed(2)}px, ${(fy[i] + lift).toFixed(2)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      }
      // the line shakes from the blow
      const shake = fs * 0.025 * Math.exp(-ph * 16);
      line.style.transform = `translate(${(Math.sin(ph * 95) * shake).toFixed(2)}px, ${(Math.cos(ph * 120) * shake * 0.6).toFixed(2)}px)`;
      // the dot: squashed flat against the f, wobbling back round as it recoils
      const sq = 0.45 * Math.exp(-ph * 10) * Math.cos(ph * 36);
      setDot(u[N - 1] + fx[N - 1] - d * 0.12 * Math.exp(-ph * 14), 1 - sq, 1 + sq * 0.8, fy[N - 1]);

      let energy = 0;
      for (let i = 0; i < N; i++) energy += Math.abs(u[i]) + Math.abs(v[i]) * 0.02 + Math.abs(fx[i]) + Math.abs(fy[i]) + Math.abs(jl[i]) * 3;
      if (ph > 0.6 && energy < 0.12 && lit.every(Boolean)) {
        letters.forEach(l => { l.style.transform = ''; });
        line.style.transform = '';
        dot.style.transform = 'none';
        echoes.forEach(e => e.remove());
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();

// Hero scale: title size over its full size (110px). --hero-k drives the hover
// art, --hero-cards-k the product cards (eased, so they shrink a little less).
(() => {
  const root = document.documentElement;
  const set = () => {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    const full = 6.9 * parseFloat(getComputedStyle(root).fontSize);
    const k = innerWidth <= 820 ? 1 : Math.min(1, parseFloat(getComputedStyle(title).fontSize) / full);
    root.style.setProperty('--hero-k', k.toFixed(3));
    root.style.setProperty('--hero-cards-k', Math.pow(k, .7).toFixed(3));
  };
  set();
  addEventListener('resize', set, { passive: true });
})();
