// OXY Real website: small client-side helpers (nav + focus)
(function () {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close on click for mobile.
    nav.querySelectorAll('a[href^="#"], a[href$=".html"]').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // If page is loaded with a hash, focus the section heading for accessibility.
  window.addEventListener('load', () => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (!el) return;
    const focusTarget =
      el.querySelector('h1, h2, h3, summary, a, button') || el;
    if (focusTarget && focusTarget.focus) {
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
  });
})();

