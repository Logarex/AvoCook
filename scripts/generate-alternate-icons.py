#!/usr/bin/env python3
"""Generate AvoCook alternate app icons (light + dark).

Each icon has its own palette and composition so it reads as a distinct
choice next to the default avocado logo, while keeping AvoCook's flat,
rounded, geometric drawing style.

Usage: python3 scripts/generate-alternate-icons.py (macOS: uses qlmanage/sips)

Writes:
- assets/alternate-icons/*.svg|png: 1024px opaque icons, copied into the iOS
  asset catalog by tools/plugins/withAlternateAppIcons.js at prebuild.
- assets/alternate-icons/preview/: small thumbnails for the Settings picker.
- the native module's Android res/: adaptive + legacy launcher icons used by
  the activity-alias entries the config plugin adds.
"""

import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "alternate-icons"
PREVIEW = OUT / "preview"
ANDROID_RES = ROOT / "src" / "modules" / "avocook-timer-notifications" / "android" / "src" / "main" / "res"
PREVIEW_SIZE = 180
ANDROID_ART_SIZE = 432  # 108dp at xxxhdpi
ANDROID_LEGACY_SIZE = 192  # 48dp at xxxhdpi

FRAME = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="{bg}"/>
{body}
</svg>
"""

# Carrot: big diagonal carrot on a peach / deep-brown background.
CARROT = {
    "palettes": {
        "light": {"bg": "#FBE3CC", "glow": "#F7CDA6", "body": "#EE7A2F",
                  "ridge": "#C95A17", "leaf": "#4C9A55", "leaf2": "#6FBF6A"},
        "dark": {"bg": "#24170F", "glow": "#3A2416", "body": "#FF9645",
                 "ridge": "#D9681F", "leaf": "#5DB067", "leaf2": "#8ED683"},
    },
    "body": """  <circle cx="512" cy="512" r="360" fill="{glow}"/>
  <g transform="translate(512 530) scale(0.82) translate(-512 -512) rotate(35 512 512)">
    <ellipse cx="512" cy="196" rx="52" ry="128" fill="{leaf}"/>
    <ellipse cx="430" cy="226" rx="44" ry="112" fill="{leaf2}" transform="rotate(-28 430 300)"/>
    <ellipse cx="594" cy="226" rx="44" ry="112" fill="{leaf2}" transform="rotate(28 594 300)"/>
    <path d="M372 386c0-56 46-90 140-90s140 34 140 90L552 846c-12 48-68 48-80 0Z" fill="{body}"/>
    <rect x="420" y="430" width="96" height="26" rx="13" fill="{ridge}"/>
    <rect x="520" y="540" width="84" height="26" rx="13" fill="{ridge}"/>
    <rect x="448" y="650" width="70" height="24" rx="12" fill="{ridge}"/>
    <rect x="512" y="748" width="44" height="22" rx="11" fill="{ridge}"/>
  </g>""",
}

# Cookbook: open recipe book on a blue background.
COOKBOOK = {
    "palettes": {
        "light": {"bg": "#DCE7F7", "cover": "#2D4C86", "page": "#FFFDF7",
                  "fold": "#E9E3D3", "line": "#B9C6DD", "ribbon": "#E2504C",
                  "spoon": "#2D4C86"},
        "dark": {"bg": "#0E1628", "cover": "#5E86D6", "page": "#1E2A40",
                 "fold": "#16203A", "line": "#41557C", "ribbon": "#FF6A63",
                 "spoon": "#A9C2F2"},
    },
    "body": """  <path d="M160 300c120-40 240-40 352 20 112-60 232-60 352-20v460c-120-40-240-40-352 20-112-60-232-60-352-20Z" fill="{cover}"/>
  <path d="M196 280c110-30 214-24 308 28v444c-94-52-198-58-308-28Z" fill="{page}"/>
  <path d="M828 280c-110-30-214-24-308 28v444c94-52 198-58 308-28Z" fill="{page}"/>
  <path d="M504 308h16v444h-16Z" fill="{fold}"/>
  <rect x="244" y="350" width="200" height="20" rx="10" fill="{line}"/>
  <rect x="244" y="410" width="168" height="20" rx="10" fill="{line}"/>
  <rect x="244" y="470" width="200" height="20" rx="10" fill="{line}"/>
  <rect x="244" y="530" width="140" height="20" rx="10" fill="{line}"/>
  <rect x="244" y="590" width="184" height="20" rx="10" fill="{line}"/>
  <ellipse cx="672" cy="420" rx="62" ry="80" fill="{spoon}"/>
  <rect x="656" y="480" width="32" height="200" rx="16" fill="{spoon}"/>
  <path d="M560 252h56v236l-28-26-28 26Z" fill="{ribbon}"/>""",
}

# Plate: top-down place setting on a sunny yellow / charcoal background.
PLATE = {
    "palettes": {
        "light": {"bg": "#F6CF45", "plate": "#FFFFFF", "rim": "#EFEAE0",
                  "food": "#E4572E", "herb": "#3E8E5E", "cutlery": "#2B2A28"},
        "dark": {"bg": "#1B1A17", "plate": "#34322D", "rim": "#26241F",
                 "food": "#FF7148", "herb": "#62C08A", "cutlery": "#F6CF45"},
    },
    "body": """  <circle cx="512" cy="512" r="250" fill="{plate}"/>
  <circle cx="512" cy="512" r="186" fill="{rim}"/>
  <circle cx="512" cy="512" r="112" fill="{food}"/>
  <ellipse cx="478" cy="468" rx="22" ry="46" fill="{herb}" transform="rotate(-35 478 468)"/>
  <ellipse cx="548" cy="470" rx="20" ry="42" fill="{herb}" transform="rotate(30 548 470)"/>
  <g transform="translate(36 0)">
  <rect x="146" y="300" width="16" height="120" rx="8" fill="{cutlery}"/>
  <rect x="176" y="300" width="16" height="120" rx="8" fill="{cutlery}"/>
  <rect x="206" y="300" width="16" height="120" rx="8" fill="{cutlery}"/>
  <path d="M146 404h76v26c0 22-14 34-20 38v236c0 14-10 24-18 24s-18-10-18-24V468c-6-4-20-16-20-38Z" fill="{cutlery}"/>
  </g>
  <path transform="translate(-36 0)" d="M872 300c-42 22-62 90-62 186 0 24 12 36 30 36v182c0 14 10 24 18 24s18-10 18-24V306c0-8-2-10-4-6Z" fill="{cutlery}"/>""",
}

ICONS = {"carrot": CARROT, "cookbook": COOKBOOK, "plate": PLATE}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, icon in ICONS.items():
        for theme, palette in icon["palettes"].items():
            svg = FRAME.format(bg=palette["bg"], body=icon["body"].format(**palette))
            suffix = "" if theme == "light" else "-dark"
            (OUT / f"icon-{name}{suffix}.svg").write_text(svg)
            print(f"wrote icon-{name}{suffix}.svg")
    rasterize()
    write_previews()
    write_android_resources()


def resize(source: Path, target: Path, size: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["sips", "-Z", str(size), str(source), "--out", str(target)],
                   check=True, capture_output=True)


def write_previews() -> None:
    resize(ROOT / "assets" / "icon.png", PREVIEW / "icon-default.png", PREVIEW_SIZE)
    resize(ROOT / "assets" / "icon-dark.png", PREVIEW / "icon-default-dark.png", PREVIEW_SIZE)
    for name in ICONS:
        for suffix in ("", "-dark"):
            resize(OUT / f"icon-{name}{suffix}.png", PREVIEW / f"icon-{name}{suffix}.png", PREVIEW_SIZE)


ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/avocook_icon_{name}_bg"/>
  <foreground>
    <inset android:drawable="@drawable/avocook_icon_{name}_art" android:inset="16.667%"/>
  </foreground>
</adaptive-icon>
"""


def write_android_resources() -> None:
    colors = {"": [], "-night": []}
    for name, icon in ICONS.items():
        for theme, palette in icon["palettes"].items():
            night = "" if theme == "light" else "-night"
            suffix = "" if theme == "light" else "-dark"
            source = OUT / f"icon-{name}{suffix}.png"
            # Full artwork, inset to the 72dp visible area of the 108dp layer.
            resize(source, ANDROID_RES / f"drawable{night}-nodpi" / f"avocook_icon_{name}_art.png",
                   ANDROID_ART_SIZE)
            # Legacy launcher icon for Android 7.x (no adaptive icons).
            resize(source, ANDROID_RES / f"mipmap{night}-xxxhdpi" / f"avocook_icon_{name}.png",
                   ANDROID_LEGACY_SIZE)
            colors[night].append(f'  <color name="avocook_icon_{name}_bg">{palette["bg"]}</color>')
        adaptive = ANDROID_RES / "mipmap-anydpi-v26" / f"avocook_icon_{name}.xml"
        adaptive.parent.mkdir(parents=True, exist_ok=True)
        adaptive.write_text(ADAPTIVE_XML.format(name=name))
    for night, lines in colors.items():
        folder = ANDROID_RES / f"values{night}"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "avocook_app_icons.xml").write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + "\n".join(lines) + "\n</resources>\n")
    print("wrote previews and Android resources")


def rasterize() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        svgs = sorted(str(path) for path in OUT.glob("*.svg"))
        subprocess.run(["qlmanage", "-t", "-s", "1024", "-o", tmp, *svgs],
                       check=True, capture_output=True)
        for rendered in Path(tmp).glob("*.svg.png"):
            target = OUT / rendered.name.replace(".svg.png", ".png")
            # Re-encode through JPEG to drop the alpha channel (iOS rejects
            # app icons with transparency).
            jpg = Path(tmp) / (target.stem + ".jpg")
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "best",
                            str(rendered), "--out", str(jpg)], check=True, capture_output=True)
            subprocess.run(["sips", "-s", "format", "png", str(jpg), "--out", str(target)],
                           check=True, capture_output=True)
            print(f"wrote {target.name}")


if __name__ == "__main__":
    main()
