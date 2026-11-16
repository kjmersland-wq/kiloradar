"""Builds the home-screen / favicon PNGs from public/logo-512.png (run once: python scripts/make_icons.py)."""
from pathlib import Path

from PIL import Image

PUB = Path(__file__).resolve().parent.parent / "public"
BG = (7, 11, 18, 255)  # #070B12, same as the logo background
logo = Image.open(PUB / "logo-512.png").convert("RGBA")


def square(size: int, inner: float = 1.0) -> Image.Image:
    """Opaque square icon. inner < 1 keeps the logo inside a safe zone (maskable icons)."""
    canvas = Image.new("RGBA", (size, size), BG)
    side = round(size * inner)
    mark = logo.resize((side, side), Image.LANCZOS)
    offset = (size - side) // 2
    canvas.alpha_composite(mark, (offset, offset))
    return canvas


square(180, 1.12).convert("RGB").save(PUB / "apple-touch-icon.png")  # iOS rounds the corners itself
square(192, 1.0).save(PUB / "icon-192.png")
square(512, 1.0).save(PUB / "icon-512.png")
square(512, 0.72).save(PUB / "icon-maskable-512.png")  # Android adaptive icon safe zone
logo.resize((32, 32), Image.LANCZOS).save(PUB / "favicon-32.png")
logo.resize((48, 48), Image.LANCZOS).save(
    PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
)
print("icons written")
