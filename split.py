#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Рекомпозиция v6 · миграция. Читает index.html, собирает ./build."""
import re, os, shutil

SRC = "index.html"
OUT = "build"
STATIC = ["css/style.css", "js/lazy.js", "js/ux-autotune.js", "sw.js", "manifest.json"]

def grab(s, start_marker, end_marker, pos=0, include_end=True):
    i = s.find(start_marker, pos)
    if i < 0:
        raise SystemExit("Не найдено: " + start_marker)
    j = s.find(end_marker, i + len(start_marker))
    if j < 0:
        raise SystemExit("Не найден конец для: " + start_marker)
    return s[i:j + (len(end_marker) if include_end else 0)]

def main():
    src = open(SRC, encoding="utf-8").read()

    i = src.find("<script>(function(){")
    if i < 0:
        raise SystemExit("Не найден основной скрипт")
    i += len("<script>")
    j = src.find("})();\n</script>", i)
    if j < 0:
        raise SystemExit("Не найден конец основного скрипта")
    app = src[i:j + len("})();")]

    app = app.replace("\u00b7 v5", "\u00b7 v6")
    app = app.replace(
        "restoreStatic();cur=calWeek();settings();render();wkScores();setInterval(tick,30000);",
        "function boot(){restoreStatic();cur=calWeek();settings();render();wkScores();setInterval(tick,30000);}")
    hook = ("window.Recomp={calWeek:calWeek,getCurrentWeek:calWeek,"
            "getCurrentMacro:function(){return Math.min(12,Math.max(1,Math.ceil(calWeek()/4)));},"
            "wkScores:wkScores,restoreStatic:restoreStatic,boot:boot};")
    app = app.replace("if('serviceWorker'in navigator)", hook + "\nif('serviceWorker'in navigator)")

    templates = ""
    for tid in ("trk-home", "trk-office"):
        templates += grab(src, '<template id="' + tid + '">', "</template>") + "\n"

    SECTIONS = ["macro%d" % i for i in range(1, 13)] + [
        "ref-cooking", "ref-exercises", "ref-pool", "ref-care", "ref-beauty"]
    secs = {}
    for sid in SECTIONS:
        secs[sid] = grab(src, '<section class="page" id="' + sid + '"', "</section>")

    sb_i = src.find('<div class="sidebar">')
    sb_j = src.find("<div class='main'>", sb_i)
    sidebar = src[sb_i:sb_j]

    app_sec = grab(src, '<section class="page" id="app"', "</section>")
    app_sec = re.sub(r'<template id="trk-(?:home|office)">.*?</template>', '', app_sec, flags=re.S)
    cover = grab(src, '<section class="page cover" id="top"', "</section>")
    legend = grab(src, '<section class="page" id="legend"', "</section>")

    placeholders = "\n".join(
        '<section class="page ux-lazy" id="%s" data-ux="%s" data-src="content/%s.html"></section>' % (sid, sid, sid)
        for sid in SECTIONS)

    head = ('<!DOCTYPE html><html lang="ru"><head>\n'
            '<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '<link rel="manifest" href="manifest.json">\n'
            '<meta name="theme-color" content="#0A0A0A">\n'
            '<meta name="description" content="\u0413\u043e\u0434\u043e\u0432\u043e\u0435 \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e \u043f\u043e \u0440\u0435\u043a\u043e\u043c\u043f\u043e\u0437\u0438\u0446\u0438\u0438 \u0442\u0435\u043b\u0430">\n'
            '<link rel="stylesheet" href="css/style.css">\n'
            '<link rel="apple-touch-icon" href="icon-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<title>\u0420\u0435\u043a\u043e\u043c\u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0442\u0435\u043b\u0430</title>\n'
            '</head>\n')

    shell = (head +
             '<body>\n' + sidebar + '\n<div class="main" id="main">\n' +
             app_sec + "\n" + cover + "\n" + legend + "\n" + placeholders + "\n" +
             '<aside id="low-zone" aria-label="\u0420\u0435\u0436\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u043c\u043e\u0435"></aside>\n' +
             '<div hidden id="templates">\n' + templates + '</div>\n' +
             '</div>\n' +
             '<script src="js/app.js"></script>\n' +
             '<script src="js/lazy.js"></script>\n' +
             '<script src="js/ux-autotune.js"></script>\n' +
             '</body></html>')

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "content")); os.makedirs(os.path.join(OUT, "css")); os.makedirs(os.path.join(OUT, "js"))

    for f in STATIC:
        if os.path.exists(f):
            shutil.copy(f, os.path.join(OUT, f))
        else:
            print("ПРОПУЩЕНО:", f)

    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(shell)
    open(os.path.join(OUT, "js", "app.js"), "w", encoding="utf-8").write(app)
    open(os.path.join(OUT, "content", "templates.html"), "w", encoding="utf-8").write(templates)
    for sid, html in secs.items():
        open(os.path.join(OUT, "content", sid + ".html"), "w", encoding="utf-8").write(html)

    make_icons(os.path.join(OUT, "icon-192.png"), 192)
    make_icons(os.path.join(OUT, "icon-512.png"), 512)
    print("OK build: index", len(shell), "| app.js", len(app), "| secs", len(secs), "| tpl", len(templates))

def make_icons(path, size):
    try:
        from PIL import Image, ImageDraw, ImageFont
        import matplotlib
        fp = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf", "DejaVuSans-Bold.ttf")
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, size-1, size-1], radius=int(size*0.22), fill=(255, 74, 34))
        f = ImageFont.truetype(fp, int(size*0.58))
        bbox = d.textbbox((0, 0), "R", font=f)
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        d.text(((size-w)/2-bbox[0], (size-h)/2-bbox[1]-int(size*0.02)), "R", font=f, fill=(255,255,255,255))
        img.save(path)
    except Exception as e:
        print("Иконки:", e)

if __name__ == "__main__":
    main()
