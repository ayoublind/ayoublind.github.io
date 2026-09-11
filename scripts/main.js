/* =============================================================
   Ayoub EL HASSANI — site behaviour
   Vanilla JS, no dependencies. Replaces the old jQuery + AOS setup.
   ============================================================= */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- current year + years of experience ------------------ */

  var CAREER_START = 2019;
  var thisYear = new Date().getFullYear();

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = thisYear;

  var expEl = document.getElementById('yearsExp');
  if (expEl) expEl.textContent = Math.max(1, thisYear - CAREER_START);

  /* ---- theme toggle ---------------------------------------- */

  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }

      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#fbfbfd' : '#08090c');
    });
  }

  /* ---- mobile menu ----------------------------------------- */

  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    if (!navLinks || !burger) return;
    navLinks.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  }

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!navLinks.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
  }

  /* ---- scroll: sticky nav + progress bar -------------------- */

  var nav = document.getElementById('nav');
  var bar = document.getElementById('scrollBar');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (nav) nav.classList.toggle('is-stuck', y > 24);

    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  onScroll();

  /* ---- reveal on scroll ------------------------------------ */

  var revealables = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // No animation: show everything immediately.
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-in');
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(revealables, function (el, i) {
      // Stagger siblings so grids cascade rather than popping in at once.
      var siblingIndex = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = Math.min(siblingIndex, 5) * 70 + 'ms';
      revealObserver.observe(el);
    });
  }

  /* ---- contact form ----------------------------------------
     Formspree's old "post to an email address" endpoints were retired, so a
     form without a real form id would fail silently. Until one is configured,
     hand the message off to the visitor's mail client instead of losing it. */

  var contactForm = document.getElementById('contactForm');

  if (contactForm && contactForm.action.indexOf('YOUR_FORM_ID') !== -1) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = new FormData(contactForm);
      var to = contactForm.getAttribute('data-fallback-email');
      var subject = data.get('subject') || 'Hello from your site';
      var body =
        'From: ' + (data.get('name') || '') + '\n' +
        'Email: ' + (data.get('_replyto') || '') + '\n\n' +
        (data.get('message') || '');

      window.location.href =
        'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  }

  /* ---- scroll spy ------------------------------------------ */

  var sections = document.querySelectorAll('main section[id]');
  var linkFor = {};

  Array.prototype.forEach.call(document.querySelectorAll('.nav__links a'), function (a) {
    linkFor[a.getAttribute('href').slice(1)] = a;
  });

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      // Highlight whichever tracked section occupies the most viewport.
      var best = null;
      var bestRatio = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; }
      });

      Object.keys(linkFor).forEach(function (id) {
        linkFor[id].classList.toggle('is-active', id === best);
      });
    }, {
      rootMargin: '-88px 0px -40% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });

    Array.prototype.forEach.call(sections, function (s) { spy.observe(s); });
  }
})();
