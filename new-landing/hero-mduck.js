// Phone hero: the Ducky group is the live Rive scene ("Hero" artboard). It opens on the front pair only.
// The first scroll down fires the file's "scroll" trigger: the back pair (No snooping + No ads) pops up from
// behind, and the page holds still while they rise. After that the page scrolls on as normal.
// The static picture stays as the fallback if Rive does not load.
(() => {
  const img = document.querySelector('.hero-mduck');
  const root = document.documentElement;
  const placed = () => root.classList.add('mduck-placed');
  if (!img || !window.rive || !matchMedia('(width <= 820px)').matches) { root.classList.remove('mduck-wait'); return; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = 1100;   // ms the page waits while the back pair rises (rise .62 s + settle, both Duckies)

  const box = document.createElement('div');
  box.className = 'hero-mduck-rive';
  box.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  box.appendChild(canvas);
  img.after(box);
  document.documentElement.classList.add('mduck-rive');   // hides the picture while the scene loads

  const fallback = () => { root.classList.remove('mduck-rive', 'mduck-wait'); box.remove(); const i = document.querySelector('.hero-inner'); i && (i.style.translate = ''); };
  const failT = setTimeout(fallback, 6000);   // never leave an empty hero

  // The Duckies run edge to edge (artboard drawn 12% big), full size, feet on the visible bottom. If a short
  // screen leaves less room under the headline, they shrink (never under 85%) and the front pair may run off the
  // bottom rather than the risen No ads sign touching the headline.
  const S = 1.12, ART_TOP = -.06, GAP = 20;   // drawn 12% big (mobile.css): the risen sign peaks ~6% of h above the box top
  const fit = () => {
    box.style.height = ''; box.style.marginTop = '';
    const nat = box.offsetHeight;
    const cards = document.querySelector('.hero-cards'), card = cards && cards.offsetParent && (document.querySelector('.hero-cards .hero-card-slot.is-selected .hero-card') || document.querySelector('.hero-cards .hero-card'));
    const above = card || document.querySelector('.hero-title');
    if (!above) return;
    const rowB = above.getBoundingClientRect().bottom + scrollY + GAP;
    const vb = Math.min(innerHeight, window.visualViewport ? visualViewport.height : innerHeight);
    const h = Math.round(Math.min(nat, Math.max(nat * .85, (vb - rowB) / (1 - ART_TOP))));
    box.style.height = h + 'px';
    const top = box.getBoundingClientRect().top + scrollY, mt = parseFloat(getComputedStyle(box).marginTop) || 0;
    const want = Math.max(rowB - ART_TOP * h, vb - h);
    if (Math.abs(want - top) > .5) box.style.marginTop = Math.round(mt + want - top) + 'px';
  };
  // Before the reveal only the front pair shows, which leaves a gap under the headline on a tall screen. Until then
  // the headline sits lower, just above the party hat; the first scroll lifts it back up together with the back pair.
  const FRONT_TOP = .39, CLEAR = 64;   // FRONT_TOP: the front pair's top (party hat) as a share of the box height
  const inner = document.querySelector('.hero-inner'), title = document.querySelector('.hero-title');
  let lifted = reduce;
  const drop = () => {
    if (lifted || !inner || !title) return;
    inner.style.translate = '';
    const b = box.getBoundingClientRect(), d = b.top + FRONT_TOP * b.height - CLEAR - title.getBoundingClientRect().bottom;
    inner.style.translate = d > 4 ? `0 ${Math.round(d)}px` : '';
  };
  const lift = () => {
    if (lifted) return;
    lifted = true;
    if (!inner || !inner.style.translate) return;
    inner.style.transition = 'translate .7s cubic-bezier(.23, 1, .32, 1)';   // the back pair's rise: .62 s strong ease-out
    inner.style.translate = '';
  };
  const size = () => {
    if (scrollY < 4) { if (!lifted && inner) inner.style.translate = ''; fit(); drop(); }   // fit against the headline's real place, then lower it   // only at the top: the toolbar hiding on scroll must not resize the scene
    const r = box.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1) * S;   // drawn at the scaled size, stays sharp
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  };
  size();
  // show the headline and the Duckies once fonts have settled (the headline's size depends on them), placed for good
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1200))]).then(() => { size(); placed(); });
  let ready = false;
  const r = new rive.Rive({
    src: '/assets/new-landing/ente-hero-duckies.riv?v=13',
    canvas, artboard: 'Hero', stateMachines: 'State Machine', autoplay: true, autoBind: true,
    layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
    onLoad: () => {
      clearTimeout(failT);
      size(); r.resizeDrawingSurfaceToCanvas();
      box.classList.add('is-live');
      ready = true;
      if (reduce || scrollY > 8) fire(false);   // already past the top (or no motion wanted): show all four
      else watch();
    },
    onLoadError: () => { clearTimeout(failT); fallback(); },
  });
  const resize = () => { size(); if (ready) r.resizeDrawingSurfaceToCanvas(); };
  addEventListener('resize', resize, { passive: true });
  window.visualViewport && visualViewport.addEventListener('resize', resize);
  // fonts, the pill intro and a browser's bars all settle after this runs: measure again once they have
  addEventListener('load', resize); document.fonts && document.fonts.ready.then(resize); setTimeout(resize, 900); setTimeout(resize, 2000);

  // ---- the reveal ----
  let state = 'wait', holdUntil = 0;   // wait -> playing (page held) -> done
  const fire = hold => {
    if (state !== 'wait' || !ready) return;
    const t = r.viewModelInstance && r.viewModelInstance.trigger('scroll');
    if (!t) { state = 'done'; lift(); return; }
    t.trigger();
    lift();
    if (!hold) { state = 'done'; return; }
    state = 'playing'; holdUntil = performance.now() + HOLD;
    setTimeout(() => { state = 'done'; }, HOLD);
  };
  // hold the page only while the Duckies can be seen; if they are mostly off screen, reveal them when they arrive
  const inView = () => { const b = box.getBoundingClientRect(); return Math.min(b.bottom, innerHeight) - Math.max(b.top, 0) > b.height * .5; };
  const held = () => state === 'playing' && performance.now() < holdUntil;

  const watch = () => {
    if (!inView()) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.intersectionRatio >= .5)) { io.disconnect(); fire(false); } }, { threshold: [.5] });
      io.observe(box);
    }
    // wheel / trackpad (a narrow desktop window)
    addEventListener('wheel', e => {
      if (held()) { e.preventDefault(); return; }
      if (state === 'wait' && e.deltaY > 0 && inView()) { e.preventDefault(); fire(true); }
    }, { passive: false });
    // touch: only an upward (scroll-down) swipe counts; sideways swipes stay with the product pill row
    let sx = 0, sy = 0, dir = '';
    addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dir = ''; }, { passive: true });
    addEventListener('touchmove', e => {
      const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (!dir && Math.hypot(dx, dy) > 4) dir = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
      if (dir !== 'v') return;
      if (held()) { if (e.cancelable) e.preventDefault(); return; }
      if (state === 'wait' && dy < 0 && inView()) { if (e.cancelable) e.preventDefault(); fire(true); }
    }, { passive: false });
    // keyboard scrolling
    addEventListener('keydown', e => {
      if (!['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key) || e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (held()) { e.preventDefault(); return; }
      if (state === 'wait' && inView()) { e.preventDefault(); fire(true); }
    });
    // anything else that moves the page (scrollbar drag, a link to #products): reveal, no hold
    addEventListener('scroll', () => { if (state === 'wait' && scrollY > 8) fire(false); }, { passive: true });
  };

  // only draw while the Duckies are on screen
  new IntersectionObserver(es => { if (!ready) return; es[0].isIntersecting ? r.play() : r.pause(); }).observe(box);
})();
