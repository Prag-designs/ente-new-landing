// Duckies band under the hero: the live Rive scene ("people" artboard, "Loop" state machine) takes over
// from the static picture once loaded (the picture stays as the fallback). The scooter's position follows
// the scroll: scrolling down drives it left to right, scrolling back up drives it right to left.
(() => {
  const box = document.querySelector('[data-hero-duckies]');
  const band = box && box.closest('.duck-band');
  if (!box || !band) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.rive) {
    rive.RuntimeLoader.setWasmUrl('/assets/vendor/rive.wasm');
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-duckies-rive';
    canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    const size = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    size();
    const r = new rive.Rive({
      src: '/assets/new-landing/ente-website-duckies.riv',
      canvas, artboard: 'people', stateMachines: 'Loop', autoplay: true,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
      onLoad: () => { size(); r.resizeDrawingSurfaceToCanvas(); box.classList.add('is-live'); },
      onLoadError: () => canvas.remove(),
    });
    addEventListener('resize', () => { size(); r.resizeDrawingSurfaceToCanvas(); }, { passive: true });
  }

  // the scooter rides the whole way across, left to right, as the page scrolls down: still fully off the left
  // edge while the band only peeks under the hero (so the hero shows no ducks), the lead duck (the one on the
  // handlebar) on the screen's centre line when the band sits mid-screen, then on out past the right edge.
  const LEAD = .87;    // the lead duck's centre as a share of the scooter box width
  const P_IN = .14;    // scroll progress where the scooter's nose reaches the left edge
  let x = null, raf = 0;
  const target = () => {
    const r = band.getBoundingClientRect(), W = band.clientWidth, w = box.offsetWidth;
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    const xIn = -w - 8, xMid = W / 2 - LEAD * w;
    return xIn + (xMid - xIn) * (p - P_IN) / (.5 - P_IN);
  };
  const frame = () => {
    raf = 0;
    const t = target();
    x = x === null || reduce ? t : x + (t - x) * .12;
    box.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    if (Math.abs(t - x) > .3) raf = requestAnimationFrame(frame);
  };
  // where the browser can tie the ride to the scroll in CSS (herocard.css), it does, on the compositor
  if (window.CSS && CSS.supports('animation-timeline: view()')) return;
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
  kick();
})();
