#!/usr/bin/env python3
"""Genera iconos, splash y favicons de Aurevix Music a partir del logotipo «A» de aurevixweb.es
(assets/brand-source/aurevix-logo-a.png, lima sobre transparente). Requiere Pillow.

    python3 scripts/generate-brand-assets.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/brand-source/aurevix-logo-a.png"
OUT_MOBILE = ROOT / "apps/mobile/assets/brand"
OUT_WEB = ROOT / "apps/web/public/brand"
OUT_ADMIN = ROOT / "apps/admin/public"
BG = (12, 12, 14, 255)  # --bg de aurevixweb (#0c0c0e)


def logo(size, scale):
    """El logotipo centrado en un lienzo transparente de `size`, ocupando `scale` del lado."""
    src = Image.open(SOURCE).convert("RGBA")
    src = src.crop(src.getbbox())
    side = int(size * scale)
    ratio = min(side / src.width, side / src.height)
    src = src.resize((max(1, int(src.width * ratio)), max(1, int(src.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(src, ((size - src.width) // 2, (size - src.height) // 2))
    return canvas


def on_background(size, scale):
    canvas = Image.new("RGBA", (size, size), BG)
    canvas.alpha_composite(logo(size, scale))
    return canvas


def monochrome(size, scale):
    mark = logo(size, scale)
    white = Image.new("RGBA", mark.size, (255, 255, 255, 255))
    white.putalpha(mark.getchannel("A"))
    return white


def background(w, h):
    """Fondo de pantalla de la app: brillos lima/violeta, rejilla de puntos y grano (como la web)."""
    import random

    from PIL import ImageDraw, ImageFilter

    img = Image.new("RGB", (w, h), BG[:3])
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    for (cx, cy, r, col) in [
        (-0.1 * w, -0.05 * h, 0.75 * w, (200, 245, 96)),
        (1.05 * w, 0.02 * h, 0.65 * w, (185, 140, 255)),
        (0.5 * w, 1.05 * h, 0.7 * w, (200, 245, 96)),
    ]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.22))
    img = Image.blend(img, glow, 0.17)
    dots = ImageDraw.Draw(img)
    base = img.load()
    step = max(18, w // 30)
    for y in range(step // 2, h, step):
        fade = max(0.0, 1 - y / (h * 0.55))
        if fade <= 0:
            break
        for x in range(step // 2, w, step):
            under = base[x, y]
            c = tuple(int(under[i] + (255 - under[i]) * 0.09 * fade) for i in range(3))
            dots.ellipse([x - 1.2, y - 1.2, x + 1.2, y + 1.2], fill=c)
    rnd = random.Random(7)
    px = img.load()
    for _ in range(w * h // 6):
        x, y = rnd.randrange(w), rnd.randrange(h)
        n = rnd.randint(-6, 6)
        r, g, b = px[x, y]
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def main():
    for d in (OUT_MOBILE, OUT_WEB, OUT_ADMIN):
        d.mkdir(parents=True, exist_ok=True)

    icon = on_background(1024, 0.6)
    icon.convert("RGB").save(OUT_MOBILE / "icon.png")  # iOS: cuadrado y sin transparencia
    # Android adaptativo: el contenido debe quedar dentro del 66 % central (zona segura).
    logo(1024, 0.5).save(OUT_MOBILE / "adaptive-foreground.png")
    monochrome(1024, 0.5).save(OUT_MOBILE / "adaptive-monochrome.png")
    logo(512, 0.9).save(OUT_MOBILE / "splash.png")
    logo(512, 1.0).save(OUT_MOBILE / "logo.png")
    background(828, 1792).save(OUT_MOBILE / "background.jpg", quality=86)
    on_background(48, 0.7).save(OUT_MOBILE / "favicon.png")

    on_background(512, 0.6).save(OUT_WEB / "icon-512.png")
    on_background(192, 0.6).save(OUT_WEB / "icon-192.png")
    icon.convert("RGB").resize((180, 180), Image.LANCZOS).save(OUT_WEB / "apple-touch-icon.png")
    on_background(64, 0.72).save(OUT_WEB / "favicon.png")
    logo(256, 1.0).save(OUT_WEB / "logo-a.png")
    on_background(64, 0.72).save(OUT_ADMIN / "favicon.png")
    logo(256, 1.0).save(OUT_ADMIN / "logo-a.png")
    print("Recursos de marca generados en", OUT_MOBILE, OUT_WEB, "y", OUT_ADMIN)


if __name__ == "__main__":
    main()
