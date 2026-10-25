(function () {
    var VERSION = '6.1', KEY = 'recomp_book_v2', st = {};
    try {
        st = JSON.parse(localStorage.getItem(KEY) || '{}');
    }
    catch (e) { }
    
    // По умолчанию ставим дату старта 26.10.2026
    var A = st.app = st.app || { start: '2026-10-26', w: {}, sync: {}, ntfy: '' };
    if (!A.start) { A.start = '2026-10-26'; }

    var DN = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], DF = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    var TR = { move: 'Тренировки', nut: 'Питание', care: 'Уход', reg: 'Режим' };
    var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var T = function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); };
    
    function save() { st.ts = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } push(); }
    
    // ---------- sync (Firebase Realtime DB REST) ----------
    function deepMerge(o, n) { for (var k in n) { if (n[k] && typeof n[k] === 'object' && !Array.isArray(n[k])) { if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) { deepMerge(o[k], n[k]); } else { o[k] = JSON.parse(JSON.stringify(n[k])); } } else { o[k] = n[k]; } } return o; }
    var pt;
    function push() { var s = A.sync; if (!s.url || !s.code) return; clearTimeout(pt); pt = setTimeout(function () { var u = s.url.replace(/\/$/, '') + '/recomp/' + s.code + '.json'; fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) { var merged = d && typeof d === 'object' ? d : {}; deepMerge(merged, st); merged.ts = Date.now(); return fetch(u, { method: 'PUT', body: JSON.stringify(merged) }); }).then(function (r) { if (r.ok) { setSt('☁️ синхронизировано ' + new Date().toLocaleTimeString().slice(0, 5)); } else { r.json().then(function (e) { setSt('❌ запись отклонена: ' + (e && e.error ? e.error : 'код ' + r.status) + ' → проверьте Rules'); }).catch(function () { setSt('❌ запись отклонена (код ' + r.status + ')'); }); } }).catch(function () { setSt('☁️ нет связи'); }); }, 800); }
    function pull() { var s = A.sync; if (!s.url || !s.code) return; fetch(s.url.replace(/\/$/, '') + '/recomp/' + s.code + '.json').then(function (r) { if (!r.ok) { return r.json().then(function (e) { setSt('❌ нет доступа: ' + (e && e.error ? e.error : 'код ' + r.status) + ' → проверьте Rules'); }).catch(function () { setSt('❌ нет доступа (код ' + r.status + ')'); }).then(function () { return null; }); } return r.json(); }).then(function (d) { if (!d) return; var keep = A.sync; deepMerge(st, d); st.app = st.app || { start: '2026-10-26', w: {}, sync: {}, ntfy: '' }; A = st.app; A.sync = keep; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } restoreStatic(); render(); setSt('☁️ синхронизировано ' + new Date().toLocaleTimeString().slice(0, 5)); }).catch(function () { setSt('☁️ нет связи'); }); }
    function setSt(t) { var e = $('#syncst'); if (e) e.textContent = t; }
    
    // ---------- static saves (shop, photo, meas) ----------
    function restoreStatic() { $$('.save[data-key]').forEach(function (e) { e.checked = !!st[e.dataset.key]; }); $$('.save-in[data-key]').forEach(function (e) { if (st[e.dataset.key] !== undefined) e.value = st[e.dataset.key]; }); }
    document.addEventListener('change', function (e) { var t = e.target; if (t.classList.contains('save') && t.dataset.key) { st[t.dataset.key] = t.checked; save(); } });
    document.addEventListener('input', function (e) { var t = e.target; if (t.classList.contains('save-in') && t.dataset.key) { st[t.dataset.key] = t.value; save(); } });
    
    // ---------- plan data from page ----------
    function sec(l) { return document.getElementById('macro' + Math.min(12, Math.max(1, Math.ceil(l / 4)))); }
    function tbl(s, h) { return $$('table', s).filter(function (t) { return T(t.rows[0].cells[0]) == h; })[0]; }
    function rowsOf(t) { return t ? $$('tr', t).slice(1).map(function (r) { return $$('td', r).map(T); }) : []; }
    function reps(txt, w) { var m = txt.match(/(\d+)×(\d+)(?:\s*→\s*(\d+)×(\d+))?\s*(\S+)?/); if (!m) return { now: txt, rng: txt }; var s1 = +m[1], r1 = +m[2], s2 = m[3] ? +m[3] : s1, r2 = m[4] ? +m[4] : r1, u = m[5] || '', c = Math.round(r1 + (r2 - r1) * w / 3), s = w >= 2 ? s2 : s1; return { now: s + '×' + c + ' ' + u, rng: 'мин ' + s1 + '×' + r1 + ' → макс ' + s2 + '×' + r2 + ' ' + u, all: [0, 1, 2, 3].map(function (i) { return 'нед' + (i + 1) + ': ' + (i >= 2 ? s2 : s1) + '×' + Math.round(r1 + (r2 - r1) * i / 3); }).join(' · ') }; }
    function exList(s, kind, w) { var up = /тяг|ангел|отжим/i, dn = /присед|клэмшелл|румын|мёртв|выпад/i, out = []; rowsOf(tbl(s, 'Упражнение')).forEach(function (r) { var n = r[0]; var isUp = up.test(n) && !dn.test(n), isDn = dn.test(n), core = /планк|вакуум/i.test(n); if (!kind || core || (kind == 'up' && isUp) || (kind == 'dn' && isDn) || (!isUp && !isDn)) { var p = reps(r[1], w); out.push('• ' + n + ': ' + (w === null ? '' : 'сейчас ' + p.now + ' | ') + p.rng + (p.all ? '\n   ' + p.all : '') + ' — ' + r[2] + (r[3] && r[3] != '—' ? '; чувствовать: ' + r[3] : '')); } }); return out.join('\n'); }
    function cardio(s) { return $$('.link-ref', s).map(T).filter(function (x) { return /Кардио/.test(x); })[0] || ''; }
    function menu(s, d) { var r = rowsOf(tbl(s, 'День'))[d]; return r ? r : ['', '', '', '', '', '']; }
    function careDay(s, d) { var t = $$('table', s).filter(function (t) { return T(t.rows[0].cells[1] || t.rows[0].cells[0]) == 'Утро'; })[0]; var r = rowsOf(t)[d]; return r || ['', '', '']; }
    
        // ---------- tooltips ----------
    var NIGHT = '\n\nПодготовка ко сну:\n1) душ тёплый (не горячий), кожу промокнуть, не растирать;\n2) крем — в течение 3 мин после душа, на влажную кожу;\n3) губы — вазелин/Cicaplast Levres толстым слоем;\n4) приготовить одежду/контейнеры на завтра, поставить будильник 06:30;\n5) проветрить, свет приглушить, гаджеты — в детокс 22:30.';

    function tipText(el) {
        var k = el.getAttribute('data-tip'), 
            x = +el.getAttribute('x'), 
            y = +el.getAttribute('y'), 
            h = +el.getAttribute('height');
            
        var d = Math.floor((x - 58) / 150), 
            m0 = Math.round((y - 40) / 27 * 60 / 5) * 5, 
            du = Math.round(h / 27 * 60 / 5) * 5, 
            fm = function (m) { m += 360; return ('0' + (m / 60 | 0)).slice(-2) + ':' + ('0' + m % 60).slice(-2); };
            
        var hd = DF[d] + ' · ' + fm(m0) + '–' + fm(m0 + du) + '\n', 
            s = window.TIPSEC || document.getElementById('macro1'), 
            mi = +(s.id || 'macro1').replace('macro', '') || 1, 
            eve = m0 >= 930, 
            mn = menu(s, d), 
            cr = careDay(s, d);

        var ex = function (kind) { return exList(s, kind, null); };
        
        // Здесь мы прописываем детализацию для каждого типа задачи
        var map = {
            'Подъём': 'ПОДЪЁМ И РАЗМИНКА\n• Диафрагмальное дыхание (10 вдохов)\n• Круги суставами (шея, плечи, кисти, таз, колени) по 8 раз\n• Вакуум 3×5 сек\n• Стакан воды + 5-10 г коллагена (за 20-30 мин до еды)',
            
            'Уход': eve ? 'ВЕЧЕР — ПОДГОТОВКА К НОЧИ\n• ' + cr[2] + NIGHT : 'УТРЕННИЙ УХОД\n• ' + cr[1] + '\n• Гель SA на влажную кожу (массаж 1 мин, смыть)\n• Бальзам для губ с SPF 30+',
            
            'Сборы': 'СБОРЫ\n• Одеться, заправить постель\n• Проверить контейнеры и воду на день\n• В офис: контейнер, шейкер, бальзам для губ',
            
            'Завтрак': 'ЗАВТРАК + ВИТАМИНЫ\n• Сегодня в меню: ' + mn[1] + '\n• Во время еды: Витамин D3 и Омега-3\n• Порции: белок с ладонь, углеводы с кулак, овощи 2 кулака',
            
            'Прогулка': m0 < 120 ? 'УТРЕННЯЯ ПРОГУЛКА\n• 20–30 мин активного шага на дневном свету\n• Это якорь циркадного ритма\n• Спина прямая, лопатки назад' : 'ПРОГУЛКА 20 МИН\n• Быстрым шагом после еды\n• Помогает сахару и осанке\n• На свежем воздухе',
            
            'Работа': 'РАБОТА\n• Каждые 50–60 мин — 2–3 мин: встать, «ангелы у стены» ×8, вода\n• Монитор на уровне глаз',
            
            'Обед': 'ОБЕД\n• Сегодня в меню: ' + mn[2] + '\n• После — прогулка 20 мин',
            
            'Чай': 'ЧАЙ\n• Зелёный/травяной без сахара\n• Не позже 17:00',
            
            'Ужин': 'УЖИН\n• Сегодня в меню: ' + mn[3] + '\n• Лёгкий: белок + овощи, минимум углеводов\n• Не позже чем за 3 ч до сна',
            
            'Отдых': m0 < 720 ? 'СВОБОДНОЕ ВРЕМЯ\n• Пассивное восстановление без тяжёлой нагрузки\n• Вода 1,5–2 л' : (m0 < 840 ? 'ОТДЫХ ПЕРЕД ВЕЧЕРНЕЙ ЗАДАЧЕЙ\n• Вода, ноги вверх 5 мин\n• Спокойно. Затем — по графику' : 'ВОССТАНОВЛЕНИЕ\n• Лёгкая растяжка 10 мин\n• Тёплый душ\n• Просмотр плана на следующую неделю'),
            
            'МФР+пилинг': 'МФР + ЛИМФОДРЕНАЖ' + (mi > 1 ? ' + ПИЛИНГ РУК' : '') + '\n• Ролл по бёдрам/спине 20 мин (на точках 20–30 сек)\n• Лимфодренаж лица и шеи 5 мин вверх' + (mi > 1 ? '\n• Пилинг рук: тоник AHA 10% на сухую кожу 10 мин, смыть' : '\n• Пилингов в этом макроцикле нет'),
            
            'Сила низ': 'СИЛОВАЯ С-А (НИЗ)\n• Разминка 5 мин, отдых между подходами 45–60 сек\n' + ex('dn') + '\n• После: растяжка 3 мин, магниевая ванна',
            
            'Сила верх': 'СИЛОВАЯ С-Б (ВЕРХ/СПИНА)\n• Разминка 5 мин, отдых 45–60 сек\n' + ex('up') + '\n• После: магниевая ванна, Topicrem UR-10',
            
            'Пилатес': 'ПИЛАТЕС + МФР ШЕИ\n• 30 мин на коврике\n• Затем теннисным мячом шея/трапеции 5 мин',
            
            'Йога-нидра': 'ЙОГА-НИДРА + РАСТЯЖКА\n• 20 мин расслабления под аудиогид\n• Затем растяжка ног и поясницы 10 мин',
            
            'Ванна+уход': 'МАГНИЕВАЯ ВАННА + УХОД\n• 2 стакана соли Эпсома, 37–38°C, 30 мин\n• Затем Topicrem UR-10 на влажную кожу\n• Если была сауна — вместо ванны лёгкий уход',
            
            'Кардио': 'КАРДИО (СУББОТА)\n• ' + cardio(s).replace('🏃 ', '') + '\n• Пульс: можно говорить фразами\n• Разминка шагом 5 мин',
            
            'Заготовки': 'СПРИНТ ЗАГОТОВОК (2 Ч)\n• Крупы: гречка 15–18 мин, рис 12–15\n• Белок: курица 20–25, рыба 15–20\n• Овощи запечь 25–30\n• Расфасовать по контейнерам 500 мл, подписать даты',
            
            'Какао': 'КАКАО\n• 1 чашка без сахара\n• Только утром в субботу',
            
            'Сет': 'ОФИС-СЕТ 5 МИН\n• Кегель ×15\n• «Короткая стопа» ×10\n• Экспресс-растяжка шеи и груди',
            
            'Дорога': 'ДОРОГА\n• Быстрый шаг\n• В транспорте — «двойной подбородок» 5–10 сек, лопатки назад',
            
            'Детокс': 'ЦИФРОВОЙ ДЕТОКС\n• С 22:30 экраны убрать\n• Свет приглушить\n• Телефон — на зарядку вне кровати\n• Дыхание 4-6',
            
            'Сауна': 'САУНА / ХАММАМ\n• 2–3 захода по 8–10 мин\n• Нижняя или средняя полка\n• Между заходами 5–10 мин отдых и вода\n• Для кератоза лучше хаммам (40–50°C)\n\nВЗЯТЬ: полотенца, шапку, сланцы, халат, воду 0,5–1 л, Topicrem, вазелин для губ, мягкий шампунь, маску, расчёску, пакет для мокрого.\nПОСЛЕ: тёплый душ без мыла, промокнуть, Topicrem UR-10.',
            
            'Массаж': 'МАССАЖ (60 мин)\n• Классический или ручной лимфодренаж\n• Без агрессивного антицеллюлитного!\n\nЧТО СКАЗАТЬ МАСТЕРУ:\n«Сидячая работа, сутулость: зажаты шея, трапеции, мышцы между лопатками, грудные и поясница — проработайте их. Давление среднее (6 из 10). На руках и бёдрах кератоз: не растирать жёстко, без скрабов и согревающих масел. Ноги — лимфодренаж снизу вверх, мягко.»\n\nВЗЯТЬ: полотенце, сменное бельё, воду, Topicrem.',
            
            'Сон': 'СОН\n• Отбой 23:00\n• Подъём 06:30\n• Темно и прохладно (18–20°C)'
        };
        return hd + (map[k] || k);
    }
    var tip = document.createElement('div');
    tip.className = 'tip';
    document.body.appendChild(tip);
    function showTip(e) { var el = e.target.closest && e.target.closest('.gantt'); if (!el) return false; tip.textContent = tipText(el); tip.style.display = 'block'; mv(e); return true; }
    function mv(e) { if (tip.style.display != 'block') return; var w = Math.min(420, innerWidth - 20), x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth) x = Math.max(8, e.clientX - w - 14); var hh = tip.offsetHeight; if (y + hh > innerHeight) y = Math.max(8, innerHeight - hh - 8); tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
    document.addEventListener('mouseover', showTip);
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('.gantt')) tip.style.display = 'none'; });
    document.addEventListener('click', function (e) { if (e.target.closest('.gantt')) { showTip(e); } else tip.style.display = 'none'; });

    // ---------- tasks / weights ----------
    var RULES = [[/Сауна|Массаж/, 'care', 1], [/Сила низ|Сила верх|Силовая|Функциональная|Пилатес/, 'move', 3], [/Кардио|интервальный/, 'move', 3], [/Подъём/, 'reg', 2], [/Йога|Растяжка/, 'move', 2], [/МФР/, 'care', 2], [/Ванна|Душ/, 'care', 2], [/подготовка ко сну|Уход|Макияж/, 'care', 2], [/карнитин/i, 'nut', 2], [/Заготов/, 'nut', 3], [/Закупк|Дозакупк/, 'nut', 2], [/Ужин/, 'nut', 3], [/Завтрак|Обед|Перекус|Полдник/, 'nut', 2], [/Готовиться|Чай|Какао/, 'nut', 1], [/Детокс/, 'reg', 3], [/Прогулка|Дорога|Возврат/, 'move', 1]];
    function cls(l) { for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(l)) return { t: RULES[i][1], w: RULES[i][2] }; return { t: 'reg', w: 1 }; }
    function tasks(n) { var tp = document.getElementById(n % 2 ? 'trk-home' : 'trk-office').content, out = []; $$('td.daycell', tp).forEach(function (c, d) { $$('tr', c).forEach(function (r, i) { var l = r.querySelector('.chk-lbl'); if (!l) return; var tm = (T(l).match(/(\d\d:\d\d)–(\d\d:\d\d)/) || []), lab = T(l).replace(/\s*\d\d:\d\d–\d\d:\d\d$/, ''); var c = cls(lab); out.push({ d: d, i: i, lab: lab, a: tm[1] || '', b: tm[2] || '', t: c.t, w: c.w, k: d + '-' + i }); }); }); if (A.custom && A.custom.name && A.custom.time) { var _hm = A.custom.time.split(':'), _st = +_hm[0] * 60 + (+_hm[1] || 0), _en = _st + 60, _eh = ('0' + Math.floor(_en / 60)).slice(-2) + ':' + ('0' + (_en % 60)).slice(-2); out.push({ d: +A.custom.day, i: 99, lab: 'Занятие: ' + A.custom.name, a: A.custom.time, b: _eh, t: 'reg', w: 2, k: 'custom' }); } return out; }
    function need(list) { var ids = list.filter(function (e) { return e && e.getAttribute('data-src') && !e.dataset.failed; }).map(function (e) { return e.id; }); ids.forEach(function (id) { waiting[id] = 1; }); if (ids.length && window.Lazy) Lazy.load(ids); }
    document.addEventListener('lazy:loaded', function (ev) { restoreStatic(); wkScores(); var id = ev.detail && ev.detail.id; if (id && waiting[id]) { delete waiting[id]; if (booted) render(true); } });
    function W(n) { return A.w[n] || (A.w[n] = { done: {}, m: {} }); }
    function score(n) { var ts = tasks(n), w = W(n), r = {}; Object.keys(TR).forEach(function (t) { r[t] = { s: 0, m: 0, cs: 0, cm: 0 }; }); ts.forEach(function (x) { var q = r[x.t], d = w.done[x.k] ? 1 : 0; q.m += x.w; q.s += x.w * d; if (x.w == 3) { q.cm += 1; q.cs += d; } }); var tot = 0, tm = 0, o = {}; Object.keys(r).forEach(function (t) { var q = r[t]; o[t] = { p: q.m ? Math.round(100 * q.s / q.m) : 100, c: q.cm ? Math.round(100 * q.cs / q.cm) : 100 }; tot += q.s; tm += q.m; }); o.all = tm ? Math.round(100 * tot / tm) : 0; return o; }
    function levels(n) { var L = { move: 1, care: 1, nut: 1, reg: 1 }, why = {}; for (var i = 1; i < n; i++) { var w = A.w[i]; if (!w || !w.closed) { why = {}; continue; } why = {}; Object.keys(TR).forEach(function (t) { var s = w.sc[t]; if (!s) return; if (s.p >= 80 && s.c >= 60) { L[t] = Math.min(48, L[t] + 1); why[t] = 'up'; } else if (s.p < 40 && L[t] > 1) { L[t]--; why[t] = 'down'; } else why[t] = 'hold'; }); } return { L: L, why: why, prev: A.w[n - 1] }; }
    var EXP = [
        ['Тело привыкает к режиму: засыпать легче, меньше тяги к сладкому, лёгкая крепатура после силовых — норма.', 'Кожа рук после геля SA и крема чуть мягче, меньше шелушения; губы меньше стягивает с бальзамом.', 'Приседания и тяги даются легче; к вечеру меньше отёков; энергия ровнее в течение дня.', 'Узелки кератоза на ощупь мягче; одежда в талии чуть свободнее. Первые замеры: −0,5–1 см.'],
        ['Резинки ощущаются как «работа», а не «тяжесть»; пилинг рук переносится без жжения.', 'Кожа рук заметно ровнее, шелушение по краям ушло; кутикула мягче.', 'Осанка: проще держать лопатки назад, меньше ноет шея к вечеру.', 'Ягодицы плотнее на ощупь; талия минус 1–2 см к началу макроцикла 2.'],
        ['Подходы 3×12–15 без «провала» на последних повторах; пульс при интервалах восстанавливается быстрее.', 'Кожа бёдер и рук сглажена, новые высыпания на коже реже; губы не трескаются.', 'Объёмы талии и бёдер падают заметнее, одежда сидит свободнее.', 'Лицо менее отёчное по утрам; контур бёдер чётче. Минус 3–4 см по талии от старта.'],
        ['Свободный вес 4–6 кг: техника держится на всех повторах; планка 30 → 45 сек.', 'Кожа рук мягкая без ежедневной борьбы; пилинг головы без раздражения.', 'Сила растёт: подходы заметно легче, чем в первый месяц.', 'Талия около −4–5 см; в зеркале видна линия ягодиц и спины.'],
        ['Суперсеты без паузы переносятся; пульс в беге 20–25 мин ровный.', 'Осанка устойчивая без напоминаний; шея и плечи не забиты.', 'Кожа бёдер и рук плотнее и ровнее; губы без шелушения даже в холод.', 'Бёдра минус 6–8 см; бег 25 мин без остановок.'],
        ['Полугодие позади: режим стал автоматическим; тянет к ужину по расписанию, а не к перекусам.', 'Кератоз: заметно меньше «гусиной кожи», кожа мягкая круглый год при поддержке.', 'Все основные упражнения с весом; план идёт без пропусков.', 'Итог полугодия: талия −5–6 см, бёдра −9–10 см (ориентир).'],
        ['Новые движения осваиваются за 1–2 тренировки; мышцы «включаются» точнее.', 'Кожа стабильна, пилинги без реакций; ногти крепче.', 'Бег 30 мин без одышки; лёгкость в ногах после тренировки.', 'Талия −6–7 см; бёдра −11–12 см (ориентир).'],
        ['Выносливость: подходы 4×15–18 без «сдувания»; восстановление между подходами быстрее.', 'Кожа ровная, лицо свежее; отёков утром почти нет.', 'Сон глубже; тяга к сладкому и стимуляторам пропадает.', 'Талия −7–8 см; бёдра −12–13 см.'],
        ['Динамика и диагонали: координация лучше, ловко на нестабильных поверхностях.', 'Осанка «сама» держится в офисе; боль в шее не возвращается.', 'Контур талии и бёдер уверенно сменился; одежда на 1–2 размера свободнее.', 'Талия −8 см; бёдра −14 см (ориентир).'],
        ['Привычки без усилия: «хочется» тренироваться и ложиться вовремя.', 'Кожа и губы стабильны — уход занимает 10 мин, а не борьба.', 'Сила и выносливость на пике плана; всё делается по ощущениям.', 'Талия −8,5–9 см; бёдра −15–16 см.'],
        ['Автоматизм: сбой одного дня не выбивает неделю.', 'Кожа в хорошем состоянии: узелки сглажены, поддерживаем.', 'Силовые/функциональные/бег без перебоев.', 'Талия −9–9,5 см; бёдра −16–17 см.'],
        ['Финальные недели: удержание результата, итоговые замеры.', 'Кожа и губы — как цель: мягкие, без шелушения.', 'Объёмы близки к цели: талия 66–67, бёдра 88–91.', 'Итоговая фотосессия; сравнение с началом; план поддержания.']
    ];
    var DATA = [{ "w": [0.5, 1.5], "h": [0.3, 1.0], "v": [0.8, 2.2], "t": [0.3, 0.9], "cw": 1.0, "ch": 0.7, "cv": 1.5 }, { "w": [0.5, 1.4], "h": [0.3, 1.0], "v": [0.7, 2.1], "t": [0.3, 0.9], "cw": 0.9, "ch": 0.7, "cv": 1.4 }, { "w": [0.4, 1.2], "h": [0.3, 1.0], "v": [0.7, 2.0], "t": [0.2, 0.8], "cw": 0.8, "ch": 0.7, "cv": 1.3 }, { "w": [0.3, 1.0], "h": [0.3, 1.0], "v": [0.6, 1.7], "t": [0.2, 0.8], "cw": 0.7, "ch": 0.7, "cv": 1.1 }, { "w": [0.3, 1.0], "h": [0.3, 0.9], "v": [0.5, 1.5], "t": [0.2, 0.8], "cw": 0.7, "ch": 0.6, "cv": 1 }, { "w": [0.3, 0.9], "h": [0.3, 0.9], "v": [0.5, 1.4], "t": [0.2, 0.6], "cw": 0.6, "ch": 0.6, "cv": 0.9 }, { "w": [0.2, 0.8], "h": [0.2, 0.8], "v": [0.4, 1.2], "t": [0.2, 0.6], "cw": 0.5, "ch": 0.5, "cv": 0.8 }, { "w": [0.2, 0.8], "h": [0.2, 0.8], "v": [0.3, 1.0], "t": [0.2, 0.6], "cw": 0.5, "ch": 0.5, "cv": 0.7 }, { "w": [0.2, 0.6], "h": [0.2, 0.6], "v": [0.3, 0.9], "t": [0.1, 0.4], "cw": 0.4, "ch": 0.4, "cv": 0.6 }, { "w": [0.2, 0.6], "h": [0.2, 0.6], "v": [0.2, 0.8], "t": [0.1, 0.4], "cw": 0.4, "ch": 0.4, "cv": 0.5 }, { "w": [0.1, 0.4], "h": [0.1, 0.4], "v": [0.2, 0.6], "t": [0.1, 0.3], "cw": 0.3, "ch": 0.3, "cv": 0.4 }, { "w": [0.1, 0.3], "h": [0.1, 0.3], "v": [0.1, 0.4], "t": [0.1, 0.3], "cw": 0.2, "ch": 0.2, "cv": 0.3 }];
    
    var cur = 1, sel = null, first = true, booted = false, waiting = {};
    function startD() { return A.start ? new Date(A.start + 'T00:00:00Z') : null; }
    function mskNow() { return Date.now() + 108e5; }
    function calWeek() { var s = startD(); if (!s) return 1; return Math.max(1, Math.floor((mskNow() - s) / 6048e5) + 1); }
    function pct(x) { return '<b style="color:' + (x >= 80 ? '#1e7e4a' : x >= 40 ? '#B9770E' : '#C0392B') + '">' + x + '%</b>'; }
    function f1(x) { return x.toFixed(1).replace('.', ','); }
    function E(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function mi(s) { return +s.slice(0, 2) * 60 + +s.slice(3); }
    function hm(m) { return pad(m / 60 | 0) + ':' + pad(m % 60); }
    function lum(c) { return .299 * parseInt(c.substr(1, 2), 16) + .587 * parseInt(c.substr(3, 2), 16) + .114 * parseInt(c.substr(5, 2), 16); }
    var COL = { 'Подъём': '#F39C12', 'Готовка': '#E59866', 'Душ': '#5DADE2', 'Уход': '#AF7AC5', 'Макияж': '#C39BD3', 'Сборы': '#F39C12', 'Завтрак': '#27AE60', 'Перекус': '#82E0AA', 'Обед': '#27AE60', 'Полдник': '#82E0AA', 'Ужин': '#27AE60', 'Прогулка': '#58D68D', 'Работа': '#5D6D7E', 'Чай': '#52BE80', 'Отдых': '#D5DBDB', 'МФР+пилинг': '#E67E22', 'Сила низ': '#E74C3C', 'Сила верх': '#E74C3C', 'Л-карнитин': '#F7DC6F', 'Функциональная': '#2980B9', 'Пилатес': '#9B59B6', 'Йога-нидра': '#9B59B6', 'Ванна+уход': '#AF7AC5', 'Кардио': '#16A085', 'Заготовки': '#F5B041', 'Закупка': '#F0B27A', 'Какао': '#784212', 'Сет': '#48C9B0', 'Дорога': '#58D68D', 'Детокс': '#2C3E50', 'Сауна': '#7D3C98', 'Массаж': '#7D3C98', 'Сон': '#34495E' };
    var TK = [[/Сауна/, 'Сауна'], [/Массаж/, 'Массаж'], [/Подъём/, 'Подъём'], [/карнитин/i, 'Л-карнитин'], [/Поставить завтрак|готовиться/, 'Готовка'], [/подготовка ко сну|^Уход/, 'Уход'], [/Макияж/, 'Макияж'], [/Переодевание|[Сс]боры|до выхода|Подготовка к прогулк/, 'Сборы'], [/Завтрак/, 'Завтрак'], [/Перекус/, 'Перекус'], [/интервальный|Кардио/, 'Кардио'], [/Прогулка/, 'Прогулка'], [/Обед/, 'Обед'], [/Полдник/, 'Полдник'], [/Чай/, 'Чай'], [/Ужин/, 'Ужин'], [/МФР|Растяжка/, 'МФР+пилинг'], [/Сила низ|С-А/, 'Сила низ'], [/Сила верх|С-Б/, 'Сила верх'], [/Душ/, 'Душ'], [/Функциональная/, 'Функциональная'], [/Пилатес/, 'Пилатес'], [/Йога/, 'Йога-нидра'], [/ванна/i, 'Ванна+уход'], [/Закупк|Дозакупк/, 'Закупка'], [/Заготов/, 'Заготовки'], [/Какао/, 'Какао'], [/Возврат|^Дорога/, 'Дорога'], [/Детокс/, 'Детокс'], [/Отдых|Свободное|Восстановление/, 'Отдых'], [/^Работа/, 'Работа'], [/Сон/, 'Сон']];
    function tkey(l) { for (var i = 0; i < TK.length; i++) if (TK[i][0].test(l)) return TK[i][1]; return l; }
    
    function segs(ts, d) {
        var T = ts.filter(function (x) { return x.d == d && x.a; }).map(function (x) { return { k: x.k, l: x.lab, a: mi(x.a), b: mi(x.b), w: x.w, A: mi(x.a), B: mi(x.b) }; }).sort(function (p, q) { return p.a - q.a || p.b - q.b; }), S = [];
        T.forEach(function (t) { if (t.b - t.a < 120) { S.push(t); return; } var c = T.filter(function (u) { return u !== t && u.a >= t.a && u.b <= t.b; }).sort(function (p, q) { return p.a - q.a; }), cu = t.a, fs = 1; c.concat([{ a: t.b, b: t.b }]).forEach(function (u) { if (u.a > cu) { S.push({ k: t.k, l: t.l, a: cu, b: u.a, w: t.w, A: t.A, B: t.B, c: !fs }); fs = 0; } cu = Math.max(cu, u.b); }); });
        S.sort(function (p, q) { return p.a - q.a; });
        var O = [], e = null;
        S.forEach(function (x) { if (e !== null && x.a - e >= 15) O.push({ l: d < 5 ? 'Работа' : 'Свободное время', a: e, b: x.a, g: 1 }); O.push(x); e = Math.max(e || 0, x.b); });
        return O;
    }
    function rowH(x) { var d = x.b - x.a; return Math.round(x.g ? Math.min(110, 32 + d * .12) : Math.min(150, 46 + Math.max(0, d - 15) * .9)); }
    function rowHtml(x, d, done) {
        var k = tkey(x.l), c = COL[k] || '#7F8C8D', dn = x.k != null && done[x.k], tx = lum(c) > 150 ? '#1a1a1a' : '#fff', t = hm(x.a) + '–' + hm(x.b), l = E(x.l), left = x.g ? '<div class="rl gl"><span class="rt"><b>' + l + '</b><small>' + t + '</small></span></div>' : x.c ? '<div class="rl gl"><span class="rt">↳ ' + l + ' <small>(продолжение)</small></span></div>' : '<label class="rl"><input type="checkbox" data-k="' + x.k + '"' + (dn ? ' checked' : '') + '><span class="rt"><b>' + l + '</b><small>' + hm(x.A) + '–' + hm(x.B) + ' · ' + '★★★'.slice(0, x.w) + '</small></span></label>';
        return '<div class="rw' + (x.g ? ' gp' : '') + (dn ? ' dn' : '') + '" data-a="' + x.a + '" data-b="' + x.b + '" data-r="' + (x.g ? 0 : 1) + '" data-k="' + (x.k != null ? x.k : '') + '" data-l="' + l + '" style="min-height:' + rowH(x) + 'px">' + left + '<div class="rc gantt" style="background:' + c + ';color:' + tx + '" data-tip="' + E(k) + '" x="' + (59.5 + 150 * d) + '" y="' + (40 + (x.a - 360) * .45) + '" height="' + ((x.b - x.a) * .45) + '"><b>' + (dn ? '✔ ' : '') + l + '</b><small>' + t + '</small></div></div>';
    }
    
    function adh(w0, w1) {
        var o = { ks: [0, 0], pl: [0, 0], cd: [0, 0], s: { move: [0, 0], nut: [0, 0], care: [0, 0], reg: [0, 0] } };
        for (var i = w0; i <= w1; i++) { var w = A.w[i], dn = w ? w.done : {}; tasks(i).forEach(function (x) { if (x.k == 'custom') return; var d = dn[x.k] ? 1 : 0, q = o.s[x.t]; q[0] += x.w * d; q[1] += x.w; var c = /Силовая/.test(x.lab) ? 'ks' : /Пилатес/.test(x.lab) ? 'pl' : /интервальный|Кардио/.test(x.lab) ? 'cd' : 0; if (c) { o[c][0] += d; o[c][1]++; } }); }
        var p = function (t) { return o.s[t][1] ? Math.round(100 * o.s[t][0] / o.s[t][1]) : 0; };
        o.p = { move: p('move'), nut: p('nut'), care: p('care'), reg: p('reg') };
        o.eff = Math.round(.4 * o.p.move + .4 * o.p.nut + .1 * o.p.care + .1 * o.p.reg);
        o.f = Math.max(0, Math.min(1, (o.eff - 25) / 65));
        o.kd = o.ks[0] + o.pl[0] + o.cd[0];
        o.kt = o.ks[1] + o.pl[1] + o.cd[1];
        return o;
    }
    function rgf(r, f, u) { var a = r[0] * f, b = r[1] * f; return a < .05 ? 'без заметных изменений' : '−' + f1(a) + '…−' + f1(b) + ' ' + u; }
    function microSummary(m) {
        m = Math.min(12, m);
        var a = adh((m - 1) * 4 + 1, m * 4), D = DATA[m - 1], f = a.f, e = a.eff, v = e >= 85 ? 'Темп по плану. Если объёмы не снизились — проверьте порции и перекусы, сон и условия замера (утро, натощак, одни и те же точки).' : e >= 65 ? 'Хороший темп, но часть эффекта потеряна. Подтяните блок с наименьшим процентом.' : e >= 40 ? 'Выполнена примерно половина плана — эффект будет примерно вдвое ниже расчётного. Приоритет: 2 силовых в неделю и ужин по плану.' : 'План выполнен меньше чем наполовину — в сантиметрах заметных изменений ждать рано. Цель следующего микроцикла: вернуть ритм (2 силовых, ужин, сон).';
        return '<div>Отмечено в чек-листе: силовые <b>' + a.ks[0] + '/' + a.ks[1] + '</b>, Пилатес <b>' + a.pl[0] + '/' + a.pl[1] + '</b>, кардио <b>' + a.cd[0] + '/' + a.cd[1] + '</b> — ключевых занятий <b>' + a.kd + ' из ' + a.kt + '</b>. Нагрузка ' + pct(a.p.move) + ', питание ' + pct(a.p.nut) + ', уход ' + pct(a.p.care) + ', режим ' + pct(a.p.reg) + '.</div><div style="margin:6px 0">Выполнение плана <b>≈' + e + '%</b> → ожидаемый эффект ≈ <b>' + Math.round(f * 100) + '%</b> от расчётного.</div><ul style="margin:4px 0 6px;padding-left:18px"><li>Талия: <b>' + rgf(D.w, f, 'см') + '</b></li><li>Бёдра: <b>' + rgf(D.h, f, 'см') + '</b></li><li>Вес: <b>' + rgf(D.v, f, 'кг') + '</b></li></ul><div>' + v + '</div><div class="muted" style="margin-top:4px">Расчёт: диапазон Блока 5 × выполнение (нагрузка 40% + питание 40% + уход 10% + режим 10%). Погрешность замера ±0,5 см.</div>';
    }
    function num(v) { v = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(v) ? null : v; }
    
    function fillMeas() {
        $$('table.mtab').forEach(function (t) {
            var m = +t.dataset.m;
            $$('tr[data-p]', t).forEach(function (r) {
                var p = r.dataset.p, pv = r.querySelector('.pv'), ft = r.querySelector('.ft'), pr = num(st[m == 1 ? 'meas0-' + p : 'meas' + (m - 1) + '-' + p]), c = num(st['meas' + m + '-' + p]);
                if (m > 1) pv.textContent = pr == null ? '—' : String(pr).replace('.', ',');
                if (pr == null || c == null) { ft.textContent = ''; return; }
                var d = c - pr, lo = +r.dataset.lo, tx = (d > 0 ? '+' : d < 0 ? '−' : '') + f1(Math.abs(d)) + ' ' + r.dataset.u;
                if (lo) { var q = -d; tx += q >= lo ? ' ✅ в норме или лучше' : q >= lo / 2 ? ' 🟡 чуть ниже ожидания' : ' 🔴 ниже ожидания'; }
                ft.textContent = tx;
            });
        });
    }
    function wkScores() {
        $$('.wkscore').forEach(function (e) { var m = +e.dataset.macro, o = ''; for (var i = (m - 1) * 4 + 1; i <= m * 4; i++) { var w = A.w[i]; o += '<span class="tag">Нед ' + i + ': ' + (w && w.closed ? w.sc.all + '%' : '—') + '</span>'; } e.innerHTML = '<b>📊 Зачёты недель:</b> ' + o + ' <a href="#app">→ отметить в «Эта неделя»</a>'; });
        $$('.mexp[data-macro]').forEach(function (e) { e.innerHTML = '<div class="card"><h3>📈 Что реально изменится за этот микроцикл — с учётом ваших отметок</h3>' + microSummary(+e.dataset.macro) + '</div>'; });
        fillMeas();
    }
    
    function tick() {
        var g = $('#dgi');
        if (!g) return;
        var m = new Date(mskNow()), td = (m.getUTCDay() + 6) % 7, nm = m.getUTCHours() * 60 + m.getUTCMinutes(), rows = $$('.rw', g), nl = $('#nl'), bar = $('#nowbar'), isCur = cur == calWeek(), live = isCur && sel == td;
        rows.forEach(function (r) { r.classList.remove('now'); r.classList.toggle('past', live && +r.dataset.b <= nm && r.dataset.r == '1' && !r.classList.contains('dn')); });
        if (!live) { nl.style.display = 'none'; bar.innerHTML = '<span>🕒 <b>' + hm(nm) + '</b> МСК</span><span>' + (isCur ? 'Открыт не сегодняшний день.' : 'Открыта не текущая неделя.') + '</span><button id="gt">' + (isCur ? 'К сегодня' : 'К текущей неделе') + '</button>'; return; }
        var cr = null, nx = null;
        rows.forEach(function (r) { if (+r.dataset.a <= nm && nm < +r.dataset.b) cr = r; if (!nx && r.dataset.r == '1' && +r.dataset.a > nm) nx = r; });
        var y = cr ? cr.offsetTop + cr.offsetHeight * (nm - cr.dataset.a) / (cr.dataset.b - cr.dataset.a) : (rows.length && nm < +rows[0].dataset.a ? rows[0].offsetTop : g.scrollHeight);
        if (cr) cr.classList.add('now');
        nl.style.display = 'block';
        nl.style.top = y + 'px';
        nl.firstChild.textContent = hm(nm);
        var cl = cr && cr.dataset.r == '1' ? cr : null, dn = cl && W(cur).done[cl.dataset.k];
        bar.innerHTML = '<span>🕒 <b>' + hm(nm) + '</b> МСК</span>' + (cr ? '<span>Сейчас: <b>' + cr.dataset.l + '</b> до ' + hm(+cr.dataset.b) + '</span>' : '<span>' + (nm < 390 ? '🌙 Ночь — подъём в 06:30' : '😴 День завершён — отбой в 22:30') + '</span>') + (cl && !dn ? '<button class="dk" data-k="' + cl.dataset.k + '">✔ Готово</button>' : '') + (nx ? '<span style="color:#9fb3c4">Далее: ' + nx.dataset.l + ' в ' + hm(+nx.dataset.a) + ' (через ' + (nx.dataset.a - nm) + ' мин)</span>' : '');
    }

    function render(keep) {
        var box = $('#app-body');
        if (!box) return;
        var n = cur, lv = levels(n), L = lv.L, w = W(n), ts = tasks(n), sc = score(n), isHome = n % 2 == 1, m = new Date(mskNow()), td = (m.getUTCDay() + 6) % 7, isCur = n == calWeek();
        if (sel === null) sel = isCur ? td : 0;
        var sy = keep && $('#dg') ? $('#dg').scrollTop : null, avg = Math.round((L.move + L.care + L.nut + L.reg) / 4), mm = Math.min(12, Math.ceil(avg / 4)), sM = sec(L.move), sC = sec(L.care), sN = sec(L.nut), wi = (L.move - 1) % 4;
        window.TIPSEC = sec(avg);
        need([sM, sC, sN, window.TIPSEC]);
        var s = startD(), dt = s ? new Date(+s + (n - 1) * 6048e5) : null, fd = function (d) { return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
        var h = '<div class="wkhead"><button id="pv">◀</button><div><b>Неделя ' + n + (n > 48 ? ' (доп. микроцикл)' : '') + ' · ' + (isHome ? 'ДОМ' : 'ОФИС') + (n % 4 == 0 ? ' · 📏 неделя замеров' : '') + '</b><div class="muted">' + (dt ? fd(dt) + ' – ' + fd(new Date(+dt + 6 * 864e5)) + ' · ' : '') + 'макроцикл ' + mm + (isCur ? '' : ' · <a href="#" id="tocur">к текущей неделе</a>') + '</div></div><button id="nx">▶</button></div>';
        if (!A.start) h += '<div class="bn ba">Дата старта не задана — показана неделя 1. <button id="st0">Начать с понедельника этой недели</button></div>';
        h += '<div id="nowbar"></div>';
        var pw = lv.prev, msg = '';
        if (n > 1 && pw && pw.closed) {
            Object.keys(TR).forEach(function (t) { var p = pw.sc[t].p, y = lv.why[t]; msg += '<div class="bn ' + (y == 'up' ? 'bg' : y == 'down' ? 'br' : 'ba') + '">' + (y == 'up' ? '✅ ' + TR[t] + ' (' + p + '%): темп хороший — усложняем, уровень ' + L[t] + '.' : y == 'down' ? '⛔ ' + TR[t] + ' (' + p + '%): меньше 40% — делаем шаг назад, уровень ' + L[t] + ', нагрузка проще.' : '⚠️ ' + TR[t] + ' (' + p + '%): нужно ≥80% и ≥60% критичных ★★★ — остаёмся на уровне ' + L[t] + ' (те же подходы, повторы и меню).') + '</div>'; });
            if (pw.sc.all >= 90) msg += '<div class="bn bg">🌟 Неделя ≥90%: добавлено усложнение — ' + ['+1 подход в последнем упражнении', '+10 мин прогулки после ужина', '+5 мин МФР перед сном', '+5 сек к каждой планке'][n % 4] + '.</div>';
        } else if (n > 1) msg = '<div class="bn ba">Закройте прошлую неделю кнопкой внизу — тогда план адаптируется.</div>';
        h += msg + '<div class="muted">Уровни: ' + Object.keys(TR).map(function (t) { return TR[t] + ' ' + L[t]; }).join(' · ') + (L.move < n && n > 1 ? ' (отставание от календаря: ' + (n - L.move) + ' нед.)' : '') + '</div>';
        var ex = EXP[mm - 1] || EXP[11];
        h += '<div class="card"><h3>🎯 К концу этой недели вы можете заметить</h3><div style="font-size:13px">' + ex[(avg - 1) % 3] + '</div><div class="meta">Объёмы за неделю не меряем: сдвиг 0,1–0,3 см лежит в пределах погрешности. Замер — в воскресенье недели ' + (mm * 4) + '; итог микроцикла с учётом ваших отметок появится здесь и в Блоке 5.</div></div>';
        if (n % 4 == 0) h += '<div class="card mexp"><h3>📈 Итог микроцикла ' + (n / 4) + ': что реально должно было измениться</h3>' + microSummary(n / 4) + '</div>';
        h += '<div class="card"><h3>🏋️ Нагрузка этой недели (уровень ' + L.move + ')</h3><div style="white-space:pre-line;font-size:12.5px">' + exList(sM, null, wi) + '\n' + cardio(sM) + '</div></div>';
        var mn = menu(sN, sel), cdr = careDay(sC, sel);
        h += '<div class="card"><h3>📅 ' + (isCur && sel == td ? 'Сегодня — ' : '') + DF[sel] + '</h3><div class="dchips">' + DN.map(function (x, i) { var q = ts.filter(function (t) { return t.d == i; }), p = q.length ? Math.round(100 * q.filter(function (t) { return w.done[t.k]; }).length / q.length) : 0; return '<button class="dc' + (i == sel ? ' on' : '') + (isCur && i == td ? ' td' : '') + '" data-d="' + i + '">' + x + '<small>' + p + '%</small></button>'; }).join('') + '</div><div class="muted" style="margin:4px 0 8px">Меню: ' + mn[1] + ' · перекус: ' + mn[2] + ' · ' + mn[3] + ' · полдник: ' + mn[4] + ' · ' + mn[5] + '<br>Уход: утром — ' + cdr[1] + '; вечером — ' + cdr[2] + '</div>' +
    '<div class="muted" style="margin:0 0 8px">🛒 <a href="#' + sN.id + '-b2">Перейти к списку покупок этой недели</a></div>' + '<div id="dg" class="daygrid"><div class="dh"><span>✔ Задача · время · ★ важность</span><span>График дня (нажмите на блок — подробности)</span></div><div id="dgi" class="dgi">' + segs(ts, sel).map(function (x) { return rowHtml(x, sel, w.done); }).join('') + '<div id="nl" class="nl"><span></span></div></div></div><div class="muted" style="margin-top:6px">🟧 оранжевая отметка слева — время прошло, а галочки нет. Красная линия и жирная строка — что по графику сейчас (МСК).</div></div>';
        h += '<div class="card"><h3>📊 Счётчик зачётов недели</h3><table class="cnt"><tr><th>Блок</th><th>Выполнено (вес)</th><th>Критичное ★★★</th></tr>' + Object.keys(TR).map(function (t) { return '<tr><td>' + TR[t] + '</td><td>' + pct(sc[t].p) + '</td><td>' + pct(sc[t].c) + '</td></tr>'; }).join('') + '<tr><td><b>Итого</b></td><td>' + pct(sc.all) + '</td><td></td></tr></table><div class="muted">★★★ критично (без этого не усложняем), ★★ важно, ★ можно пропустить. Усложнение: ≥80% и критичное ≥60%; &lt;40% — шаг назад.</div>';
        h += '<h3>📏 Замеры воскресенья</h3>' + ['w:Вес, кг', 'waist:Талия, см', 'hips:Бёдра, см'].map(function (x) { var p = x.split(':'); return '<label class="ml">' + p[1] + ' <input class="meas" data-m="' + p[0] + '" inputmode="decimal" value="' + (w.m[p[0]] || '') + '"></label>'; }).join('') + '<div class="muted">Еженедельно достаточно веса (утром натощак). Полные замеры и фото — в конце макроцикла (неделя кратна 4), Блок 5.</div>';
        h += w.closed ? '<div class="bn bg">Неделя закрыта. Итог: ' + pct(w.sc.all) + ' <button id="reo">Переоткрыть</button></div>' : '<button id="cl" class="big">✔ Закрыть неделю и пересчитать план</button>';
        h += '</div>';
        box.innerHTML = h;
        
        $$('.dc', box).forEach(function (b) { b.onclick = function () { sel = +b.dataset.d; first = true; render(); }; });
        var dgiEl = $('#dgi');
        if(dgiEl) dgiEl.onchange = function (e) { var k = e.target.dataset.k; if (k === undefined) return; w.done[k] = e.target.checked ? 1 : 0; save(); render(1); };
        box.onclick = function (e) { var t = e.target; if (t.classList.contains('dk')) { w.done[t.dataset.k] = 1; save(); render(1); } else if (t.id == 'gt' || t.id == 'tocur') { e.preventDefault(); cur = calWeek(); sel = null; first = true; render(); } else if (t.id == 'st0') { var q = new Date(mskNow()); A.start = new Date(+q - ((q.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); save(); settings(); cur = calWeek(); sel = null; render(); } };
        
        $$('.meas[data-m]', box).forEach(function (i) { i.oninput = function () { w.m[i.dataset.m] = i.value; save(); }; });
        var pv = $('#pv'); if(pv) pv.onclick = function () { cur = Math.max(1, cur - 1); sel = null; first = true; render(); };
        var nx = $('#nx'); if(nx) nx.onclick = function () { cur++; sel = null; first = true; render(); };
        var cl = $('#cl'); if (cl) cl.onclick = function () { w.sc = score(n); w.closed = Date.now(); save(); render(); wkScores(); };
        var ro = $('#reo'); if (ro) ro.onclick = function () { delete w.closed; save(); render(); };
        
        tick();
        var dg = $('#dg');
        if (dg) { if (sy !== null) dg.scrollTop = sy; else { var nr = $('.rw.now', dg); dg.scrollTop = nr ? Math.max(0, nr.offsetTop - dg.clientHeight / 3) : 0; } }
        first = false;
        wkScores();
    }

    function settings() {
        var b = $('#app-set');
        if (!b) return;
        b.innerHTML = '<div class="grid2"><div class="card"><h3>⚙️ Старт программы</h3><input type="date" id="sd" value="' + E(A.start || '') + '"><div class="muted">Дата понедельника недели 1.</div><h3>🔔 Уведомления</h3><button id="nt">Включить на этом устройстве</button> <button id="nt2">Проверка</button><div class="muted">Работает, пока приложение открыто/установлено. Для надёжности на закрытом телефоне — календарь или ntfy ниже.</div><button id="ics">📆 Скачать календарь (.ics, 14 дней)</button><div style="margin-top:6px"><input id="nf" placeholder="ntfy тема (напр. recomp-ваш-код)" value="' + E(A.ntfy || '') + '"> <button id="nfb">Запланировать 3 дня</button></div></div><div class="card"><h3>☁️ Синхронизация устройств</h3><input id="su" placeholder="Firebase Database URL" value="' + E(A.sync.url || '') + '"><input id="sc" placeholder="Код синхронизации" value="' + E(A.sync.code || '') + '"><button id="ss">Сохранить</button> <button id="scheck">Проверить синхронизацию</button> <button id="sl">Ссылка для другого устройства</button><div id="syncst" class="muted">Не настроено</div><div class="muted">Активный код: ' + (A.sync.code ? '<b>' + E(A.sync.code) + '</b>' : '—') + ' · Версия: ' + VERSION + '</div></div><div class="card"><h3>🧘 Своё занятие (выходные)</h3><input id="cn" placeholder="Название занятия (напр. йога, танцы)" value="' + E(A.custom && A.custom.name || '') + '"><select id="cd"><option value="5">Суббота</option><option value="6">Воскресенье</option></select><input id="ct" type="time" value="' + E(A.custom && A.custom.time || '') + '"><button id="cs">Сохранить занятие</button></div></div>';
        $('#sd').onchange = function () { var v = this.value; if (v) { var d = new Date(v + 'T00:00:00Z'), q = (d.getUTCDay() + 6) % 7; if (q) { d = new Date(+d - q * 864e5); v = d.toISOString().slice(0, 10); this.value = v; alert('Недели считаются с понедельника — дата сдвинута на ' + v); } } A.start = v; save(); sel = null; first = true; cur = calWeek(); render(); };
        $('#nt').onclick = function () { if (!window.Notification) return alert('Уведомления не поддерживаются'); Notification.requestPermission().then(function (p) { alert(p == 'granted' ? 'Включено' : 'Разрешите уведомления в настройках браузера'); }); };
        $('#nt2').onclick = function () { notify('Проверка', 'Уведомления работают'); };
        $('#ics').onclick = ics;
        $('#nfb').onclick = ntfy;
        $('#ss').onclick = function () { A.sync = { url: $('#su').value.trim(), code: $('#sc').value.trim() || Math.random().toString(36).slice(2, 12) }; $('#sc').value = A.sync.code; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } ; setSt('читаю данные…'); pull(); };
        $('#sl').onclick = function () { if (!A.sync.url || !A.sync.code) return alert('Сначала введите URL и код, нажмите «Сохранить»'); var base = location.href.split('#')[0].split('?')[0]; var l = base + '?sync=' + encodeURIComponent(A.sync.url + '|' + A.sync.code); prompt('Скопируйте и откройте эту ссылку В БРАУЗЕРЕ Chrome/Safari (не в мессенджере):', l); };
        $('#scheck').onclick = function () { if (!A.sync.url || !A.sync.code) return alert('Введите URL и код, нажмите «Сохранить»'); setSt('синхронизирую…'); pull(); push(); };
        $('#cd').value = (A.custom && A.custom.day) ? A.custom.day : '5';
        $('#cs').onclick = function () { var nm = $('#cn').value.trim(); if (!nm) return alert('Введите название занятия'); A.custom = { name: nm, day: $('#cd').value, time: $('#ct').value || '11:00' }; save(); cur = calWeek(); render(); alert('Занятие добавлено в план'); };
    }
    function notify(t, b) { if (window.Notification && Notification.permission == 'granted') { if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(t, { body: b, icon: 'icons/icon-192.png', tag: t + b }); }).catch(function () { new Notification(t, { body: b }); }); else new Notification(t, { body: b }); } }
    var fired = {};
    setInterval(function () { var n = calWeek(), d = new Date(Date.now() + 108e5), td = (d.getUTCDay() + 6) % 7, hm = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); if (!A.start) return; tasks(n).forEach(function (x) { if (x.d == td && x.a == hm && x.w >= 2 && !(W(n).done[x.k])) { var k = n + x.k + hm; if (!fired[k]) { fired[k] = 1; notify(x.a + ' · ' + x.lab, 'Нажмите, чтобы открыть план'); } } }); }, 20000);
    function pad(n) { return ('0' + n).slice(-2); }
    function icsEsc(t) { return String(t).replace(/([\\,;])/g, '\\$1'); }
    function ics() { var s = startD(); if (!s) return alert('Сначала укажите дату старта'); var n0 = calWeek(), o = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//recomp//RU', 'BEGIN:VTIMEZONE', 'TZID:Europe/Moscow', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0300', 'TZNAME:MSK', 'END:STANDARD', 'END:VTIMEZONE']; for (var n = n0; n < n0 + 2; n++) { tasks(n).filter(function (x) { return x.w >= 2 && x.a; }).forEach(function (x) { var dt = new Date(+s + ((n - 1) * 7 + x.d) * 864e5), ymd = dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate()); o.push('BEGIN:VEVENT', 'UID:w' + n + 'd' + x.k + '@recomp', 'DTSTAMP:20260101T000000Z', 'DTSTART;TZID=Europe/Moscow:' + ymd + 'T' + x.a.replace(':', '') + '00', 'DTEND;TZID=Europe/Moscow:' + ymd + 'T' + x.b.replace(':', '') + '00', 'SUMMARY:' + icsEsc(x.lab), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(x.lab), 'TRIGGER:-PT5M', 'END:VALARM', 'END:VEVENT'); }); } o.push('END:VCALENDAR'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([o.join('\r\n')], { type: 'text/calendar' })); a.download = 'recomp.ics'; a.click(); }
    function ntfy() { A.ntfy = $('#nf').value.trim(); save(); if (!A.ntfy) return alert('Введите тему'); var n = calWeek(), c = 0, now = Date.now(), s = startD(); if (!s) return alert('Укажите дату старта'); [0, 1, 2].forEach(function (k) { var dd = new Date(now + 108e5 + k * 864e5), td = (dd.getUTCDay() + 6) % 7; tasks(n).filter(function (x) { return x.d == td && x.w >= 2 && x.a; }).forEach(function (x) { var t = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate(), +x.a.slice(0, 2) - 3, +x.a.slice(3))); if (t > now) { c++; fetch('https://ntfy.sh/' + encodeURIComponent(A.ntfy), { method: 'POST', headers: { 'At': String(Math.floor(t / 1000)), 'Title': x.a + ' ' + x.lab }, body: 'Откройте план' }); } }); }); alert('Запланировано: ' + c); }
    
    // ---------- init ----------
    var m = location.hash.match(/#sync=([^&]+)/) || location.search.match(/[?&]sync=([^&]+)/);
    if (m) { try { var p = decodeURIComponent(m[1]).split('|'); if (p[0] && p[1] && /^https:\/\//.test(p[0]) && confirm('Подключить синхронизацию с базой ' + p[0] + ' ?\nПодтверждайте, только если ссылку создали вы сами.')) { A.sync = { url: p[0], code: p[1] }; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } } } catch (e) { } try { history.replaceState(null, '', location.pathname); } catch (e) { } }
    for (var _wn in A.w) { var _w = A.w[_wn]; if (_w && _w.done) { for (var _k in _w.done) { if (_k.indexOf('.') >= 0) { _w.done[_k.split('.').join('-')] = _w.done[_k]; delete _w.done[_k]; } } } }
    
    function boot() { booted = true; restoreStatic(); cur = calWeek(); settings(); render(); wkScores(); setInterval(tick, 30000); pull(); setInterval(pull, 30000); }
    
    document.addEventListener('visibilitychange', tick);
    document.addEventListener('input', function (e) { if (e.target.classList && e.target.classList.contains('save-in')) fillMeas(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(); });
    
    window.Recomp = { getCurrentMacro: function () { return Math.min(12, Math.max(1, Math.ceil(calWeek() / 4))); }, boot: boot };

    // Принудительный запуск настроек и интерфейса, даже если lazy.js споткнулся
    setTimeout(function() {
        if (document.getElementById('app-set') && !document.getElementById('app-set').innerHTML.trim()) {
            settings();
        }
        if (document.getElementById('app-body') && !document.getElementById('app-body').innerHTML.trim()) {
            restoreStatic();
            render();
            wkScores();
        }
    }, 1000);
})();
