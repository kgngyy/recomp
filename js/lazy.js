/* Ленивая подгрузка макроциклов и справочников из content/*.html.
 * Публичный API: Lazy.load(id | [id]) -> Promise, Lazy.sectionFor(anchorId) -> id | null.
 * После вставки секции генерируется событие `lazy:loaded` ({detail: {id}}). */
(function () {
  'use strict';

  var pending = {};

  function el(id) { return document.getElementById(id); }

  function load(id) {
    var node = el(id);
    if (!node || !node.hasAttribute('data-src')) return Promise.resolve();
    if (pending[id]) return pending[id];

    delete node.dataset.failed;
    pending[id] = fetch(node.getAttribute('data-src'))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        node.innerHTML = html;
        node.classList.remove('lazy');
        node.removeAttribute('data-src');
        node.removeAttribute('aria-busy');
        delete pending[id];
        document.dispatchEvent(new CustomEvent('lazy:loaded', { detail: { id: id } }));
        // дать браузеру пересчитать layout перед тем, как резолвить промис
        return new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
      })
      .catch(function () {
        delete pending[id];
        node.dataset.failed = '1';
        node.innerHTML = '<p class="lazy-note">Не удалось загрузить раздел. ' +
          '<button type="button" data-retry="' + id + '">Повторить</button></p>';
      });
    return pending[id];
  }

  /* id якоря (macro3-home, ref-pool …) -> id секции, если она ещё не загружена */
  function sectionFor(anchorId) {
    if (!anchorId) return null;
    var m = anchorId.match(/^(macro\d+)(?:-|$)/);
    var sid = m ? m[1] : anchorId;
    var node = el(sid);
    return node && node.hasAttribute('data-src') ? sid : null;
  }

  window.Lazy = {
    load: function (ids) { return Promise.all([].concat(ids).map(load)); },
    sectionFor: sectionFor
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-retry]');
    if (!btn) return;
    var id = btn.getAttribute('data-retry');
    el(id).innerHTML = '<p class="lazy-note">Загрузка…</p>';
    load(id);
  });

  /* Остальные секции подгружаем заранее, когда пользователь подходит к ним ближе чем на ~1 экран */
  function observe() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (!en.target.dataset.failed) load(en.target.id);
      });
    }, { rootMargin: '900px 0px' });
    [].forEach.call(document.querySelectorAll('.lazy[data-src]'), function (n) { io.observe(n); });
  }

    /* Старт: грузим ТОЛЬКО макроцикл текущей недели, чтобы приложение запустилось мгновенно */
  var first = ['macro' + window.Recomp.getCurrentMacro()];
  
  // Раздел из адреса (если есть)
  var hashTarget = sectionFor(decodeURIComponent(location.hash.slice(1)));
  if (hashTarget && first.indexOf(hashTarget) < 0) first.push(hashTarget);

  // Запускаем приложение СРАЗУ, как только загрузился текущий макроцикл
  window.Lazy.load(first).then(function () {
    window.Recomp.boot(); // <--- Приложение отрисовывается моментально
    
    // А справочники (кулинария, макияж) догружаем В ФОНЕ, чтобы не тормозили старт
    setTimeout(function() {
      window.Lazy.load(['ref-cooking','ref-exercises','ref-pool','ref-care','ref-beauty']);
    }, 500);
    
    observe();
  });
