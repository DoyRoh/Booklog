#!/usr/bin/env python3
"""단색 잉크 도장 그림(단색 배경 위)을 '알파 마스크 + 잉크색' PNG로 만든다.

사용: python3 scripts/stamp-mask.py <입력.png> <출력.png> [--ink 1B5E3A]

캐릭터용 knockout-bg.py와 달리 배경과의 색 거리를 그대로 알파로 쓴다 --
크레용 도장 안쪽의 자잘한 빈 구멍까지 전부 투명해져서, 어떤 배경 위에
올려도 진짜 도장 자국처럼 보인다. 색은 잉크색 한 가지로 통일하므로
CSS mask-image로 쓰면 원하는 색(예: 진한 배경 위에서는 종이색)으로도
찍을 수 있다.
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
ink = sys.argv[sys.argv.index("--ink") + 1] if "--ink" in sys.argv else "1B5E3A"
ink_rgb = tuple(int(ink[i:i + 2], 16) for i in (0, 2, 4))
im = Image.open(src).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
bg = np.median(np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)]), axis=0)
ink_dist = np.sqrt(((bg - np.array(ink_rgb)) ** 2).sum())
dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
alpha = np.clip(dist / (ink_dist * 0.85), 0, 1)  # 잉크색 근처면 완전 불투명
out = np.zeros((*alpha.shape, 4), np.uint8)
out[..., :3] = ink_rgb
out[..., 3] = (alpha * 255).astype(np.uint8)
res = Image.fromarray(out, "RGBA")
box = res.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
pad = 16
res = res.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(res.width, box[2] + pad), min(res.height, box[3] + pad)))
# 도장은 앱에서 작게 쓰므로 긴 변 512px로 줄인다
res.thumbnail((512, 512), Image.LANCZOS)
res.save(dst)
print(f"{dst} {res.size}")
