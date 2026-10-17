# 앱 아이콘 배경: docs/illustrations/icon-forest-src.jpg -> 정사각 2048, 아래쪽 살짝 밝게, 하늘에 별(달 없음).
# python3 scripts/icon-bg.py docs/illustrations/icon-forest-src.jpg out.png
import sys, random
import numpy as np
from PIL import Image, ImageFilter
src = Image.open(sys.argv[1]).convert("RGB")
w, h = src.size
im = src.crop((0, 0, w, w)).resize((2048, 2048), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
# 아래로 갈수록 살짝 밝게(앞쪽 나무를 연두빛으로)
y = np.linspace(0, 1, 2048)[:, None, None]
t = np.clip((y - 0.45) / 0.55, 0, 1) ** 1.3
a = a * (1 + 0.28 * t) + np.array([6, 12, 4]) * t
a = np.clip(a, 0, 255)
# 별: 남색 하늘 픽셀에만
rng = random.Random(7)
sky = (a[..., 2] > a[..., 1] + 4) & (a.sum(-1) < 190)
stars = Image.new("L", (2048, 2048), 0)
from PIL import ImageDraw
d = ImageDraw.Draw(stars)
n = 0
while n < 170:
    x, yy = rng.randrange(2048), rng.randrange(2048)
    if not sky[yy, x]: continue
    r = rng.choice([2, 2, 3, 3, 4, 5])
    d.ellipse((x - r, yy - r, x + r, yy + r), fill=rng.randrange(150, 255))
    n += 1
glow = stars.filter(ImageFilter.GaussianBlur(4))
s = np.maximum(np.asarray(stars), np.asarray(glow) * 0.8)[..., None] / 255.0
a = a * (1 - s) + np.array([255, 236, 190]) * s
Image.fromarray(a.astype(np.uint8)).save(sys.argv[2])
