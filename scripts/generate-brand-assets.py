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
