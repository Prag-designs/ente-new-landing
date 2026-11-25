// When the dot hits the f: a light sweep runs back along "All the good stuff." with the wave
// (right to left), and gold four-point stars twinkle in around the line as the light reaches them.
// After the intro, hovering a product card tints the line in that product's colour (letter by letter,
// left to right) and plays the same sweep and stars again; off the cards it goes back to green.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  // [x, y] as a fraction of the text box, size as a fraction of its height, delay in s
  const STARS = [
    [1.03, 0.08, 0.24, 0.00], [0.84, -0.10, 0.14, 0.10], [0.63, 0.96, 0.19, 0.22],
    [0.41, -0.14, 0.13, 0.32], [0.20, 0.92, 0.16, 0.44], [-0.03, 0.12, 0.22, 0.54],
  ];
  let lastShine = 0;
  const shine = (dir = 'back') => {
    const line = document.querySelector('.hero-line-good');
    if (!line || reduce) return;
    const parts = [...line.querySelectorAll('.hl'), line.querySelector('.hero-dot') || document.querySelector('.hero-dot')].filter(Boolean);
    if (!parts.length) return;
    lastShine = performance.now();
    line.querySelectorAll('.hero-hit-fx').forEach(e => e.remove());
    const lr = line.getBoundingClientRect(), rs = parts.map(e => e.getBoundingClientRect());
    const L = Math.min(...rs.map(r => r.left)) - lr.left, R = Math.max(...rs.map(r => r.right)) - lr.left;
    const T = Math.min(...rs.map(r => r.top)) - lr.top, B = Math.max(...rs.map(r => r.bottom)) - lr.top;
    const w = R - L, h = B - T;
    const fx = document.createElement('span');
    fx.className = 'hero-hit-fx' + (dir === 'fwd' ? ' is-fwd' : ''); fx.setAttribute('aria-hidden', 'true');
    fx.style.cssText = `left:${L}px;top:${T}px;width:${w}px;height:${h}px;--h:${h}px;--w:${w}px`;
    // the hover sweep runs left to right with the colour, so its stars light up in that order too
    const stars = dir === 'fwd' ? STARS.map(([x, y, s, d]) => [x, y, s, .54 - d]) : STARS;
    fx.innerHTML = '<span class="hero-hit-clip"><i class="hero-hit-shine"></i></span>' +
      stars.map(([x, y, s, d]) => `<i class="hero-hit-star" style="left:${(x * w).toFixed(1)}px;top:${(y * h).toFixed(1)}px;--s:${(s * h).toFixed(1)}px;--g:${d}s"></i>`).join('');
    line.appendChild(fx);
    setTimeout(() => fx.remove(), 1800);
  };

  // ---- hover tint ----
  let current = '', leaveT = 0;
  const tint = (name, colour) => {
    clearTimeout(leaveT);
    if (name === current) return;
    current = name;
    const line = document.querySelector('.hero-line-good');
    if (!line) return;
    line.style.setProperty('--line-c', colour);
    if (performance.now() - lastShine > 450) shine('fwd');
  };
  const untint = () => {
    clearTimeout(leaveT);
    leaveT = setTimeout(() => {   // a short wait so crossing the gap to the next card does not flash green
      current = '';
      const line = document.querySelector('.hero-line-good');
      line && line.style.removeProperty('--line-c');
    }, 160);
  };
  const ready = () => {
    const line = document.querySelector('.hero-line-good');
    if (!line) return;
    line.querySelectorAll('.hl').forEach((l, i) => l.style.setProperty('--i', i));
    const dot = line.querySelector('.hero-dot') || document.querySelector('.hero-dot');
    dot && dot.style.setProperty('--i', line.querySelectorAll('.hl').length);
    root.classList.add('tint-ready');
    document.querySelectorAll('.hero-cards .hero-card').forEach(card => {
      const name = ['auth', 'photos', 'locker'].find(n => card.classList.contains(`hero-card-${n}`));
      if (!name) return;
      const colour = getComputedStyle(card).getPropertyValue('--brand').trim() || 'var(--ente-green)';
      const slot = card.closest('.hero-card-slot') || card;
      slot.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') tint(name, colour); });
      slot.addEventListener('pointerleave', untint);
      card.addEventListener('focus', () => tint(name, colour));
      card.addEventListener('blur', untint);
    });
  };

  addEventListener('hero:hit', () => { shine(); setTimeout(ready, 1300); }, { once: true });
  // phone: mobile-pills.js fires this when the centred pill changes, for the same sweep as a desktop hover
  addEventListener('hero:pick', () => { if (root.classList.contains('tint-ready') && performance.now() - lastShine > 450) shine('fwd'); });
  if (reduce) setTimeout(ready, 0);   // no intro run: the line is green from the start, tint still works (no sweep)
})();
