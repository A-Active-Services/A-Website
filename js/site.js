// Shared site behavior: mobile nav, spotlight cursor glow, background video playback.
(function () {
  var toggle = document.querySelector('.nav-menu-toggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  document.querySelectorAll('.spotlight').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Only play background loops while they are on screen.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vids = document.querySelectorAll('.bg-video video');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.05 });
    vids.forEach(function (v) { io.observe(v); });
  }
})();
