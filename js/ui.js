(function () {
  'use strict';

  var body = document.body;
  var menuBtn = document.getElementById('menuBtn');
  var scrim = document.getElementById('scrim');
  var sidebar = document.getElementById('sidebar');
  var desktop = window.matchMedia('(min-width: 960px)');

  function setMenu(open) {
    body.classList.toggle('nav-open', open);
    if (scrim) scrim.hidden = !open;
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }
  }
  
  if (menuBtn) menuBtn.addEventListener('click', function (e) { 
    e.preventDefault();
    setMenu(!body.classList.contains('nav-open')); 
  });
  if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
  
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMenu(false); }
  });
  desktop.addEventListener('change', function () { setMenu(false); });

  function openAncestors(node) {
    for (var p = node.parentElement; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS') p.open = true;
    }
    if (node.tagName === 'DETAILS') node.open = true;
  }

    function go(id, smooth) {
    var sid = window.Lazy.sectionFor(id);
    
    // Ждем загрузки секции
    Promise.resolve(sid && window.Lazy.load(sid)).then(function () {
      
      // Функция, которая делает сам скролл
      var doScroll = function() {
        var target = document.getElementById(id);
        if (!target) return;
        
        openAncestors(target);
        
        var headerOffset = 80; 
        var isMobile = window.innerWidth <= 960;
        
        // Основной скролл
        if (isMobile) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          window.scrollBy(0, -headerOffset);
        } else {
          var elementPosition = target.getBoundingClientRect().top;
          var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'auto' });
        }

        // КОНТРОЛЬНЫЙ ВЫСТРЕЛ: если через 500мс контент догрузился (картинки, таблицы) 
        // и сдвинул текст, мы плавно доезжаем до него.
        setTimeout(function() {
            var currentPos = target.getBoundingClientRect().top;
            if (Math.abs(currentPos - headerOffset) > 30) {
                var newOffset = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: newOffset, behavior: 'smooth' });
            }
        }, 500);
      };

      // Даем браузеру 100мс, чтобы вставить HTML в DOM
      setTimeout(doScroll, 100);
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    e.preventDefault();
    try { history.pushState(null, '', '#' + id); } catch (err) {}
    
    // Закрываем меню
    setMenu(false); 
    
    // ЖДЕМ 350мс, пока анимация выезжающего меню полностью завершится
    setTimeout(function() {
      go(id, true);
    }, 350);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    e.preventDefault();
    try { history.pushState(null, '', '#' + id); } catch (err) {}
    
    // Принудительно закрываем меню на телефоне при клике на ссылку
    setMenu(false); 
    
    // Небольшая пауза, чтобы меню успело закрыться, и запускаем скролл
    setTimeout(function() {
      go(id, true);
    }, 150);
  });
  
  window.addEventListener('popstate', function () { if (location.hash.length > 1) go(decodeURIComponent(location.hash.slice(1)), false); });
  if (location.hash.length > 1) window.addEventListener('load', function () { go(decodeURIComponent(location.hash.slice(1)), false); });

  var links = {};
  if (sidebar) {
    [].forEach.call(sidebar.querySelectorAll('a[href^="#"]'), function (a) {
      var id = a.getAttribute('href').slice(1);
      if (!/-(home|office)$/.test(id)) links[id] = a;
    });
  }
  
  var ticking = false;
  function updateActive() {
    ticking = false;
    var line = window.innerHeight * 0.3, active = null;
    [].forEach.call(document.querySelectorAll('main > section[id]'), function (s) {
      if (s.getBoundingClientRect().top <= line) active = s.id;
    });
    Object.keys(links).forEach(function (id) {
      var on = id === active;
      links[id].classList.toggle('active', on);
      if (on) links[id].setAttribute('aria-current', 'location'); else links[id].removeAttribute('aria-current');
    });
    var top = document.getElementById('scrollTop');
    if (top) top.classList.toggle('show', window.scrollY > 600);
    
    var m = active && active.match(/^macro(\d+)$/);
    if (sidebar) {
      [].forEach.call(sidebar.querySelectorAll('.nav-macro'), function (d) {
        if (m && d.dataset.macro === m[1] && !d.dataset.touched) d.open = true;
      });
    }
  }
  
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  
  if (sidebar) {
    [].forEach.call(sidebar.querySelectorAll('.nav-macro'), function (d) {
      d.querySelector('summary').addEventListener('click', function () { d.dataset.touched = '1'; });
    });
  }
  document.addEventListener('lazy:loaded', updateActive);
  updateActive();

  var scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
