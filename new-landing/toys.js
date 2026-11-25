(() => {
  const carousel = document.querySelector('[data-toys-carousel]');
  if (!carousel) return;
  // Runs before the deferred Astro module. Opt out of its continuous marquee
  // so nothing moves on its own; this file drives the carousel instead.
  carousel.removeAttribute('data-toys-carousel');
  carousel.dataset.toysEnhanced = '';
  const viewport = carousel.querySelector('.toys-viewport');
  const track = carousel.querySelector('.toys-track');
  const cards = [...track.querySelectorAll('.toy-card')];
  const count = cards.length;
  if (!count) return;

  // Every card can come forward at any moment, so load the art up front.
  cards.forEach(card => {
    const img = card.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.draggable = false;
    }
  });

  // The first ducky toy starts in the centre, with the card before it tucked
  // on the left. Falls back to the first card if no ducky toy is listed.
  const firstDucky = cards.findIndex(card => /ducky/i.test(card.getAttribute('aria-label') || ''));
  let index = Math.max(0, firstDucky);
  let pointer = null;
  let suppressClick = false;
  let pressedCard = null;
  let promoted = null;
  let promotedAt = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // From rest, the outgoing front card stays on top for 65ms so the swap
  // reads as one card passing the other. A move inside a running slide skips
  // the hold, so the front card always paints over the deck in a fast burst.
  const HOLD_MS = 65;
  const REST_MS = 500;
  let lastMove = -Infinity;
  let holdTimer = 0;

  // Signed circular distance from the front card, so the deck wraps forever
  // without clones and without a reposition jump.
  const distance = i => {
    let d = ((i - index) % count + count) % count;
    if (d > count / 2) d -= count;
    return d;
  };

  const slotFor = d => {
    if (Math.abs(d) <= 2) return String(d);
    return d > 0 ? 'h' : '-h';
  };

  const render = (from = index) => {
    clearTimeout(holdTimer);
    cards.forEach((card, i) => {
      card.dataset.slot = slotFor(distance(i));
      delete card.dataset.leaving;
    });
    if (from === index) return;
    const now = performance.now();
    const atRest = now - lastMove >= REST_MS;
    lastMove = now;
    if (atRest && !reduceMotion.matches && Math.abs(distance(from)) === 1) {
      const leaving = cards[from];
      leaving.dataset.leaving = '';
      holdTimer = setTimeout(() => { delete leaving.dataset.leaving; }, HOLD_MS);
    }
  };

  const bringForward = i => {
    if (i < 0 || i === index) return;
    const from = index;
    index = i;
    render(from);
  };

  // Tuck the neighbours 22% of a card width outward, or less when the screen
  // is too narrow to show them whole (phones), keeping an 8px edge inside
  // whatever actually clips the deck: the viewport, the screen, and the
  // section when it clips x.
  const section = carousel.closest('.toys');
  const layout = () => {
    const width = cards[0].offsetWidth;
    if (!width) return;
    const height = cards[0].offsetHeight;
    const angle = 3 * Math.PI / 180;
    const reach = .86 * (width / 2 * Math.cos(angle) + height / 2 * Math.sin(angle));
    const box = viewport.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    let left = Math.max(box.left, 0);
    let right = Math.min(box.right, document.documentElement.clientWidth);
    if (section && getComputedStyle(section).overflowX !== 'visible') {
      const clip = section.getBoundingClientRect();
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
    }
    const room = Math.min(centre - left, right - centre) - 8 - reach;
    const shift = Math.max(0, Math.min(width * .22, room));
    carousel.style.setProperty('--toy-shift', `${shift}px`);
  };

  const move = direction => {
    const from = index;
    index = (index + direction + count) % count;
    render(from);
    const focused = document.activeElement;
    if (focused && cards.includes(focused) && focused !== cards[index]) {
      cards[index].focus({ preventScroll: true });
    }
  };

  carousel.querySelector('[data-toys-prev]').addEventListener('click', () => move(-1));
  carousel.querySelector('[data-toys-next]').addEventListener('click', () => move(1));

  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    // Leave Alt/Cmd/Ctrl/Shift + arrow to the browser (Back, Forward, ...).
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });

  // Focus (Tab, or a click) brings that card to the front.
  carousel.addEventListener('focusin', event => {
    const card = event.target.closest('.toy-card');
    if (!card) return;
    // A mouse press focuses the card on mousedown. Leave that press to the
    // click (bring forward) or the drag (one move), never both.
    if (pointer) return;
    bringForward(cards.indexOf(card));
  });

  // Swipe or drag: the deck follows the pointer a little, then settles.
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer) return;
    const card = event.target.closest('.toy-card');
    // A press on a tucked card brings it forward instead of opening it.
    pressedCard = card && card.dataset.slot !== '0' ? card : null;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dragging: false };
    suppressClick = false;
  });

  window.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    pointer.dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging && Math.abs(pointer.dx) > 8 && Math.abs(pointer.dx) > Math.abs(dy)) {
      pointer.dragging = true;
      carousel.classList.add('is-dragging');
    }
    if (pointer.dragging) {
      const limit = cards[0].offsetWidth * .2;
      const pull = Math.max(-limit, Math.min(limit, pointer.dx * .5));
      track.style.setProperty('--toys-offset', `${pull}px`);
    }
  }, { passive: true });

  const release = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const drag = pointer;
    pointer = null;
    // A drag swallows the click it ends with. That click fires in this same
    // task, wherever the pointer was released, so drop the flag right after;
    // a later keyboard Enter must still open the front card.
    suppressClick = event.type === 'pointerup' && drag.dragging;
    if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
    carousel.classList.remove('is-dragging');
    track.style.setProperty('--toys-offset', '0px');
    if (event.type === 'pointerup' && drag.dragging && Math.abs(drag.dx) > 40) {
      pressedCard = null;
      move(drag.dx < 0 ? 1 : -1);
    }
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  track.addEventListener('dragstart', event => event.preventDefault());

  viewport.addEventListener('click', event => {
    const card = event.target.closest('.toy-card');
    const wasTucked = pressedCard && pressedCard === card;
    pressedCard = null;
    // Keyboard activation (Enter) has detail 0 and always opens the card.
    if (event.detail === 0) {
      suppressClick = false;
      promoted = null;
      return;
    }
    // The second click of a double-click on a tucked card lands on it once it
    // is in front; it must not open the link the first click only revealed.
    const repeat = card && card === promoted &&
      (event.detail > 1 || performance.now() - promotedAt < 350);
    if (!suppressClick && !wasTucked && !repeat) {
      promoted = null;
      return;
    }
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
    if (wasTucked) {
      promoted = card;
      promotedAt = performance.now();
      bringForward(cards.indexOf(card));
    }
  }, true);

  new ResizeObserver(layout).observe(viewport);
  layout();
  render();
})();
