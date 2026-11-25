// Phone hero pills: whichever card sits in the middle of the row is selected (mobile-pills.css draws it).
// Phone only (820 and below). Tapping a side card brings it to the middle; tapping the middle card opens its link.
(() => {
  const row = document.querySelector('.hero-cards');
  if (!row || getComputedStyle(row).display === 'none') return;   // the phone hero no longer shows the pill row
  const phone = matchMedia('(width <= 820px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const slots = [...row.querySelectorAll('.hero-card-slot')];
  let on = false, raf = 0, touched = false, current = null, lockUntil = 0;

  // centre of a slot, in the row's own scroll coordinates
  const centreOf = slot => {
    const r = slot.getBoundingClientRect(), rr = row.getBoundingClientRect();
    return row.scrollLeft + (r.left + r.width / 2) - (rr.left + row.clientLeft);
  };
  const scrollFor = slot => centreOf(slot) - row.clientWidth / 2;

  // the headline's green line takes the selected app's colour (Photos keeps the Ente green)
  const root = document.documentElement;
  const paint = slot => {
    const a = slot && slot.querySelector('.hero-card');
    if (!a || a.classList.contains('hero-card-photos')) { root.style.removeProperty('--pick-c'); root.classList.remove('pick-tint'); return; }
    const c = getComputedStyle(a).getPropertyValue('--brand').trim();
    if (c) { root.style.setProperty('--pick-c', c); root.classList.add('pick-tint'); }
  };
  const select = slot => {
    if (slot === current) return;
    const changed = current !== null;   // not the first pick on load: the intro already ran its own sweep
    current = slot;
    paint(slot);
    if (changed) dispatchEvent(new Event('hero:pick'));
    for (const s of slots) {
      const yes = s === slot;
      s.classList.toggle('is-selected', yes);
      const a = s.querySelector('.hero-card');
      if (a) a.classList.toggle('is-selected', yes);
    }
  };

  // the slot whose centre is closest to the middle of what is visible
  // the arc: each card drops and tilts by how far it is from the middle, like cards on a wheel
  const DROP = 22, TILT = 9;   // px and degrees at one card's step from the middle
  const arc = (s, k) => {
    const c = Math.max(-1.6, Math.min(1.6, k));
    s.style.translate = `0 ${(DROP * c * c).toFixed(2)}px`;
    s.style.rotate = `${(TILT * c).toFixed(2)}deg`;
  };
  const pick = () => {
    raf = 0;
    if (!on) return;
    const mid = row.scrollLeft + row.clientWidth / 2;
    const cs = slots.map(centreOf).sort((x, y) => x - y);   // DOM order is not the visual order (CSS order puts Photos first)
    let step = Infinity; for (let i = 1; i < cs.length; i++) step = Math.min(step, cs[i] - cs[i - 1]);
    if (!isFinite(step) || step <= 0) step = 1;
    let best = null, d = Infinity;
    for (const s of slots) {
      const off = centreOf(s) - mid;
      arc(s, off / step);
      const dd = Math.abs(off); if (dd < d) { d = dd; best = s; }
    }
    if (best && performance.now() > lockUntil) select(best);   // a tap glide keeps its pick until it lands
  };
  // when a swipe comes to rest, glide the picked card to the exact middle (CSS snap lands off centre because the cards use zoom)
  let idle = 0, down = false;
  const settle = () => {
    idle = 0;
    if (!on || down || !current) return;
    pick();
    const want = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, scrollFor(current)));
    if (Math.abs(row.scrollLeft - want) > 1) centre(current, true);
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(pick);
    clearTimeout(idle); idle = setTimeout(settle, 140);
  };
  const onDown = () => { down = true; touched = true; lockUntil = 0; };
  const onUp = () => { down = false; clearTimeout(idle); idle = setTimeout(settle, 140); };

  const centre = (slot, smooth) => {
    const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, scrollFor(slot)));
    if (smooth && !reduce.matches) row.scrollTo({ left, behavior: 'smooth' });
    else row.scrollLeft = left;
  };
  const first = () => {
    const photos = row.querySelector('.hero-card-photos');
    return (photos && photos.closest('.hero-card-slot')) || slots[0];
  };

  // a tap on a side card brings it to the middle instead of following the link
  const onClick = e => {
    if (!on) return;
    const slot = e.target.closest('.hero-card-slot');
    if (!slot || slot === current) return;
    e.preventDefault();
    touched = true;
    lockUntil = performance.now() + 700;
    select(slot);
    centre(slot, true);
  };
  const onTouch = () => { touched = true; };
  const onResize = () => { if (on && current) centre(current, false); };

  const start = () => {
    if (on) return;
    on = true; touched = false; current = null;
    row.classList.add('has-pick');
    const s = first();
    if (s) { centre(s, false); select(s); }
    pick();
    row.addEventListener('scroll', onScroll, { passive: true });
    row.addEventListener('scrollend', settle, { passive: true });
    row.addEventListener('touchstart', onDown, { passive: true });
    row.addEventListener('touchend', onUp, { passive: true });
    row.addEventListener('touchcancel', onUp, { passive: true });
    row.addEventListener('click', onClick);
    row.addEventListener('pointerdown', onTouch, { passive: true });
    addEventListener('resize', onResize, { passive: true });
  };
  const stop = () => {
    if (!on) return;
    on = false; current = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    row.removeEventListener('scroll', onScroll);
    row.removeEventListener('scrollend', settle);
    row.removeEventListener('touchstart', onDown);
    row.removeEventListener('touchend', onUp);
    row.removeEventListener('touchcancel', onUp);
    clearTimeout(idle);
    row.removeEventListener('click', onClick);
    row.removeEventListener('pointerdown', onTouch);
    removeEventListener('resize', onResize);
    row.classList.remove('has-pick');
    root.style.removeProperty('--pick-c'); root.classList.remove('pick-tint');
    for (const s of slots) { s.style.translate = ''; s.style.rotate = ''; s.classList.remove('is-selected'); const a = s.querySelector('.hero-card'); if (a) a.classList.remove('is-selected'); }
  };

  const sync = () => (phone.matches ? start() : stop());
  phone.addEventListener('change', sync);
  sync();
  // fonts and images can still move things after the first paint: keep Photos in the middle until someone touches the row
  addEventListener('load', () => { if (on && !touched) { const s = first(); if (s) { centre(s, false); select(s); } } });
})();
