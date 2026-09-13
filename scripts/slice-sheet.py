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
rows_n = int(opt("--rows", 0))  # --cols C --rows R 를 주면 고정 격자로 자른다(그림 간격이 좁을 때 안전)
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
if cols and rows_n:
    cw, ch = im.width / cols, im.height / rows_n
    pad = 12
    k = 0
    for r in range(rows_n):
        for c in range(cols):
            if k >= len(names): break
            x0, y0, x1, y1 = int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)
            cell = alpha[y0:y1, x0:x1]
            ys, xs = np.where(cell)
            if len(xs) == 0:
                print(f"  {names[k]}: 빈 칸"); k += 1; continue
            box = (x0 + xs.min() - pad, y0 + ys.min() - pad, x0 + xs.max() + 1 + pad, y0 + ys.min() + (ys.max() - ys.min()) + 1 + pad)
            crop = im.crop((max(0, box[0]), max(0, box[1]), min(im.width, box[2]), min(im.height, box[3])))
            crop.save(out_dir / f"{names[k]}.png"); print(f"  {names[k]}.png {crop.size}"); k += 1
    tmp.unlink(); sys.exit(0)
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
