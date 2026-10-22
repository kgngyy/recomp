/* ============================================================
 * ux-autotune v4 — адаптивное самотестирование + контекст + блоки
 * API: window.UXAutotune = {stats(), nextVisit(), reset(), apply(),
 *      exportLayout(), importLayout()}
 * ============================================================ */
(function () {
  'use strict';
  var CFG = {
    ns: 'recomp-ux-v1',
    syncKey: 'recomp_book_v2',
    selector: '[data-ux]',
    toggleSel: '[data-ux-toggle]',
    lowZoneId: 'low-zone',
    weights: { click: 6, expand: 4, view: 1, dwell: 1, depth: 2, hover: 1 },
    hotScore: 16,
    coldSessions: 3,
    relocateSessions: 8,
    relocateMaxViews: 4,
    viewThreshold: 0.15,
    hoverMinMs: 700,
    dwellStep: 8,
    decayEvery: 12,
    sessionGapMs: 30 * 60 * 1000,
    hintCold: 'Показать детали',
    hintRelocated: 'Перенесено вниз'
  };
  if (window.UX_AUTOTUNE) {
    for (var k in window.UX_AUTOTUNE) {
      if (!window.UX_AUTOTUNE.hasOwnProperty(k)) continue;
      if (k === 'weights' && typeof window.UX_AUTOTUNE.weights === 'object') {
        for (var w in window.UX_AUTOTUNE.weights) CFG.weights[w] = window.UX_AUTOTUNE.weights[w];
      } else CFG[k] = window.UX_AUTOTUNE[k];
    }
  }
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(CFG.ns) || '{}'); } catch (e) { return {}; } },
    set: function (d) { try { localStorage.setItem(CFG.ns, JSON.stringify(d)); } catch (e) {} }
  };
  var data = store.get(), dirty = false, timer = 0;
  function flush() { if (timer) { clearTimeout(timer); timer = 0; } if (dirty) { dirty = false; store.set(data); mirror(); } }
  function save() { dirty = true; if (!timer) timer = setTimeout(flush, 400); }
  function mirror() {
    if (!CFG.syncKey) return;
    try {
      var st = JSON.parse(localStorage.getItem(CFG.syncKey) || '{}');
      st.ux = data;
      localStorage.setItem(CFG.syncKey, JSON.stringify(st));
    } catch (e) {}
  }
  function hydrateFromSync() {
    if (!CFG.syncKey) return;
    try {
      var st = JSON.parse(localStorage.getItem(CFG.syncKey) || '{}');
      if (st.ux && typeof st.ux === 'object' && !st.ux.__empty) { data = st.ux; store.set(data); }
    } catch (e) {}
  }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); else { hydrateFromSync(); applyAll(); } });
  function rec(key) {
    if (!data[key]) data[key] = { c: 0, e: 0, v: 0, d: 0, t: 0, h: 0, sessions: 0, ts: 0 };
    var r = data[key];
    ['d', 't', 'h'].forEach(function (f) { if (r[f] == null) r[f] = 0; });
    return r;
  }
  function score(r) {
    var W = CFG.weights;
    return r.c * W.click + r.e * W.expand + r.v * W.view +
      Math.floor(r.t / CFG.dwellStep) * W.dwell + (r.d || 0) * W.depth + Math.min(r.h || 0, 20) * W.hover;
  }
  function keyOf(el) { return el.getAttribute('data-ux') || el.id || ('blk-' + (el.__i || 0)); }
  function isOpen(sec) { return sec.classList.contains('open'); }
  function setOpen(sec, open) {
    sec.classList.toggle('open', open);
    var h = sec.querySelector(CFG.toggleSel);
    if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function returnHome(sec) {
    var h = sec.__home;
    if (h && h.parent) { h.parent.insertBefore(sec, h.next && h.next.parentNode === h.parent ? h.next : null); }
    sec.classList.remove('ux-relocated');
  }
  function blockify(body) {
    var kids = [].slice.call(body.children);
    var firstH2 = -1;
    kids.forEach(function (el, i) { if (firstH2 < 0 && el.tagName === 'H2') firstH2 = i; });
    if (firstH2 < 0) return;
    var blocks = [], cur = null;
    kids.slice(firstH2).forEach(function (el) {
      if (el.tagName === 'H2') { cur = { head: el, items: [] }; blocks.push(cur); }
      else if (cur) cur.items.push(el);
    });
    blocks.forEach(function (b, idx) {
      var d = document.createElement('details');
      d.className = 'ux-block';
      if (idx === 0) d.open = true;
      var s = document.createElement('summary');
      s.innerHTML = b.head.innerHTML;
      d.appendChild(s);
      var bd = document.createElement('div');
      bd.className = 'ux-block-body';
      b.items.forEach(function (it) { bd.appendChild(it); });
      d.appendChild(bd);
      body.insertBefore(d, b.head);
      b.head.remove();
    });
  }
  function enhance(sec) {
    if (sec.__enhanced) return;
    sec.__enhanced = true;
    sec.__home = { parent: sec.parentNode, next: sec.nextSibling };
    if (sec.hasAttribute('data-ux-pin')) return;
    var head = sec.querySelector('h1, h2, h3');
    if (!head) return;
    head.classList.add('ux-toggle');
    head.setAttribute('data-ux-toggle', '');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'true');
    var body = document.createElement('div');
    body.className = 'ux-body';
    var node = head.nextSibling, next;
    while (node) { next = node.nextSibling; body.appendChild(node); node = next; }
    sec.appendChild(body);
    sec.classList.add('open'); setOpen(sec, true);
    if (body.querySelector('h2')) blockify(body);
  }
  function setChip(sec, text) {
    var head = sec.querySelector(CFG.toggleSel);
    if (!head) return;
    var chip = head.querySelector('.ux-chip');
    if (!text) { if (chip) chip.remove(); return; }
    if (!chip) { chip = document.createElement('span'); chip.className = 'ux-chip'; head.appendChild(chip); }
    chip.textContent = text;
  }
  function currentMacroId() {
    try { return (window.Recomp && Recomp.getCurrentMacro) ? 'macro' + Recomp.getCurrentMacro() : null; } catch (e) { return null; }
  }
  function apply(sec, lowZone) {
    var r = rec(keyOf(sec)), s = score(r), inter = r.c + r.e;
    var pinned = sec.hasAttribute('data-ux-pin') || sec.id === 'app' || sec.id === 'top' || sec.id === currentMacroId();
    if (pinned) {
      sec.classList.add('ux-hot'); sec.classList.remove('ux-cold', 'ux-relocated'); setChip(sec, '');
      if (lowZone && sec.parentNode === lowZone) returnHome(sec);
      if (!isOpen(sec)) setOpen(sec, true);
      return;
    }
    sec.classList.remove('ux-hot');
    if (s >= CFG.hotScore && inter > 0) {
      sec.classList.add('ux-hot'); sec.classList.remove('ux-cold', 'ux-relocated'); setChip(sec, '');
      if (lowZone && sec.parentNode === lowZone) returnHome(sec);
      if (!sec.__userOpened && !isOpen(sec)) setOpen(sec, true);
      return;
    }
    var relocate = r.sessions >= CFG.relocateSessions && inter === 0 && r.v < CFG.relocateMaxViews && lowZone;
    var cold = r.sessions >= CFG.coldSessions && inter === 0;
    if (relocate) {
      sec.classList.add('ux-relocated', 'ux-cold');
      if (!sec.__userOpened) setOpen(sec, false);
      setChip(sec, CFG.hintRelocated);
      if (sec.parentNode !== lowZone) lowZone.appendChild(sec);
    } else if (cold) {
      sec.classList.add('ux-cold'); sec.classList.remove('ux-relocated');
      if (!sec.__userOpened) setOpen(sec, false);
      setChip(sec, CFG.hintCold);
      if (lowZone && sec.parentNode === lowZone) returnHome(sec);
    } else {
      sec.classList.remove('ux-cold', 'ux-relocated'); setChip(sec, '');
    }
  }
  function applyAll() { sections.forEach(function (sec) { apply(sec, lowZone); }); }
  function startVisit(force) {
    var now = Date.now(), last = 0, isNew = !!force;
    try { last = +localStorage.getItem(CFG.ns + ':last') || 0; } catch (e) {}
    if (!isNew && (!last || now - last > CFG.sessionGapMs)) isNew = true;
    try { localStorage.setItem(CFG.ns + ':last', String(now)); } catch (e) {}
    if (!isNew) return false;
    sections.forEach(function (sec) {
      var r = rec(keyOf(sec));
      r.sessions += 1; r.ts = now;
      if (CFG.decayEvery && r.sessions % CFG.decayEvery === 0) {
        ['c', 'e', 'v', 't', 'd', 'h'].forEach(function (f) { r[f] >>= 1; });
      }
    });
    save();
    return true;
  }
  function openTarget(id) {
    if (!id) return;
    var el = document.getElementById(id);
    var sec = el && el.closest ? el.closest(CFG.selector) : null;
    if (sec) {
      sec.__userOpened = true;
      if (!isOpen(sec)) { setOpen(sec, true); rec(keyOf(sec)).e += 1; save(); }
    }
  }
  function initMore(scope) {
    if (scope.__moreInit) return; scope.__moreInit = true;
    var n = parseInt(scope.getAttribute('data-more'), 10) || 6;
    var items = [].slice.call(scope.querySelectorAll(scope.getAttribute('data-more-sel') || ':scope > *'));
    if (items.length <= n) return;
    var hidden = items.slice(n);
    hidden.forEach(function (el) { el.classList.add('is-clipped'); });
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'show-more';
    btn.textContent = 'Показать ещё ' + hidden.length;
    scope.appendChild(btn);
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = scope.classList.toggle('is-open');
      hidden.forEach(function (el) { el.classList.toggle('is-clipped', !open); });
      btn.textContent = open ? 'Свернуть' : 'Показать ещё ' + hidden.length;
    });
  }
  function initLightbox() {
    var overlay = document.createElement('div');
    overlay.className = 'ux-lightbox'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    var inner = document.createElement('figure'); inner.className = 'ux-lightbox-inner';
    overlay.appendChild(inner); document.body.appendChild(overlay);
    function close() { overlay.classList.remove('show'); }
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.addEventListener('click', function (ev) {
      var img = ev.target.closest ? ev.target.closest('img[data-zoom]') : null;
      if (!img) return;
      inner.innerHTML = '';
      var el = img.cloneNode(true); el.removeAttribute('data-zoom');
      inner.appendChild(el);
      if (img.getAttribute('alt')) { var f = document.createElement('figcaption'); f.textContent = img.getAttribute('alt'); inner.appendChild(f); }
      overlay.classList.add('show');
    });
  }
  var sections = [], lowZone = null, visible = new Set(), io = null;
  function register(sec) {
    if (sec.__enhanced) return;
    sections.push(sec); enhance(sec);
    apply(sec, lowZone);
    if (io) io.observe(sec);
  }
  function boot() {
    sections = [].slice.call(document.querySelectorAll(CFG.selector));
    if (!sections.length) return;
    lowZone = document.getElementById(CFG.lowZoneId);
    hydrateFromSync();
    sections.forEach(function (sec, i) { sec.__i = i; enhance(sec); });
    startVisit(false);
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
      if (a && a.getAttribute('href').length > 1) openTarget(a.getAttribute('href').slice(1));
      var sec = ev.target.closest ? ev.target.closest(CFG.selector) : null;
      if (!sec) return;
      var r = rec(keyOf(sec));
      if (ev.target.closest(CFG.toggleSel)) {
        r.e += 1;
        var willOpen = !isOpen(sec);
        setOpen(sec, willOpen); sec.__userOpened = true;
        if (willOpen) setChip(sec, '');
      } else if (!ev.target.closest('.ux-chip') && !ev.target.closest('.ux-block')) {
        r.c += 1;
      }
      r.ts = Date.now(); save();
    });
    if (window.matchMedia && matchMedia('(hover:hover)').matches) {
      sections.forEach(function (sec) {
        var t0 = 0;
        sec.addEventListener('mouseenter', function () { t0 = Date.now(); });
        sec.addEventListener('mouseleave', function () {
          if (t0 && Date.now() - t0 >= CFG.hoverMinMs && isOpen(sec)) { rec(keyOf(sec)).h += 1; save(); }
          t0 = 0;
        });
      });
    }
    window.addEventListener('hashchange', function () { openTarget(location.hash.slice(1)); });
    if (location.hash.length > 1) openTarget(location.hash.slice(1));
    document.addEventListener('keydown', function (ev) {
      var head = ev.target.closest ? ev.target.closest(CFG.toggleSel) : null;
      if (head && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); head.click(); }
    });
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var sec = en.target;
          if (en.isIntersecting) visible.add(sec); else visible.delete(sec);
          if (!en.isIntersecting) return;
          var r = rec(keyOf(sec));
          if (!sec.__uxViewed) { sec.__uxViewed = true; r.v += 1; save(); }
          var depth = en.intersectionRatio >= 0.9 ? 3 : en.intersectionRatio >= 0.5 ? 2 : 1;
          if (isOpen(sec) && depth > r.d) { r.d = depth; save(); }
        });
      }, { threshold: [CFG.viewThreshold, 0.5, 0.9] });
      sections.forEach(function (sec) { io.observe(sec); });
      setInterval(function () {
        if (document.hidden) return;
        visible.forEach(function (sec) { if (isOpen(sec)) { rec(keyOf(sec)).t += 1; dirty = true; } });
        if (dirty && !timer) timer = setTimeout(flush, 400);
      }, 1000);
    }
    applyAll();
    document.addEventListener('ux:loaded', function (e) {
      if (e.detail && e.detail.el) register(e.detail.el);
    });
    document.querySelectorAll('[data-ux-reset], #ux-reset').forEach(function (btn) {
      btn.addEventListener('click', function () { api.reset(true); });
    });
    document.querySelectorAll('[data-more]').forEach(initMore);
    if (document.querySelector('img[data-zoom]')) initLightbox();
  }
  var api = window.UXAutotune = {
    stats: function () {
      return sections.map(function (sec) {
        var r = rec(keyOf(sec));
        return { key: keyOf(sec), score: score(r), clicks: r.c, expands: r.e, views: r.v,
          depth: r.d, seconds: r.t, hovers: r.h, sessions: r.sessions,
          state: sec.classList.contains('ux-hot') ? 'hot' :
                 sec.classList.contains('ux-relocated') ? 'relocated' :
                 sec.classList.contains('ux-cold') ? 'cold' : 'normal', open: isOpen(sec) };
      });
    },
    nextVisit: function () { sections.forEach(function (s) { s.__userOpened = false; }); startVisit(true); flush(); applyAll(); },
    apply: applyAll,
    exportLayout: function () { return JSON.parse(JSON.stringify(data)); },
    importLayout: function (d) { if (d) { data = d; store.set(data); flush(); applyAll(); } },
    reset: function (reload) {
      clearTimeout(timer); timer = 0; dirty = false;
      try { localStorage.removeItem(CFG.ns); localStorage.removeItem(CFG.ns + ':last'); } catch (e) {}
      data = {};
      if (reload) location.reload();
      else { sections.forEach(function (s) { returnHome(s); s.__userOpened = false; setOpen(s, true); s.classList.remove('ux-hot', 'ux-cold', 'ux-relocated'); setChip(s, ''); }); }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
