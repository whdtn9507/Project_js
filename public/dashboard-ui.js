/* UI-only. Does not send requests or modify socket/player logic. */
(function () {
  'use strict';
  function init() {
    const date = document.getElementById('studio-date');
    if (date) {
      const now = new Date();
      date.textContent = new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' }).format(now);
      date.dateTime = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    }
    function syncNav() {
      const hash = location.hash || '#dashboard';
      document.querySelectorAll('.sidebar nav a').forEach(function (a) {
        const active = a.getAttribute('href') === hash;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
      });
    }
    function navigate(event) {
      const hash = this.getAttribute('href');
      const target = document.getElementById(hash.slice(1));
      if (!target || !target.getClientRects().length) { event.preventDefault(); return; }
      event.preventDefault();
      if (location.hash !== hash) history.pushState(null, '', hash);
      syncNav();
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (hash === '#dashboard') window.scrollTo({top:0,behavior:smooth?'smooth':'auto'});
      else target.scrollIntoView({block:'nearest',behavior:smooth?'smooth':'auto'});
    }
    if (window.jQuery) {
      window.jQuery('.sidebar a[href^="#"], .quick-links a').on('click.machawUI', navigate);
      window.jQuery(window).on('hashchange.machawUI popstate.machawUI', syncNav);
    } else {
      document.querySelectorAll('.sidebar a[href^="#"], .quick-links a').forEach(a => a.addEventListener('click',navigate));
      window.addEventListener('hashchange',syncNav);
      window.addEventListener('popstate',syncNav);
    }
    syncNav();
    // Live-only connection navigation is disabled in demo mode, not linked to a hidden panel.
    function syncMode() {
      const a = document.querySelector('.sidebar nav a[href="#connections"]');
      if (!a) return;
      const live = document.body.dataset.mode === 'live';
      a.hidden = !live;
      a.style.display = live ? '' : 'none';
      if (!live && location.hash === '#connections') { history.replaceState(null,'','#dashboard'); syncNav(); }
    }
    new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['data-mode']});
    syncMode();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
