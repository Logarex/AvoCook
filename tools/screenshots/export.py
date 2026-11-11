"""Turns raw captures into store uploads and README/site images.

python3 tools/screenshots/export.py <raw-dir>
  <raw-dir>/<device>/<lang>/<screen>.png, device in iphone, ipad, duo-outer, duo-inner, android
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(sys.argv[1])
SCREENS = ["recipe_list", "recipe", "today", "planning", "cooking", "stock", "shopping", "seasonal"]
LANGS = {"fr": ("fr-FR", "fr-FR"), "en": ("en-US", "en-US"), "de": ("de-DE", "de-DE"),
         "es": ("es-ES", "es-ES"), "it": ("it-IT", "it"), "da": ("da-DK", "da")}
# Native simulator/emulator sizes accepted by the stores.
IOS = {"iphone": ("iPhone 6.9", (1320, 2868)), "ipad": ("iPad 13", (2064, 2752)),
       "duo-outer": ("iPhone Duo outer", (1398, 2034)), "duo-inner": ("iPhone Duo inner", (2007, 2853))}
ANDROID_SIZE = (1080, 1920)


def rgb(path, size):
    image = Image.open(path).convert("RGB")
    if image.size != size:
        raise SystemExit(f"{path}: {image.size}, expected {size}")
    return image


count = 0
for lang, (ios_locale, play_locale) in LANGS.items():
    for device, (label, size) in IOS.items():
        for index, screen in enumerate(SCREENS, 1):
            source = RAW / device / lang / f"{screen}.png"
            if not source.exists():
                continue
            target = ROOT / "store/screenshots/ios" / ios_locale / f"{index:02d}_{device}_{screen}.png"
            target.parent.mkdir(parents=True, exist_ok=True)
            rgb(source, size).save(target, optimize=True)
            count += 1
    for index, screen in enumerate(SCREENS, 1):
        source = RAW / "android" / lang / f"{screen}.png"
        if source.exists():
            target = ROOT / "store/screenshots/android" / play_locale / "phoneScreenshots" / f"{index:02d}_{screen}.png"
            target.parent.mkdir(parents=True, exist_ok=True)
            rgb(source, ANDROID_SIZE).save(target, optimize=True)
            count += 1
    # README and website: iPhone captures at a third of their size.
    docs = ROOT / "assets/screenshots" / lang
    docs.mkdir(parents=True, exist_ok=True)
    for old in docs.glob("*.png"):
        old.unlink()
    for screen in SCREENS:
        source = RAW / "iphone" / lang / f"{screen}.png"
        image = rgb(source, IOS["iphone"][1]).resize((440, 956), Image.LANCZOS)
        image.save(docs / f"{screen}.png", optimize=True)
        count += 1
print(f"{count} images written")
