#!/usr/bin/env python3
"""단색 배경 위에 여러 그림을 격자로 그린 시트를 낱개 투명 PNG로 잘라낸다.

사용: python3 scripts/slice-sheet.py <시트.png> <출력폴더> <이름1,이름2,...> [--cols N] [--lo N] [--hi N]

먼저 knockout-bg.py와 같은 방식으로 배경을 걷어낸 뒤, 남은 그림 덩어리를
연결 요소로 찾아 왼쪽→오른쪽, 위→아래 순서로 이름을 붙인다. 붙어 있지
않은 조각(편지, 등불 빛무리 등)은 30px 안에 있으면 같은 그림으로 합친다.
"""
import sys, subprocess, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

src, out_dir, names = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3].split(",")
def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default
cols = int(opt("--cols", 0))
extra = [a for a in sys.argv[4:] if a.startswith("--lo") or a.startswith("--hi")]
passthru = []
for flag in ("--lo", "--hi"):
    if flag in sys.argv:
        passthru += [flag, sys.argv[sys.argv.index(flag) + 1]]

out_dir.mkdir(parents=True, exist_ok=True)
tmp = out_dir / "_sheet-cutout.png"
subprocess.run([sys.executable, "scripts/knockout-bg.py", src, str(tmp), *passthru], check=True)

im = Image.open(tmp)
alpha = np.asarray(im.getchannel("A")) > 24
blob = ndimage.binary_dilation(alpha, iterations=30)
labels, n = ndimage.label(blob)
boxes = []
for i in range(1, n + 1):
    ys, xs = np.where((labels == i) & alpha)
    if len(xs) < 2000:  # 잔티
        continue
    boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
# 행 묶기: 세로 중심이 가까운 것끼리 같은 행
boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
rows, cur = [], []
for b in boxes:
    cy = (b[1] + b[3]) / 2
    if cur and abs(cy - (cur[-1][1] + cur[-1][3]) / 2) > (cur[-1][3] - cur[-1][1]) * 0.6:
        rows.append(cur); cur = []
    cur.append(b)
if cur: rows.append(cur)
ordered = [b for row in rows for b in sorted(row, key=lambda b: b[0])]
print(f"찾은 그림 {len(ordered)}개, 이름 {len(names)}개")
pad = 12
for name, b in zip(names, ordered):
    crop = im.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(im.width, b[2] + pad), min(im.height, b[3] + pad)))
    crop.save(out_dir / f"{name}.png")
    print(f"  {name}.png {crop.size}")
if len(ordered) != len(names):
    print("!! 개수가 안 맞음 — 시트를 확인하세요")
tmp.unlink()
