#!/usr/bin/env python3
"""Builds the hosted preview of the calculator: one self-contained HTML page for a private Claude Artifact.

    python3 prototype/calculator/build-preview.py <output.html>

The viewer only allows scripts from a few CDNs and fonts as data: URIs, and it adds its own <head>. So the
CSS and JS go inline, the three site fonts and the logo are embedded, and GSAP is pinned to an exact version.
preview.css stands in for what rimbodesigns.com already has (fonts, page, .btn), buttons.js for the site's rdButtons.
window.CALC_PREVIEW tells calculator.js it runs here: plain #make, #client and #none pick the view, and the
buttons that need a real address say so.
"""
import base64
import pathlib
import re
import sys
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/"


def font_uri(match):
    with urllib.request.urlopen(match.group(1)) as res:
        data = res.read()
    return "url(data:font/woff2;base64," + base64.b64encode(data).decode() + ")"


def main(out):
    html = (HERE / "index.html").read_text()
    css = (HERE / "preview.css").read_text() + "\n" + (HERE / "calculator.css").read_text()
    css = re.sub(r"url\((https://[^)]+\.woff2)\)", font_uri, css)
    logo = base64.b64encode((HERE / "logo.svg").read_bytes()).decode()
    css = css.replace("url(logo.svg)", "url(data:image/svg+xml;base64," + logo + ")")
    body = re.search(r"<body>(.*?)<script", html, re.S).group(1).rstrip()
    scripts = "".join(
        "<script>\n" + (HERE / name).read_text() + "\n</script>\n"
        for name in ["odometer.js", "ball.js", "buttons.js", "calculator.js"]
    )
    page = (
        '<meta charset="utf-8">\n'
        "<title>Rimbo Project Calculator</title>\n"
        "<style>\n" + css + "\n</style>\n"
        + body + "\n"
        "<script>window.CALC_PREVIEW = true;</script>\n"
        f'<script src="{GSAP}gsap.min.js"></script>\n'
        f'<script src="{GSAP}ScrollTrigger.min.js"></script>\n'
        + scripts
        + "<script>rdCalc.mount();</script>\n"
    )
    pathlib.Path(out).write_text(page)
    print(f"{out}: {len(page) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
