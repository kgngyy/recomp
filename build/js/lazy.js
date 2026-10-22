/* lazy.js — ленивая загрузка макроциклов и справочников */
(function () {
  'use strict';
  var placeholders = [].slice.call(document.querySelectorAll('.ux-lazy[data-src]'));
  if (!placeholders.length) { bootIfReady(); return; }
  var loaded = {};
  function load(el) {
    if (loaded[el.id]) return Promise.resolve();
    loaded[el.id] = true;
    return fetch(el.getAttribute('data-src'))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        el.innerHTML = html;
        el.classList.remove('ux-lazy');
        el.removeAttribute('data-src');
        hydrate();
        document.dispatchEvent(new CustomEvent('ux:loaded', { detail: { el: el } }));
        return html;
      })
      .catch(function () { loaded[el.id] = false; });
  }
  function hydrate() {
    try {
      if (window.Recomp && Recomp.wkScores) Recomp.wkScores();
      if (window.Recomp && Recomp.restoreStatic) Recomp.restoreStatic();
    } catch (e) {}
  }
  function byId(id) {
    for (var i = 0; i < placeholders.length; i++) if (placeholders[i].id === id) return placeholders[i];
    return null;
  }
  function eager() {
    var cur = 1;
    try { cur = (window.Recomp && Recomp.getCurrentMacro) ? Recomp.getCurrentMacro() : 1; } catch (e) {}
    var ids = [];
    for (var m = cur - 2; m <= cur; m++) if (m >= 1 && m <= 12) ids.push('macro' + m);
    return Promise.all(ids.map(function (id) { var el = byId(id); return el ? load(el) : Promise.resolve(); }))
      .then(function () { bootIfReady(); });
  }
  function bootIfReady() {
    if (window.__recompBooted) return;
    window.__recompBooted = true;
    if (window.Recomp && Recomp.boot) Recomp.boot();
  }
  function observe() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting && en.target.getAttribute('data-src')) load(en.target); });
    }, { rootMargin: '900px 0px' });
    placeholders.forEach(function (el) { if (el.getAttribute('data-src')) io.observe(el); });
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (sec && sec.getAttribute('data-src')) load(sec);
    var m = id.match(/^(macro\d+)-/);
    if (m) { var p = byId(m[1]); if (p && p.getAttribute('data-src')) load(p); }
  });
  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    var el = document.getElementById(id);
    if (el && el.getAttribute && el.getAttribute('data-src')) load(el);
  });
  eager().then(observe);
})();
