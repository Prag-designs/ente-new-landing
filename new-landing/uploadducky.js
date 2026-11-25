// The upload card's Ducky is a Rive file (sleeping, with a 'wake' trigger that jolts him into the thumbs-up).
// Whatever drives the card toggles .is-done on the mascot; we follow that class, so this works with any driver.
(() => {
  const m = document.querySelector('[data-upload-mascot]');
  if (!m) return;
  const BASE = '/assets/new-landing/', SM = 'State Machine';
  const s = document.createElement('script');
  s.src = BASE + 'rive/rive.js';
  s.onload = () => {
    rive.RuntimeLoader.setWasmUrl(BASE + 'rive/rive.wasm');
    const c = document.createElement('canvas');
    c.className = 'duck-rive';
    m.appendChild(c);
    let awake = false, r;
    const wake = () => {
      const vm = r && r.viewModelInstance;
      if (awake || !vm) return;
      awake = true;
      vm.trigger('wake').trigger();
    };
    // back to sleep when the card starts over: fade out, reset the file, fade back in
    const sleep = () => {
      if (!awake) return;
      awake = false;
      m.classList.add('is-rive-swap');
      setTimeout(() => {
        r.reset({ stateMachines: SM, autoplay: true, autoBind: true });
        m.classList.remove('is-rive-swap');
      }, 220);
    };
    r = new rive.Rive({
      src: BASE + 'upload-ducky.riv', canvas: c, stateMachines: SM, autoplay: true, autoBind: true,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
      onLoad: () => {
        r.resizeDrawingSurfaceToCanvas();
        m.classList.add('has-rive');
        if (m.classList.contains('is-done')) wake();
      },
    });
    new MutationObserver(() => (m.classList.contains('is-done') ? wake() : sleep())).observe(m, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', () => r.resizeDrawingSurfaceToCanvas(), { passive: true });
  };
  document.head.appendChild(s);
})();
