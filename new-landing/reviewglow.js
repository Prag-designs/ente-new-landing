// Reviews band, same feel as the product cards: a soft light follows the cursor and lights up
// the doodles near it, and the whole pattern drifts a little toward the cursor.
// The pattern layers are zoomed (scale 1.5 once in view), so the cursor is mapped into their own space.
(() => {
  const sec = document.querySelector('.testimonials');
  if (!sec || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const DRIFT = 22;   // px the pattern drifts at the band's edges
  let px = 0, py = 0, on = false;
  let x = 0, y = 0, dx = 0, dy = 0, raf = 0, fresh = true;
  const step = () => {
    const r = sec.getBoundingClientRect();
    const w = r.width, h = r.height, cx = w / 2, cy = h / 2;
    // drift toward the cursor while inside, back to rest when it leaves
    const gx = on ? (px / w - .5) * 2 * DRIFT : 0, gy = on ? (py / h - .5) * 2 * DRIFT * .6 : 0;
    dx += (gx - dx) * .07; dy += (gy - dy) * .07;
    // the light, in the zoomed and drifted layer's own space
    const m = getComputedStyle(sec, '::after').transform;
    const s = m && m !== 'none' ? new DOMMatrix(m).a : 1;
    const tx = cx + (px - cx - dx) / s, ty = cy + (py - cy - dy) / s;
    if (fresh) { x = tx; y = ty; fresh = false; }
    x += (tx - x) * .14; y += (ty - y) * .14;
    sec.style.setProperty('--mx', `${x.toFixed(1)}px`);
    sec.style.setProperty('--my', `${y.toFixed(1)}px`);
    sec.style.setProperty('--dx', `${dx.toFixed(2)}px`);
    sec.style.setProperty('--dy', `${dy.toFixed(2)}px`);
    const moving = Math.abs(gx - dx) + Math.abs(gy - dy) + Math.abs(tx - x) + Math.abs(ty - y) > .3;
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect();
    px = e.clientX - r.left; py = e.clientY - r.top;
    if (!on) { on = true; sec.classList.add('is-lit'); }
    kick();
  });
  sec.addEventListener('pointerleave', () => { on = false; fresh = true; sec.classList.remove('is-lit'); kick(); });
})();
