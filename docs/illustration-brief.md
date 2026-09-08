# 책숲 일러스트 브리프 (ChatGPT 이미지 생성용)

캐릭터·발자국 도장·등불·배경을 ChatGPT에서 직접 그려오기 위한 자산 목록과 프롬프트입니다.
완성된 PNG를 `public/illustrations/`에 아래 파일명 그대로 넣어주면 코드에서 바로 연결합니다.

## 작업 순서 (스타일이 흐트러지지 않게)

1. **한 대화(채팅) 안에서 전부 만듭니다.** 대화를 바꾸면 스타일이 달라집니다.
2. 맨 처음 **캐릭터 시트** 프롬프트(0번)로 다섯 캐릭터를 한 장에 뽑아 스타일을 고정합니다. 마음에 들 때까지 이것만 다시 뽑습니다.
3. 그다음부터 각 자산 프롬프트를 하나씩 보내되, 앞에 항상 **공통 스타일 문단**을 붙이고 "**위 캐릭터 시트와 똑같은 디자인으로**"라고 덧붙입니다.
4. **투명 배경은 요청하지 않습니다.** ChatGPT는 "투명"이라고 하면 체크무늬(회색 격자)를 그림에 그대로 그려 넣은 일반 PNG를 내놓습니다(1번 곰에서 실제로 확인). 대신 모든 그림을 앱 배경색과 같은 **단색 세이지그린(#EAF0E5)** 위에 그리게 하고, 배경 제거는 제가 코드로 처리합니다. 체크무늬·그라데이션·바닥 그림자가 보이면 "flat solid #EAF0E5 background, no checkerboard"로 다시 요청합니다.
5. 글자·워터마크·테두리가 들어가면 다시 뽑습니다.

## 공통 스타일 문단 (모든 프롬프트 맨 앞에 붙이기)

```
Children's picture-book illustration drawn in soft colored pencil texture, hand-drawn and warm, gentle and calm, minimal detail, soft edges without hard black outlines. Palette: sage green (#EAF0E5), leaf green (#2FA84F), deep forest green (#1B5E3A), warm amber lantern light (#E8A33D), dark forest-shadow ink (#26362B), a tiny touch of berry red (#D94A32) only if needed. One subject centered with generous empty space around it. Plain flat solid background filled with one uniform sage green color #EAF0E5 — no checkerboard pattern, no texture, no gradient, no ground shadow. No text, no watermark, no border, no frame. Not a sticker, not emoji style, not glossy 3D, not vector clip-art.
```

## 진행 상황

- 0번 캐릭터 시트: **확정** (`docs/illustrations/character-sheet.png`). 이후 그림은 전부 이 시트 기준.
- 1번 곰: **완료** (세이지 단색 배경으로 다시 받아 `scripts/knockout-bg.py`로 배경을 걷어냄 → `public/illustrations/bear-lantern.png`).
- 2번 편지 새: **완료** (`public/illustrations/bird-letter.png`, 진짜 투명 PNG로 나옴 — 이 방식이 되면 굳이 단색 배경으로 안 뽑아도 됨).

## 자산 목록

| # | 파일명 | 크기 | 쓰이는 곳 |
|---|---|---|---|
| 0 | (캐릭터 시트, 저장 안 해도 됨) | 정사각 | 스타일 고정용 |
| 1 | `bear-lantern.png` | 1024×1024 · 세이지 단색 배경 | 오늘 탭 헤더, 숙제 안내, 교사 대시보드 |
| 2 | `bird-letter.png` | 1024×1024 · 세이지 단색 배경 | 책장 공유(편지 보내기/받기), 새 추천도서 알림 |
| 3 | `bird-perched.png` | 1024×1024 · 세이지 단색 배경 | 기관·인플루언서 배지, 큐레이터 대시보드 |
| 4 | `rabbit.png` | 1024×1024 · 세이지 단색 배경 | 아이 아바타(온보딩·프로필·빈 화면) |
| 5 | `dog.png` | 1024×1024 · 세이지 단색 배경 | 아이 아바타 |
| 6 | `cat.png` | 1024×1024 · 세이지 단색 배경 | 아이 아바타 |
| 7 | `paw-rabbit.png` | 512×512 · 세이지 단색 배경 | 발자국 도장(기록 저장 순간, 발자국 카운트) |
| 8 | `paw-dog.png` | 512×512 · 세이지 단색 배경 | 발자국 도장 |
| 9 | `paw-cat.png` | 512×512 · 세이지 단색 배경 | 발자국 도장 |
| 10 | `lantern-on.png` | 512×512 · 세이지 단색 배경 | 그룹 진행률(켜진 등불) |
| 11 | `lantern-off.png` | 512×512 · 세이지 단색 배경 | 그룹 진행률(안 켜진 등불) |
| 12 | `forest-path.png` | 1536×1024 (배경 있음) | 오늘 탭·숲길 배경, 온보딩 첫 화면 |
| 13 | `app-icon.png` | 1024×1024 (배경 있음) | 앱 아이콘·홈 화면 아이콘 |

## 프롬프트

### 0. 캐릭터 시트 (스타일 고정용)

```
[공통 스타일 문단]
A character sheet showing five characters standing side by side in a row, all in the exact same drawing style and scale: (1) a friendly round bear with slightly worn brown-grey fur holding a small glowing amber lantern, (2) a slender white bird like a small egret, (3) a small round cream-colored rabbit, (4) a small round honey-brown dog, (5) a small round grey-blue cat. The rabbit, dog and cat are children-like and each hug a closed picture book. Gentle closed-eye smiles, simple shapes, same line weight and texture for all five. Plain flat white background for this sheet only.
```

### 1. 등불 든 곰 — `bear-lantern.png`

```
[공통 스타일 문단]
Same bear as in the character sheet. Full body, standing and walking slowly toward the right as if guiding the way through a night forest, holding up a small glowing amber lantern in one paw at shoulder height. The lantern gives off a soft warm halo. Gentle closed-eye smile, calm and reassuring. Flat solid sage green background (#EAF0E5).
```

### 2. 편지 물고 나는 하얀 새 — `bird-letter.png`

```
[공통 스타일 문단]
Same white bird as in the character sheet. In flight, seen from the side flying to the right, wings spread wide, carrying a small folded paper letter sealed with a tiny green wax seal in its beak. Light, airy, joyful. Flat solid sage green background (#EAF0E5).
```

### 3. 앉아 있는 하얀 새 — `bird-perched.png`

```
[공통 스타일 문단]
Same white bird as in the character sheet. Perched calmly on a thin bare branch, body facing slightly left, head turned toward the viewer, no letter. Quiet and attentive. Flat solid sage green background (#EAF0E5).
```

### 4. 토끼 — `rabbit.png`

```
[공통 스타일 문단]
Same rabbit as in the character sheet. Full body, standing, facing forward, hugging a closed picture book to its chest with both paws, ears up, curious happy expression, soft cream fur with a hint of pink inside the ears. Flat solid sage green background (#EAF0E5).
```

### 5. 강아지 — `dog.png`

```
[공통 스타일 문단]
Same dog as in the character sheet. Full body, standing, facing forward, hugging a closed picture book to its chest with both paws, floppy ears, cheerful expression, warm honey-brown fur. Flat solid sage green background (#EAF0E5).
```

### 6. 고양이 — `cat.png`

```
[공통 스타일 문단]
Same cat as in the character sheet. Full body, standing, facing forward, hugging a closed picture book to its chest with both paws, tail curled to one side, calm content expression, soft grey-blue fur. Flat solid sage green background (#EAF0E5).
```

### 7. 토끼 발자국 도장 — `paw-rabbit.png`

```
A single rubber-stamp style paw print of a rabbit: two elongated oval pads above and two small round toe pads, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and grainy like a real ink stamp on paper, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
```

### 8. 강아지 발자국 도장 — `paw-dog.png`

```
A single rubber-stamp style paw print of a dog: one large heart-shaped pad with four round toe pads above it, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and grainy like a real ink stamp on paper, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
```

### 9. 고양이 발자국 도장 — `paw-cat.png`

```
A single rubber-stamp style paw print of a cat: a smaller rounded pad with four small oval toe pads close together, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and grainy like a real ink stamp on paper, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
```

### 10. 켜진 등불 — `lantern-on.png`

```
[공통 스타일 문단]
A small old-fashioned hanging lantern (the same one the bear carries), lit, glowing warm amber (#E8A33D) with a soft round light halo around it, hanging from a short loop at the top. Centered, flat solid sage green background (#EAF0E5).
```

### 11. 꺼진 등불 — `lantern-off.png`

```
[공통 스타일 문단]
The exact same small hanging lantern as before but unlit: dark glass, no glow, no halo, slightly dimmer colors, hanging from a short loop at the top. Centered, flat solid sage green background (#EAF0E5).
```

### 12. 밤 숲길 배경 — `forest-path.png` (가로, 배경 있음)

```
[공통 스타일 문단 — 단, 이 그림은 단색 배경 대신 장면이 화면 전체를 채웁니다]
A wide, gentle night forest scene: a soft winding path leading from the bottom toward the distance, tall rounded trees on both sides, a calm indigo-green starry sky, a few tiny amber lantern lights far along the path. No characters, no text. Leave the lower third of the image quiet and simple so characters can be placed there later. Dreamy, calm, colored pencil texture over the whole image. Landscape 3:2.
```

### 13. 앱 아이콘 — `app-icon.png` (배경 있음)

```
App icon design, flat and very simple, readable at tiny size: a single glowing amber lantern (#E8A33D) with a soft halo on a plain sage green (#EAF0E5) rounded-square background, tiny hint of the bear's paw holding the lantern handle at the bottom edge, colored pencil texture kept subtle. No text, no border, square 1:1, fills the whole canvas.
```

## 다 만든 뒤

- 지금처럼 채팅으로 파일을 그대로 보내 주시면 됩니다(파일명은 제가 붙입니다). 배경이 단색 세이지그린인지만 확인해 주세요.
- 그러면 제가 오늘 탭 헤더의 곰, 기록 저장 순간의 "발자국 도장 쾅" 애니메이션, 책장 공유의 편지 새, 그룹 등불 진행률, 아바타 교체, 앱 아이콘까지 한 번에 연결합니다.
