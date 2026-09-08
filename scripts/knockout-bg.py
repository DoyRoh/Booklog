#!/usr/bin/env python3
"""단색(세이지그린) 배경 위에 그린 일러스트에서 배경을 걷어내 투명 PNG로 만든다.

사용: python3 scripts/knockout-bg.py <입력.png> <출력.png> [--trim] [--lo N] [--hi N]

하얀 새처럼 그림 자체가 배경색과 가까우면 --hi를 낮춘다(기본 40 → 10 정도).

원리: 네 모서리 색을 배경색으로 잡고, 배경색과의 색 거리로 알파를 만든다.
가장자리에서 이어진 배경 영역만 지우므로(플러드 필), 그림 안쪽에 배경과
비슷한 색이 있어도 구멍이 나지 않는다. 반투명 가장자리는 배경색 성분을
빼서(un-premultiply) 세이지색 테두리가 남지 않게 한다.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
trim = "--trim" in sys.argv
def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default
im = Image.open(src).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
h, w, _ = rgb.shape

corners = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
                          rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)])
bg = np.median(corners, axis=0)
dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))

LO, HI = opt("--lo", 6.0), opt("--hi", 40.0)  # 거리 LO 이하 = 완전 배경, HI 이상 = 완전 그림
ISLAND = int(opt("--island", 400))  # 그림에 둘러싸인 배경색 섬이 이 픽셀 수 이상이면 배경으로 간주(다리 사이 틈 등)

def edge_connected(mask):
    labels, _ = ndimage.label(mask)
    ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    ids.discard(0)
    return np.isin(labels, list(ids))

# 배경 후보(dist<HI) 중 가장자리에서 이어진 영역만 배경으로 본다 — 배경의
# 미세한 노이즈 픽셀이 섬으로 남지 않고, 그림 안쪽의 비슷한 색은 보호된다.
bg_region = edge_connected(dist < HI)
# 그림에 완전히 둘러싸인 큰 배경색 섬(예: 두 다리 사이)도 배경으로
labels, n = ndimage.label((dist < LO) & ~bg_region)
if n:
    sizes = ndimage.sum(np.ones_like(labels), labels, index=np.arange(1, n + 1))
    big = np.isin(labels, np.flatnonzero(sizes >= ISLAND) + 1)
    bg_region |= ndimage.binary_dilation(big, iterations=3)

alpha = np.ones((h, w), np.float32)
ramp = np.clip((dist - LO) / (HI - LO), 0, 1)
alpha[bg_region] = ramp[bg_region]
# 배경 노이즈로 생긴 옅은 알파(그림과 붙어 있지 않은 것)는 0으로
strong = alpha > 0.3
keep = ndimage.binary_dilation(strong, iterations=3)
alpha[bg_region & ~keep] = 0

# un-premultiply: 관측색 = a*fg + (1-a)*bg  →  fg = (obs - (1-a)*bg) / a
a3 = alpha[..., None]
fg = np.where(a3 > 0.02, (rgb - (1 - a3) * bg) / np.maximum(a3, 0.02), rgb)
fg = np.clip(fg, 0, 255)

out = np.dstack([fg, alpha * 255]).astype(np.uint8)
res = Image.fromarray(out, "RGBA")
if trim:
    box = res.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()  # 거의 투명한 잔티는 무시
    pad = 16
    res = res.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad)))
res.save(dst)
print(f"bg={bg.round().astype(int).tolist()} size={res.size} transparent%={(alpha==0).mean()*100:.1f}")
