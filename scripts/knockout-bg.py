#!/usr/bin/env python3
"""단색(세이지그린) 배경 위에 그린 일러스트에서 배경을 걷어내 투명 PNG로 만든다.

사용: python3 scripts/knockout-bg.py <입력.png> <출력.png> [--trim]

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
im = Image.open(src).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
h, w, _ = rgb.shape

corners = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
                          rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)])
bg = np.median(corners, axis=0)
dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))

LO, HI = 6.0, 40.0  # 거리 LO 이하 = 완전 배경, HI 이상 = 완전 그림
hard_bg = dist < LO
labels, _ = ndimage.label(hard_bg)
edge_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
edge_labels.discard(0)
bg_region = np.isin(labels, list(edge_labels))

# 배경 영역과 그 주변 띠에서만 부드러운 알파, 나머지는 불투명
band = ndimage.binary_dilation(bg_region, iterations=6)
alpha = np.ones((h, w), np.float32)
ramp = np.clip((dist - LO) / (HI - LO), 0, 1)
alpha[band] = ramp[band]
alpha[bg_region] = 0

# un-premultiply: 관측색 = a*fg + (1-a)*bg  →  fg = (obs - (1-a)*bg) / a
a3 = alpha[..., None]
fg = np.where(a3 > 0.02, (rgb - (1 - a3) * bg) / np.maximum(a3, 0.02), rgb)
fg = np.clip(fg, 0, 255)

out = np.dstack([fg, alpha * 255]).astype(np.uint8)
res = Image.fromarray(out, "RGBA")
if trim:
    box = res.getbbox()
    pad = 16
    res = res.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad)))
res.save(dst)
print(f"bg={bg.round().astype(int).tolist()} size={res.size} transparent%={(alpha==0).mean()*100:.1f}")
