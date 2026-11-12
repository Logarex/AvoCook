"""App Store creative assets (iOS 27): product page header, search results and universal asset.

python3 tools/screenshots/creative.py <raw-dir>
Uses the iPhone captures in <raw-dir>/iphone/<lang>/ and assets/icon.png. Writes store/screenshots/ios/<locale>/creative/.

Sizes and art safe areas come from Apple's "Creative assets specifications":
- header 3840x1646 (21:9), safe 1646x661 at (1097, 493)
- search 3840x2560 (3:2), safe 2168x1030 at (836, 765)
- universal 5244x2950 (16:9, PNG only), safe 1402x962 at (1921, 660)
Key content (icon, text, app screens) stays inside the safe area; extra phones outside it may be cropped.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
RAW = Path(sys.argv[1])
FONT = "/System/Library/Fonts/SFNS.ttf"

BG = (244, 241, 234)
INK = (29, 35, 33)
MUTED = (93, 102, 98)
GREEN = (47, 111, 100)

LOCALES = {"fr": "fr-FR", "en": "en-US", "de": "de-DE", "es": "es-ES", "it": "it-IT", "da": "da-DK"}
# Short phrases only, no prices, URLs or other platforms (App Review 2.3).
TEXT = {
    "fr": ("Vos recettes, vos repas et vos courses.", "Au même endroit, même hors ligne.",
           "Recettes, planning et courses", "Sans pub, sans compte, même hors ligne."),
    "en": ("Your recipes, meals and groceries.", "In one place, even offline.",
           "Recipes, meal plans and groceries", "No ads, no account, works offline."),
    "de": ("Deine Rezepte, Mahlzeiten und Einkäufe.", "An einem Ort, auch offline.",
           "Rezepte, Wochenplan und Einkauf", "Ohne Werbung, ohne Konto, auch offline."),
    "es": ("Tus recetas, comidas y compras.", "En un solo lugar, incluso sin conexión.",
           "Recetas, menú y compra", "Sin anuncios, sin cuenta, también sin conexión."),
    "it": ("Le tue ricette, i pasti e la spesa.", "In un unico posto, anche offline.",
           "Ricette, menù e spesa", "Senza pubblicità, senza account, anche offline."),
    "da": ("Dine opskrifter, måltider og indkøb.", "Samlet ét sted, også offline.",
           "Opskrifter, madplan og indkøb", "Uden reklamer, uden konto, også offline."),
}


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def wrap(draw, text, fnt, width):
    """Greedy wrap, then rebalance two-line titles so the lines have similar lengths."""
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=fnt) <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    if len(lines) == 2:
        words = text.split()
        splits = [(" ".join(words[:i]), " ".join(words[i:])) for i in range(1, len(words))]
        lines = list(min(splits, key=lambda pair: max(draw.textlength(part, font=fnt) for part in pair)))
    return lines


def fit_text(draw, text, width, max_lines, start, weight="Bold"):
    size = start
    while size > 20:
        fnt = font(size, weight)
        lines = wrap(draw, text, fnt, width)
        if len(lines) <= max_lines and all(draw.textlength(l, font=fnt) <= width for l in lines):
            return fnt, lines
        size -= 4
    raise SystemExit(f"text does not fit: {text}")


def rounded(image, radius):
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *image.size), radius, fill=255)
    out = Image.new("RGBA", image.size)
    out.paste(image, (0, 0), mask)
    return out


def shadow(canvas, box, radius, blur, opacity):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius, fill=(30, 40, 35, opacity))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def background(size):
    """Soft vertical gradient from the app's cream to a pale AvoCook green."""
    w, h = size
    top, bottom = (248, 246, 240), (222, 236, 230)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        grad.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return grad.resize(size).convert("RGBA")


def icon(canvas, x, y, size):
    img = Image.open(ROOT / "assets/icon.png").convert("RGBA").resize((size, size), Image.LANCZOS)
    radius = round(size * 0.225)
    shadow(canvas, (x, y + size // 20, x + size, y + size + size // 20), radius, size // 8, 70)
    canvas.alpha_composite(rounded(img, radius), (x, y))


def phone(canvas, shot, x, y, height):
    """iPhone screenshot in a thin dark frame, like Apple's marketing renders."""
    img = Image.open(shot).convert("RGBA")
    width = round(height * img.width / img.height)
    bezel = max(6, round(width * 0.028))
    inner = img.resize((width - 2 * bezel, height - 2 * bezel), Image.LANCZOS)
    radius = round(width * 0.15)
    shadow(canvas, (x, y + height // 40, x + width, y + height + height // 40), radius, height // 30, 80)
    frame = rounded(Image.new("RGBA", (width, height), (28, 28, 30, 255)), radius)
    frame.alpha_composite(rounded(inner, radius - bezel), (bezel, bezel))
    canvas.alpha_composite(frame, (x, y))
    return width


def phone_width(height):
    return round(height * 1320 / 2868)


def save(canvas, path, fmt):
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = canvas.convert("RGB")  # no alpha channel allowed
    if fmt == "png":
        rgb.save(path, optimize=True)
    else:
        rgb.save(path, quality=92, optimize=True)


def header(lang, out):
    W, H = 3840, 1646
    sx, sy, sw, sh = 1097, 493, 1646, 661
    c = background((W, H))
    shots = RAW / "iphone" / lang
    # Phones rise from the bottom edge on both sides, outside the art safe area.
    ph, ph2 = 1480, 1320
    phone(c, shots / "today.png", -150, 520, ph2)
    phone(c, shots / "recipe.png", 330, 400, ph)
    phone(c, shots / "shopping.png", W + 150 - phone_width(ph2), 520, ph2)
    phone(c, shots / "planning.png", W - 330 - phone_width(ph), 400, ph)
    d = ImageDraw.Draw(c)
    title, sub = TEXT[lang][0], TEXT[lang][1]
    tf, tl = fit_text(d, title, sw, 2, 112)
    sf, sl = fit_text(d, sub, sw, 1, 56, "Medium")
    isz, lh = 190, round(tf.size * 1.12)
    block = isz + 44 + lh * len(tl) + 26 + sf.size
    y = sy + (sh - block) // 2
    icon(c, W // 2 - isz // 2, y, isz)
    y += isz + 44
    for line in tl:
        d.text((W // 2, y), line, font=tf, fill=INK, anchor="mt")
        y += lh
    d.text((W // 2, y + 26), sl[0], font=sf, fill=GREEN, anchor="mt")
    save(c, out / "header_3840x1646.png", "png")  # App Store Connect rejects .jpg for the header


def search(lang, out):
    W, H = 3840, 2560
    sx, sy, sw, sh = 836, 765, 2168, 1030
    c = background((W, H))
    shots = RAW / "iphone" / lang
    # Extra phones outside the safe area, only seen in wider crops.
    phone(c, shots / "stock.png", -260, 1500, 1500)
    phone(c, shots / "shopping.png", W + 260 - phone_width(1500), 1500, 1500)
    pw = phone_width(sh)
    right = sx + sw
    phone(c, shots / "planning.png", right - pw, sy, sh)
    phone(c, shots / "recipe_list.png", right - 2 * pw - 44, sy, sh)
    d = ImageDraw.Draw(c)
    text_w = sw - 2 * pw - 44 - 110
    title, sub = TEXT[lang][2], TEXT[lang][3]
    tf, tl = fit_text(d, title, text_w, 3, 112)
    sf, sl = fit_text(d, sub, text_w, 2, 54, "Medium")
    isz, lh, slh = 170, round(tf.size * 1.12), round(sf.size * 1.3)
    block = isz + 48 + lh * len(tl) + 30 + slh * len(sl)
    y = sy + (sh - block) // 2
    icon(c, sx, y, isz)
    y += isz + 48
    for line in tl:
        d.text((sx, y), line, font=tf, fill=INK)
        y += lh
    y += 30
    for line in sl:
        d.text((sx, y), line, font=sf, fill=GREEN)
        y += slh
    save(c, out / "search_3840x2560.jpg", "jpg")


def universal(lang, out):
    W, H = 5244, 2950
    sx, sy, sw, sh = 1921, 660, 1402, 962
    c = background((W, H))
    shots = RAW / "iphone" / lang
    side = 1150
    bw = phone_width(side)
    phone(c, shots / "stock.png", sx - 150 - 2 * bw - 90, 1380, side)
    phone(c, shots / "today.png", sx - 150 - bw, 1120, side)
    phone(c, shots / "shopping.png", sx + sw + 150, 1120, side)
    phone(c, shots / "cooking.png", sx + sw + 150 + bw + 90, 1380, side)
    pw = phone_width(sh)
    gap = (sw - 3 * pw) // 2
    for i, screen in enumerate(["recipe", "recipe_list", "planning"]):
        phone(c, shots / f"{screen}.png", sx + i * (pw + gap), sy, sh)
    icon(c, W // 2 - 110, sy - 360, 220)
    save(c, out / "universal_5244x2950.png", "png")


for lang, locale in LOCALES.items():
    out = ROOT / "store/screenshots/ios" / locale / "creative"
    header(lang, out)
    search(lang, out)
    universal(lang, out)
    print(out)
