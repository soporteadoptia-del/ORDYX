"""
Genera los recursos de marca (icono, icono adaptativo, splash, favicon) a partir de la geometría
del isotipo de Ordyx: anillo + onda de sonido sobre el degradado violeta → magenta.
Uso: python3 scripts/generate-brand-assets.py   (requiere Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_MOBILE = ROOT / "apps/mobile/assets/brand"
OUT_WEB = ROOT / "apps/web/public/brand"
A, B = (0x8B, 0x5C, 0xF6), (0xEC, 0x48, 0x99)


def gradient(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(A[i] + (B[i] - A[i]) * t) for i in range(3))
    return img


def mark(size, color=(255, 255, 255, 255), scale=1.0):
    """Anillo con tres barras centradas. `scale` = fracción del lienzo que ocupa el anillo."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ring = size * 0.56 * scale
    stroke = size * 0.075 * scale
    c = size / 2
    d.ellipse([c - ring / 2, c - ring / 2, c + ring / 2, c + ring / 2], outline=color, width=max(1, int(stroke)))
    bar = size * 0.07 * scale
    gap = bar * 0.7
    heights = [0.18, 0.32, 0.22]
    total = 3 * bar + 2 * gap
    x = c - total / 2
    for h in heights:
        hh = size * h * scale
        d.rounded_rectangle([x, c - hh / 2, x + bar, c + hh / 2], radius=bar / 2, fill=color)
        x += bar + gap
    return layer


def rounded(img, radius_ratio):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=int(img.size[0] * radius_ratio), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main():
    OUT_MOBILE.mkdir(parents=True, exist_ok=True)
    OUT_WEB.mkdir(parents=True, exist_ok=True)
    big = 1024
    icon = gradient(big).convert("RGBA")
    icon.alpha_composite(mark(big))
    icon.convert("RGB").save(OUT_MOBILE / "icon.png")  # iOS: cuadrado y sin transparencia
    # Android adaptativo: el contenido debe caber en el 66 % central (zona segura).
    fg = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    fg.alpha_composite(rounded(gradient(int(big * 0.62)).convert("RGBA"), 0.26), (int(big * 0.19), int(big * 0.19)))
    fg.alpha_composite(mark(big, scale=0.62))
    fg.save(OUT_MOBILE / "adaptive-foreground.png")
    mark(big, color=(255, 255, 255, 255), scale=0.62).save(OUT_MOBILE / "adaptive-monochrome.png")
    splash = rounded(icon, 0.26).resize((400, 400), Image.LANCZOS)
    splash.save(OUT_MOBILE / "splash.png")
    fav = rounded(icon, 0.26)
    fav.resize((48, 48), Image.LANCZOS).save(OUT_MOBILE / "favicon.png")
    # Web
    fav.resize((512, 512), Image.LANCZOS).save(OUT_WEB / "icon-512.png")
    fav.resize((192, 192), Image.LANCZOS).save(OUT_WEB / "icon-192.png")
    icon.convert("RGB").resize((180, 180), Image.LANCZOS).save(OUT_WEB / "apple-touch-icon.png")
    fav.resize((64, 64), Image.LANCZOS).save(OUT_WEB / "favicon.png")
    print("Recursos de marca generados en", OUT_MOBILE, "y", OUT_WEB)


if __name__ == "__main__":
    main()
