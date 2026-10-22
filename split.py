#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Рекомпозиция v6 · миграция. Читает index.html + beauty.html, собирает ./build."""
import re, os, shutil, base64

SRC = "index.html"; BEAUTY = "beauty.html"; OUT = "build"
STATIC = ["css/style.css", "js/lazy.js", "js/ux-autotune.js", "sw.js", "manifest.json"]

def grab(s, a, b, pos=0, include_end=True):
    i = s.find(a, pos)
    if i < 0: raise SystemExit("Не найдено: " + a)
    j = s.find(b, i + len(a))
    if j < 0: raise SystemExit("Не найден конец: " + a)
    return s[i:j + (len(b) if include_end else 0)]

def match_brace(css, o):
    d = 0
    for i in range(o, len(css)):
        if css[i] == '{': d += 1
        elif css[i] == '}':
            d -= 1
            if d == 0: return i
    return len(css)-1

def scope_css(css, prefix):
    css = re.sub(r'html\s*\{[^}]*\}', '', css)
    css = re.sub(r'body\s*\{', prefix + '{', css)
    css = css.replace(':root', prefix)
    out=[]; i=0; n=len(css)
    while i < n:
        while i < n and css[i] in ' \t\n\r': i += 1
        if i >= n: break
        if css.startswith('@', i):
            j=css.find('{', i); k=match_brace(css, j)
            head=css[i:j+1].strip()
            if head.startswith('@media') or head.startswith('@supports'):
                out.append(head + scope_css(css[j+1:k], prefix) + '}')
            else:
                out.append(css[i:k+1])
            i=k+1
        else:
            j=css.find('{', i); k=match_brace(css, j)
            header=css[i:j].strip(); sel=header
            if sel.startswith(':root'): sel=prefix
            elif sel and not sel.startswith('#') and not sel.startswith(':') and not sel.startswith('@') and sel != '*':
                sel=', '.join((prefix+' '+s.strip()) for s in header.split(',') if s.strip())
            out.append(sel+'{'+css[j+1:k]+'}')
            i=k+1
    return ''.join(out)

def inline_beauty():
    if not os.path.exists(BEAUTY): return ''
    b = open(BEAUTY, encoding="utf-8").read()
    rep = {
      "https://284baef4-3d14-4ca5-8247-4811f0d6b14b.selstorage.ru/9481e98b-dfee-43c1-87eb-003e3cadbf24_48d7e1b3-6878-4747-a854-51c509affe25_669e2b8c-c372-4e4e-96c7-7ada62f4ac2d.png": "content/img/makeup.png",
      "https://284baef4-3d14-4ca5-8247-4811f0d6b14b.selstorage.ru/1ad3cfcf-d031-48c8-8559-26f965d7efbd_1edfb90c-d9d8-46cb-a466-897a19e906fd_eb0f659f-0899-4cf3-a69d-5aeb6b8c2998.png": "content/img/hair.png",
      "https://284baef4-3d14-4ca5-8247-4811f0d6b14b.selstorage.ru/8108562f-3678-429d-ac6b-2c5feaf63cb3_82893055-730a-4217-97e4-da33a78753f9_084995e1-7629-4d49-bf39-f51449c084a3.png": "content/img/styling.png",
    }
    for k,v in rep.items(): b = b.replace(k, v)
    def sub_png(m):
        url = m.group(0)
        try:
            import urllib.request
            return "data:image/png;base64," + base64.b64encode(urllib.request.urlopen(url).read()).decode()
        except Exception:
            return url
    b = re.sub(r'https://[^"\'> ]*?selstorage[^"\'> ]*?\.png', sub_png, b)

    style = b[b.find("<style>")+len("<style>"):b.find("</style>")]
    body = b[b.find("<body"):b.find("</body>")]
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    body = re.sub(r'<(?:div|aside|section|button)[^>]*id="low-zone"[^>]*>.*?</(?:div|aside|section|button)>', '', body, flags=re.S)
    body = re.sub(r'<(?:button|div|span|a)[^>]*(?:id="ux-reset"|data-ux-reset)[^>]*>.*?</(?:button|div|span|a)>', '', body, flags=re.S)
    scoped = scope_css(style, '#beauty-root')
    scoped = scoped.replace("position:sticky;top:0;", "position:relative;")
    return ('<section class="page" id="ref-beauty" data-ux="ref-beauty" data-ux-pin>\n'
            '<div id="beauty-root">\n<style>\n' + scoped + '\n</style>\n'
            + body.replace("<body", "<div class='beauty-inner'").replace("</body>", "</div>")
            + '\n</div>\n</section>\n')

def add_chessboard(sec):
    svgs = re.findall(r'<svg viewBox="0 0 1108[^"]*".*?</svg>', sec, flags=re.S)
    if not svgs: return sec
    rows = []
    for svg in svgs:
        evs = []
        for g in re.finditer(r'<rect class="gantt"[^>]*>', svg):
            t = g.group(0)
            tip = re.search(r'data-tip="([^"]+)"', t)
            x = re.search(r'x="([\d.]+)"', t)
            y = re.search(r'y="([\d.]+)"', t)
            h = re.search(r'height="([\d.]+)"', t)
            fill = re.search(r'fill="([^"]+)"', t)
            if not (tip and x and y and h): continue
            d = int((float(x.group(1)) - 58) // 150)
            yv = float(y.group(1)); hv = float(h.group(1))
            t0 = (yv - 40) / 27 * 60; t1 = (yv + hv - 40) / 27 * 60
            def fmt(mm):
                mm = int(round(mm/5)*5); mm %= 24*60
                return "%02d:%02d" % (mm//60, mm%60)
            evs.append((d, t0, t1, tip.group(1), fill.group(1) if fill else "#888"))
        if not evs: continue
        daylabels = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]
        cells = []
        for d in range(7):
            de = [e for e in evs if e[0]==d]
            inner = ""
            for (_, a, bb, name, col) in sorted(de, key=lambda e:e[1]):
                lum = (int(col[1:3],16)*0.299+int(col[3:5],16)*0.587+int(col[5:7],16)*0.114)
                tc = "#111" if lum > 150 else "#fff"
                inner += ('<div style="background:%s;color:%s;border-radius:6px;padding:3px 7px;margin:3px 0;font-size:11px;line-height:1.25">'
                          '<b>%s</b> <span style="opacity:.8">%s–%s</span></div>' % (col, tc, name, fmt(a), fmt(bb)))
            cells.append('<td style="vertical-align:top;width:14%%;border:1px solid #eee;padding:6px">'
                         '<div style="font-weight:700;font-size:12px;margin-bottom:4px">%s</div>%s</td>' % (daylabels[d], inner))
        rows.append('<table style="width:100%%;border-collapse:collapse;margin:8px 0"><tr>%s</tr></table>' % ''.join(cells))
    if not rows: return sec
    sec = re.sub(r'<svg viewBox="0 0 1108[^"]*".*?</svg>', '', sec, flags=re.S)
    sec = re.sub(r'<div class="weekgrid-wrap"></div>', '', sec)
    return sec + '\n<!-- РАСПИСАНИЕ (шахматка) -->\n<div class="chessboard">' + ''.join(rows) + '</div>\n'

def make_icons(path, size):
    try:
        from PIL import Image, ImageDraw, ImageFont
        import matplotlib
        fp = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf", "DejaVuSans-Bold.ttf")
        img = Image.new("RGBA", (size,size),(0,0,0,0)); d = ImageDraw.Draw(img)
        d.rounded_rectangle([0,0,size-1,size-1], radius=int(size*0.22), fill=(255,74,34))
        f = ImageFont.truetype(fp, int(size*0.58))
        bb = d.textbbox((0,0),"R",font=f); w=bb[2]-bb[0]; h=bb[3]-bb[1]
        d.text(((size-w)/2-bb[0],(size-h)/2-bb[1]-int(size*0.02)),"R",font=f,fill=(255,255,255,255))
        img.save(path)
    except Exception as e:
        print("Иконки:", e)

def main():
    src = open(SRC, encoding="utf-8").read()
    i = src.find("<script>(function(){")
    if i < 0: raise SystemExit("нет основного скрипта")
    i += len("<script>")
    j = src.find("})();\n</script>", i)
    app = src[i:j+len("})();")]
    app = app.replace("\u00b7 v5", "\u00b7 v6")
    app = app.replace(
        "restoreStatic();cur=calWeek();settings();render();wkScores();setInterval(tick,30000);",
        "function boot(){restoreStatic();cur=calWeek();settings();render();wkScores();setInterval(tick,30000);}")
    hook = ("window.Recomp={calWeek:calWeek,getCurrentWeek:calWeek,"
            "getCurrentMacro:function(){return Math.min(12,Math.max(1,Math.ceil(calWeek()/4)));},"
            "wkScores:wkScores,restoreStatic:restoreStatic,boot:boot};")
    app = app.replace("if('serviceWorker'in navigator)", hook + "\nif('serviceWorker'in navigator)")

    templates = ""
    for tid in ("trk-home","trk-office"):
        templates += grab(src, '<template id="'+tid+'">', "</template>") + "\n"

    SECTIONS = ["macro%d" % i for i in range(1,13)] + ["ref-cooking","ref-exercises","ref-pool","ref-care"]
    secs = {}
    for sid in SECTIONS:
        raw = grab(src, '<section class="page" id="'+sid+'"', "</section>")
        if sid.startswith("macro"):
            raw = add_chessboard(raw)
        secs[sid] = raw

    sb_i = src.find('<div class="sidebar">'); sb_j = src.find("<div class='main'>", sb_i)
    sidebar = src[sb_i:sb_j]
    app_sec = grab(src, '<section class="page" id="app"', "</section>")
    app_sec = re.sub(r'<template id="trk-(?:home|office)">.*?</template>', '', app_sec, flags=re.S)
    cover = grab(src, '<section class="page cover" id="top"', "</section>")
    legend = grab(src, '<section class="page" id="legend"', "</section>")

    placeholders = "\n".join(
        '<section class="page ux-lazy" id="%s" data-ux="%s" data-src="content/%s.html"></section>' % (sid,sid,sid)
        for sid in SECTIONS)

    beauty = inline_beauty()

    head = ('<!DOCTYPE html><html lang="ru"><head>\n<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '<link rel="manifest" href="manifest.json">\n'
            '<meta name="theme-color" content="#0A0A0A">\n'
            '<link rel="stylesheet" href="css/style.css">\n'
            '<link rel="apple-touch-icon" href="icon-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<title>\u0420\u0435\u043a\u043e\u043c\u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0442\u0435\u043b\u0430</title>\n</head>\n')

    shell = (head + '<body>\n' + sidebar + '\n<div class="main" id="main">\n'
             + app_sec + "\n" + cover + "\n" + legend + "\n" + placeholders + "\n"
             + beauty + "\n"
             + '<aside id="low-zone" aria-label="\u0420\u0435\u0436\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u043c\u043e\u0435"></aside>\n'
             + '<div hidden id="templates">\n' + templates + '</div>\n'
             + '<button id="scrollTop" type="button" aria-label="\u041d\u0430\u0432\u0435\u0440\u0445">\u2191</button>\n'
             + '</div>\n'
             + '<script src="js/app.js"></script>\n'
             + '<script src="js/lazy.js"></script>\n'
             + '<script src="js/ux-autotune.js"></script>\n'
             + '</body></html>')

    if os.path.isdir(OUT): shutil.rmtree(OUT)
    for d in ("content","css","js"): os.makedirs(os.path.join(OUT,d), exist_ok=True)
    os.makedirs(os.path.join(OUT,"content","img"), exist_ok=True)

    for f in STATIC:
        if os.path.exists(f): shutil.copy(f, os.path.join(OUT,f))
        else: print("ПРОПУЩЕНО:", f)
    for k in ("makeup","hair","styling"):
        s = os.path.join("content","img",k+".png")
        if os.path.exists(s): shutil.copy(s, os.path.join(OUT,s))

    open(os.path.join(OUT,"index.html"),"w",encoding="utf-8").write(shell)
    open(os.path.join(OUT,"js","app.js"),"w",encoding="utf-8").write(app)
    open(os.path.join(OUT,"content","templates.html"),"w",encoding="utf-8").write(templates)
    for sid, html in secs.items():
        open(os.path.join(OUT,"content",sid+".html"),"w",encoding="utf-8").write(html)
    make_icons(os.path.join(OUT,"icon-192.png"),192)
    make_icons(os.path.join(OUT,"icon-512.png"),512)
    print("OK build: index", len(shell), "| app.js", len(app), "| секций", len(secs), "| beauty", len(beauty))

if __name__ == "__main__":
    main()
