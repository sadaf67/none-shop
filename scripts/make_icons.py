"""تولید آیکون‌های PWA برای «ن وان» از روی طرح نشان SVG."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'frontend' / 'public' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)

SS = 4  # supersampling
TOP = (0xFF, 0x91, 0x6F)
MID = (0xFF, 0x6B, 0x3D)
BOTTOM = (0xDE, 0x43, 0x20)


def gradient(size: int) -> Image.Image:
    img = Image.new('RGB', (size, size))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            if t < 0.55:
                k = t / 0.55
                start, end = TOP, MID
            else:
                k = (t - 0.55) / 0.45
                start, end = MID, BOTTOM
            pixels[x, y] = tuple(int(start[i] + (end[i] - start[i]) * k) for i in range(3))
    return img


def draw_mark(size: int, *, padding_ratio: float = 0.0, radius_units: float = 14.0) -> Image.Image:
    """نشان «ن» را در تصویری مربعی رسم می‌کند. padding_ratio برای آیکون maskable."""
    big = size * SS
    canvas = Image.new('RGBA', (big, big), (0, 0, 0, 0))

    inner = int(big * (1 - 2 * padding_ratio))
    offset = (big - inner) // 2
    unit = inner / 48.0

    def px(value: float) -> float:
        return offset + value * unit

    # پس‌زمینه‌ی گرادیانی با گوشه‌های گرد
    bg = gradient(inner).convert('RGBA')
    mask = Image.new('L', (inner, inner), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, inner - 1, inner - 1), radius=int(radius_units * unit), fill=255
    )
    canvas.paste(bg, (offset, offset), mask)

    draw = ImageDraw.Draw(canvas)
    stroke = max(1, int(3.6 * unit))
    cap = stroke / 2

    # دو خط عمودی انتهای کاسه‌ی «ن»
    for x_unit in (13.0, 35.0):
        draw.line((px(x_unit), px(16.0), px(x_unit), px(22.0)), fill='white', width=stroke)
        draw.ellipse((px(x_unit) - cap, px(16.0) - cap, px(x_unit) + cap, px(16.0) + cap), fill='white')

    # کاسه‌ی حرف «ن» — نیم‌دایره‌ی پایین.
    # Pillow ضخامت کمان را به سمت داخل رسم می‌کند، پس شعاع را نصفِ ضخامت بزرگ‌تر می‌گیریم
    # تا نوار کمان روی شعاع ۱۱ وسط‌چین شود و با خطوط عمودی هم‌راستا بماند.
    outer = 11.0 + 3.6 / 2
    draw.arc(
        (px(24.0 - outer), px(22.0 - outer), px(24.0 + outer), px(22.0 + outer)),
        start=0, end=180, fill='white', width=stroke,
    )

    # نقطه‌ی حرف «ن»
    r = 2.9 * unit
    draw.ellipse((px(24.0) - r, px(13.0) - r, px(24.0) + r, px(13.0) + r), fill='white')

    return canvas.resize((size, size), Image.LANCZOS)


targets = [
    ('icon-192.png', 192, 0.0, 14.0),
    ('icon-512.png', 512, 0.0, 14.0),
    ('icon-maskable-512.png', 512, 0.10, 24.0),
    ('apple-touch-icon.png', 180, 0.0, 14.0),
]

for filename, size, padding, radius in targets:
    image = draw_mark(size, padding_ratio=padding, radius_units=radius)
    if filename == 'icon-maskable-512.png':
        # maskable باید تمام‌قاب باشد؛ پس‌زمینه را پر می‌کنیم
        base = Image.new('RGBA', (size, size), MID + (255,))
        base.alpha_composite(image)
        image = base
    image.save(OUT / filename)
    print('saved', OUT / filename)
