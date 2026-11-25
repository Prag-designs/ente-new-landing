// Product card doodles: the Ente doodle pattern as a live SVG layer.
// Static (no draw-in). On hover the lines near the cursor light up while the layer drifts a little
// with the pointer. No zoom.
(() => {
  const cards = [...document.querySelectorAll('.card .product-card-bg')];
  if (!cards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const TW = 734, TH = 988;      // tile size in the source file
  const TILE = 600;              // tile width on screen, px

  fetch('/assets/new-landing/doodles.svg?v=1').then(r => r.text()).then(txt => {
    const src = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const ds = [...src.querySelectorAll('path')].map(p => p.getAttribute('d'));

    // measure each path once (same length in every tile)
    const probe = document.createElementNS(NS, 'svg');
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    document.body.appendChild(probe);
    const lens = ds.map(d => {
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); probe.appendChild(p);
      const l = Math.ceil(p.getTotalLength()); p.remove(); return l;
    });
    probe.remove();

    const build = (bg) => {
      const card = bg.closest('.card');
      const w = card.offsetWidth + 32, h = card.offsetHeight + 32;
      const sc = TILE / TW, tw = TILE, th = TH * sc;
      const cols = Math.ceil(w / tw), rows = Math.ceil(h / th);
      let svg = bg.querySelector('.card-doodles');
      if (svg && svg.dataset.grid === `${cols}x${rows}`) return;
      if (!svg) {
        svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'card-doodles');
        svg.setAttribute('aria-hidden', 'true');
        bg.querySelector('.product-card-bg-art').after(svg);
      }
      svg.dataset.grid = `${cols}x${rows}`;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('preserveAspectRatio', 'xMinYMin slice');
      let html = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        html += `<g transform="translate(${(c * tw).toFixed(1)} ${(r * th).toFixed(1)}) scale(${sc.toFixed(5)})">`;
        ds.forEach((d, i) => {
          // stagger from the top-left corner of the card, with a little randomness
          const delay = ((c * tw + r * th) / (w + h)) * 700 + Math.random() * 350;
          html += `<path d="${d}" style="--l:${lens[i]};--d:${delay | 0}ms"/>`;
        });
        html += '</g>';
      }
      svg.innerHTML = html;
      svg.classList.add("is-static");
    };

    cards.forEach(build);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => cards.forEach(build), 200); });

    // hover: a soft light follows the cursor and the doodles drift toward it
    if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    cards.forEach(bg => {
      const card = bg.closest('.card');
      let tx = 0, ty = 0, mx = 0, my = 0, dx = 0, dy = 0, raf = 0, on = false;
      const step = () => {
        mx += (tx - mx) * 0.18; my += (ty - my) * 0.18;
        const w = card.offsetWidth, h = card.offsetHeight;
        const gx = on ? (tx / w - 0.5) * 16 : 0, gy = on ? (ty / h - 0.5) * 16 : 0;
        dx += (gx - dx) * 0.08; dy += (gy - dy) * 0.08;
        const svg = bg.querySelector('.card-doodles');
        if (svg) {
          svg.style.setProperty('--mx', `${(mx + 16).toFixed(1)}px`);
          svg.style.setProperty('--my', `${(my + 16).toFixed(1)}px`);
          svg.style.setProperty('--dx', `${dx.toFixed(2)}px`);
          svg.style.setProperty('--dy', `${dy.toFixed(2)}px`);
        }
        const moving = Math.abs(tx - mx) + Math.abs(ty - my) + Math.abs(gx - dx) + Math.abs(gy - dy) > 0.2;
        raf = moving ? requestAnimationFrame(step) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
      card.addEventListener('pointerenter', e => {
        const r = card.getBoundingClientRect(); tx = mx = e.clientX - r.left; ty = my = e.clientY - r.top; on = true; kick();
      });
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; kick();
      });
      card.addEventListener('pointerleave', () => { on = false; kick(); });
    });
  });
})();
