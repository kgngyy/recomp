# Что удалить из старого репозитория

Заменить целиком: `index.html`, `css/style.css`, `js/app.js`, `manifest.json`, `sw.js`.

Удалить:
- `split.py` — одноразовый скрипт миграции, ссылается на несуществующий `beauty.html`
- `js/ux-autotune.js` — авто-перенос разделов; не подключался (404), заменён статичными блоками `<details>`
- `content/img/*.html` — дубли в неверной папке; в них время расписаний сдвинуто на 6 часов, `ref-beauty.html` устарел
- `content/img/*.png` — 3 файла по ~7 МБ; заменены на `img/*.webp` (1,8 МБ всего)
- `content/templates.html` — шаблоны теперь внутри `index.html`
- `__MACOSX/`, `.DS_Store` и прочий мусор, если попал в репозиторий

Добавить: `content/`, `img/`, `icons/`, `js/lazy.js`, `js/ui.js`, `README.md`.
