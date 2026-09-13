# 책숲 일러스트 브리프 (ChatGPT 이미지 생성용)

캐릭터·발자국 도장·등불·배경을 ChatGPT에서 직접 그려오기 위한 자산 목록과 프롬프트입니다.
완성된 PNG를 `public/illustrations/`에 아래 파일명 그대로 넣어주면 코드에서 바로 연결합니다.

## 작업 순서 (스타일이 흐트러지지 않게)

> 참고 이미지(다른 작가의 크레용 그림)는 톤·단순함의 정도만 참고하고, 작가 이름이나 그림을 ChatGPT에 직접 넣어 따라 그리게 하지 않습니다(CLAUDE.md 저작권 원칙).

1. **한 대화(채팅) 안에서 전부 만듭니다.** 대화를 바꾸면 스타일이 달라집니다.
2. 맨 처음 **캐릭터 시트** 프롬프트(0번)로 다섯 캐릭터를 한 장에 뽑아 스타일을 고정합니다. 마음에 들 때까지 이것만 다시 뽑습니다.
3. 그다음부터 각 자산 프롬프트를 하나씩 보내되, 앞에 항상 **공통 스타일 문단**을 붙이고 "**위 캐릭터 시트와 똑같은 디자인으로**"라고 덧붙입니다.
4. **투명 배경은 요청하지 않습니다.** ChatGPT는 "투명"이라고 하면 체크무늬(회색 격자)를 그림에 그대로 그려 넣은 일반 PNG를 내놓습니다(1번 곰에서 실제로 확인). 대신 모든 그림을 앱 배경색과 같은 **단색 세이지그린(#EAF0E5)** 위에 그리게 하고, 배경 제거는 제가 코드로 처리합니다. 체크무늬·그라데이션·바닥 그림자가 보이면 "flat solid #EAF0E5 background, no checkerboard"로 다시 요청합니다.
5. 글자·워터마크·테두리가 들어가면 다시 뽑습니다.

## 공통 스타일 문단 (모든 프롬프트 맨 앞에 붙이기)

```
Children's picture-book illustration in a simple naive crayon and oil-pastel style: hand-drawn, warm, gentle, quietly playful, like a child's favorite board book. Build everything from large flat chunky color shapes with visible broad crayon strokes, uneven waxy coverage and softly irregular edges. No outlines. A subtle paper grain may show inside the colored shapes only. Character rules: extremely simple and iconic, a rounded chunky silhouette, slightly imperfect handmade proportions, short stubby limbs, no neck. Face = two tiny black dot eyes, a small pale muzzle patch with a tiny black nose, and at most a tiny mouth line; no eyebrows, no blush, no sparkles, no teeth. Fixed character colors: moon bear = flat black fur with a small white crescent on the chest and a pale muzzle; white egret = flat white body, warm amber beak, thin dark legs; rabbit = cream with pale pink inner ears; dog = honey brown with floppy ears; cat = grey-blue with pointed ears; every picture book = deep forest green cover. Do not draw individual strands of fur or feathers, hatching, intricate textures, digital shading, highlights, reflections, or 3D modeling. Keep the stroke thickness and level of simplicity identical to the character sheet. Palette only: sage green (#EAF0E5), leaf green (#2FA84F), deep forest green (#1B5E3A), warm amber (#E8A33D), dark forest-shadow ink (#26362B), a tiny touch of berry red (#D94A32) only if needed, plus the fixed character colors above. Composition: one subject, full body, straight-on at eye level, centered, filling about 60% of the height, generous empty space around it. Background: one perfectly flat uniform sage green (#EAF0E5) fill; no paper texture, gradient, checkerboard, scenery, light rays, or ground shadow. No text, watermark, border, or frame. Not a sticker, not emoji or kawaii style, not glossy 3D, not vector clip-art, and not a detailed colored-pencil illustration.
```

## 진행 상황

- **그림체 변경(2차)**: 색연필 세밀화(1차, `docs/illustrations/pencil-v1/`에 보관)가 앱 아이콘 크기에서 뭉개져 보여, 단순한 크레용·오일파스텔 스타일로 바꿨습니다. 공통 스타일 문단은 사용자가 직접 다시 쓴 것을 기준으로 합니다.
- 곰은 **까만 반달가슴곰**(가슴에 흰 초승달 무늬)으로 정함. 2차 시트의 갈색 곰은 1번 프롬프트에서 반달곰으로 바꿔 뽑는다.
- 0번 캐릭터 시트(2차): **확정** (`docs/illustrations/character-sheet.png`). 이후 그림은 전부 이 시트 기준.
- 1~11번 + 앱 아이콘: **완료** — 12칸 시트 한 장(`docs/illustrations/sheet-1.png`)을 `slice-sheet.py --cols 4 --rows 3`으로 잘라 `public/illustrations/`에 넣음(칸당 약 250~320px). 발자국 3종은 모양이 거의 같게 나왔지만 도장 크기에선 구분이 무의미해 그대로 씀.
- 12번 숲길 배경: **완료** (`public/illustrations/forest-path.jpg`, 1200px JPEG로 축소).
- 발자국 도장 3종은 시트 것 대신 따로 받은 것으로 교체(`stamp-mask.py`로 마스크화).
- **3차 캐릭터 시트**(`docs/illustrations/character-sheet.png`, 털 질감 있는 평면 스타일 — 2차 숲 배경과 같은 결): 곰·백로·토끼·강아지·고양이 5종 교체 완료. 편지 물고 나는 새·발자국 도장 3종·등불 2종도 같은 스타일로 다시 받아 교체 완료(`docs/illustrations/sheet-stamps-lanterns.png`). 이제 전 자산이 3차 스타일로 통일됨.
- **앱 연결 완료** — 어디에 붙였는지는 CLAUDE.md '크레용 일러스트 연결' 절 참고.

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

## 딱 두 번에 끝내기 (추천)

1번은 12개를 4×3 격자 한 장에, 2번은 숲길 배경 혼자. 분할:

```
python3 scripts/slice-sheet.py sheet1.png public/illustrations bear-lantern,bird-letter,bird-perched,app-icon,rabbit,dog,cat,lantern-on,paw-rabbit,paw-dog,paw-cat,lantern-off
```

### 1. 한 장에 12개 (곰·새·아바타·도장·등불·앱 아이콘) — → 12개 파일로 자동 분할

```
[공통 스타일 문단]
(For this sheet, ignore the single-subject composition rule; follow the grid layout below.)
One landscape image (3:2) containing TWELVE separate small drawings arranged in a neat grid of 4 columns and 3 rows, evenly spaced, all the same scale, none touching or overlapping, with clear empty sage green space between them. No grid lines, no labels, no numbers.
Row 1, left to right: (1) the black moon bear walking to the right, holding up a small glowing amber lantern; (2) the white egret flying to the right with wings spread, carrying a small folded letter with a tiny green wax seal in its beak; (3) the white egret perched calmly on a short thin bare branch, facing left; (4) an app icon: a rounded square tile filled with slightly darker sage green, showing one glowing amber lantern with a soft round halo and a tiny hint of the bear's black paw holding the handle at the bottom.
Row 2, left to right: (5) the cream rabbit, (6) the honey-brown dog, (7) the grey-blue cat, each standing full body facing forward and hugging a closed deep-green picture book with both paws; (8) a small old-fashioned hanging lantern, lit, glowing warm amber with a soft round halo, the same simple lantern the bear carries.
Row 3, left to right: (9) a rabbit paw print, (10) a dog paw print, (11) a cat paw print, all three drawn as simple bold rubber-stamp silhouettes in one flat deep forest green ink (#1B5E3A) with slightly uneven waxy crayon edges; (12) the exact same hanging lantern as (8) but unlit, dark glass, no glow.
All twelve in exactly the same crayon style as the character sheet above.
```

### 2. 밤 숲길 배경 (혼자) — forest-path.png

```
[공통 스타일 문단]
(For this sheet, ignore the single-subject composition rule; follow the grid layout below.)
This image fills the whole canvas instead of a flat sage background. A wide, gentle night forest scene in the same simple crayon style: a soft winding path from the bottom toward the distance, tall rounded tree shapes on both sides, a calm deep indigo-green sky with a few crayon-dot stars, a few tiny amber lantern lights far along the path. No characters, no text. Keep the lower third quiet and simple so characters can be placed there later. Landscape 3:2.
```

## 네 번에 나눠 뽑기

14개를 하나씩 보내기 번거로울 때. A·B는 한 장에 여러 그림을 격자로 그리게 하고 `scripts/slice-sheet.py`로 낱개 투명 PNG로 잘라낸다(순서는 왼쪽→오른쪽, 위→아래). 개별 해상도가 낮아지므로 크게 쓰는 그림(오늘 탭 곰 등)은 필요하면 아래 개별 프롬프트로 다시 뽑는다. 각 프롬프트 앞에 공통 스타일 문단을 붙이되, A·B는 "(For this sheet, ignore the single-subject composition rule; follow the grid layout below.)"를 한 줄 덧붙인다.

### A. 캐릭터 시트 한 장 (6개) — → bear-lantern, bird-letter, bird-perched, rabbit, dog, cat

```
[공통 스타일 문단]
One landscape image (3:2) containing SIX separate drawings arranged in a neat grid of 3 columns and 2 rows, evenly spaced, all the same scale, none touching or overlapping, with clear empty sage green space between them. Top row, left to right: (1) the black moon bear walking to the right holding up a small glowing amber lantern, (2) the white egret flying to the right with wings spread, carrying a small folded letter with a tiny green wax seal in its beak, (3) the white egret perched calmly on a short thin bare branch, facing left. Bottom row, left to right: (4) the cream rabbit, (5) the honey-brown dog, (6) the grey-blue cat, each standing full body facing forward and hugging a closed deep-green picture book with both paws. All six in exactly the same crayon style as the character sheet above. No grid lines, no labels, no numbers.
```

### B. 도장·등불 시트 한 장 (5개) — → paw-rabbit, paw-dog, paw-cat, lantern-on, lantern-off

```
[공통 스타일 문단]
One landscape image (3:2) containing FIVE separate small drawings arranged in one row, evenly spaced, none touching, with clear empty sage green space between them. Left to right: (1) a rabbit paw print, (2) a dog paw print, (3) a cat paw print, all three drawn as simple bold rubber-stamp silhouettes in one flat deep forest green ink (#1B5E3A) with slightly uneven waxy crayon edges; (4) a small old-fashioned hanging lantern, lit, glowing warm amber with a soft round halo; (5) the exact same lantern unlit, dark glass, no glow. The lanterns are the same simple lantern the bear carries. No grid lines, no labels, no numbers.
```

### C. 밤 숲길 배경 (혼자) — forest-path.png

```
[공통 스타일 문단]
This image fills the whole canvas instead of a flat sage background. A wide, gentle night forest scene in the same simple crayon style: a soft winding path from the bottom toward the distance, tall rounded tree shapes on both sides, a calm deep indigo-green sky with a few crayon-dot stars, a few tiny amber lantern lights far along the path. No characters, no text. Keep the lower third quiet and simple so characters can be placed there later. Landscape 3:2.
```

### D. 앱 아이콘 (혼자) — app-icon.png

```
[공통 스타일 문단]
App icon design in the same simple crayon style, readable at tiny size: a single glowing amber lantern with a soft round halo on a plain sage green (#EAF0E5) rounded-square background, with a tiny hint of the black moon bear's paw holding the lantern handle at the bottom edge. No text, no border, square 1:1, fills the whole canvas.
```

잘라내기 예:

```
python3 scripts/slice-sheet.py sheetA.png public/illustrations bear-lantern,bird-letter,bird-perched,rabbit,dog,cat
python3 scripts/slice-sheet.py sheetB.png public/illustrations paw-rabbit,paw-dog,paw-cat,lantern-on,lantern-off
```

## 프롬프트 (하나씩 뽑기)

### 0. 캐릭터 시트 (스타일 고정용)

```
[공통 스타일 문단]
A character sheet showing five characters standing side by side in a row, all in the exact same drawing style and scale: (1) a friendly round black Asiatic moon bear (black fur with a small white crescent mark on its chest and a lighter muzzle) holding a small glowing amber lantern, (2) a slender white bird like a small egret, (3) a small round cream-colored rabbit, (4) a small round honey-brown dog, (5) a small round grey-blue cat. The rabbit, dog and cat are children-like and each hug a closed picture book. Tiny dot eyes, simple rounded shapes, same stroke weight for all five. Plain flat white background for this sheet only.
```

### 1. 등불 든 곰 — `bear-lantern.png`

```
[공통 스타일 문단]
Same bear as in the character sheet. Full body, standing and walking slowly toward the right as if guiding the way through a night forest, holding up a small glowing amber lantern in one paw at shoulder height. The lantern gives off a soft warm halo. Tiny dot eyes, calm and reassuring. Flat solid sage green background (#EAF0E5).
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
A single rubber-stamp style paw print of a rabbit: two elongated oval pads above and two small round toe pads, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and waxy like a crayon rubber stamp, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
```

### 8. 강아지 발자국 도장 — `paw-dog.png`

```
A single rubber-stamp style paw print of a dog: one large heart-shaped pad with four round toe pads above it, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and waxy like a crayon rubber stamp, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
```

### 9. 고양이 발자국 도장 — `paw-cat.png`

```
A single rubber-stamp style paw print of a cat: a smaller rounded pad with four small oval toe pads close together, printed in one flat deep forest green ink (#1B5E3A), edges slightly uneven and waxy like a crayon rubber stamp, simple bold silhouette, centered, flat solid sage green background (#EAF0E5) with no checkerboard, no text, no border.
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
A wide, gentle night forest scene: a soft winding path leading from the bottom toward the distance, tall rounded trees on both sides, a calm indigo-green starry sky, a few tiny amber lantern lights far along the path. No characters, no text. Leave the lower third of the image quiet and simple so characters can be placed there later. Dreamy, calm, broad crayon strokes over the whole image, very simple shapes. Landscape 3:2.
```

### 13. 앱 아이콘 — `app-icon.png` (배경 있음)

```
App icon design, flat and very simple, readable at tiny size: a single glowing amber lantern (#E8A33D) with a soft halo on a plain sage green (#EAF0E5) rounded-square background, tiny hint of the black moon bear's paw holding the lantern handle at the bottom edge, crayon texture kept subtle. No text, no border, square 1:1, fills the whole canvas.
```

## 다 만든 뒤

- 지금처럼 채팅으로 파일을 그대로 보내 주시면 됩니다(파일명은 제가 붙입니다). 배경이 단색 세이지그린인지만 확인해 주세요.
- 그러면 제가 오늘 탭 헤더의 곰, 기록 저장 순간의 "발자국 도장 쾅" 애니메이션, 책장 공유의 편지 새, 그룹 등불 진행률, 아바타 교체, 앱 아이콘까지 한 번에 연결합니다.

## 스플래시 장면 2안 — 등불 켜는 곰 + 책 읽는 동물들 + 편지 물고 오는 백로 (세로)

사용자 지정 장면: "숲속에서 곰은 등불 밝히고 있고, 다른 동물들은 미소 지으며 책 읽고 있고, 백로는 편지 물고 날아오고 있고, 하늘도 보이게". 기존 스플래시(`docs/illustrations/splash-src.jpg`)와 같은 그림체여야 하므로 **그 그림을 첨부하고** 아래 프롬프트를 보낸다. 위쪽 하늘 35%는 문구가 올라가는 자리라 비워 둬야 한다.

```
Use exactly the same illustration style, palette, brush texture and character designs as the attached picture (my previous forest scene): a textured flat children's picture-book style with soft paper grain, muted layered greens, no outlines, tiny dot eyes, simple rounded shapes.

Portrait 9:16, fills the whole canvas. A calm night forest clearing. TOP 35% of the image: open deep indigo-green night sky with a few small warm crayon-dot stars and one thin crescent moon, kept quiet and empty (text will be placed here). Tall rounded trees frame the left and right edges only.

MIDDLE and BOTTOM: on a soft mossy clearing, the black moon bear (small white crescent on its chest) stands slightly left of center, reaching up to hang and light a small old-fashioned amber lantern on a low branch; the lantern casts one soft warm round glow over the group. Under that glow, the cream rabbit, the honey-brown dog and the grey-blue cat sit close together on the ground, each holding an open deep-green picture book, faces lifted a little, with tiny gentle smiles. From the upper right, the white egret flies in toward them with wings spread, carrying a small folded letter with a tiny green wax seal in its beak. A couple of tiny distant amber lantern lights deeper in the woods, a few mushrooms and small leaves on the ground.

Mood: hushed, warm, safe, like the moment before a bedtime story. Same stroke weight and simplicity as the attached picture. No text, no watermark, no border, no frame, not glossy 3D, not vector clip-art, not kawaii.
```

- 얼굴은 기존 규칙(점 눈 + 아주 작은 입선)이라 "미소"는 `tiny gentle smiles`로만 지시. 눈웃음·볼터치를 그리면 다시 뽑는다.
- 그림이 나오면 `public/illustrations/splash.jpg`(세로 896×1200 JPEG)를 교체하면 코드 변경 없이 바로 적용된다. `components/splash-screen.tsx`의 `center 55%` 초점 위치는 하늘/동물 배치에 따라 다시 맞춘다.

## 최종 그림 보관 목록 (사용자가 "최종"으로 보내온 8장, 2026-09-08)

같은 3차 스타일로 확정된 그림들. 이미 있던 것(스플래시 2안, 밤 숲길 배경, 캐릭터 시트)은 그대로 두고 새 5장만 추가 보관했습니다. 아직 앱에 안 붙인 것은 "쓸 자리" 칸에 후보만 적어 둠.

| 파일 | 내용 | 크기 | 쓸 자리 |
|---|---|---|---|
| `splash-src.jpg` | 곰이 등불 켜고, 세 동물이 그루터기 옆에서 책 읽고, 백로가 편지 물고 날아옴 (세로) | 941×1672 | **스플래시(사용 중)** |
| `forest-camp-src.png` | 밤 숲 텐트 앞에 다섯 동물이 둘러앉아 책 읽음, 가운데 등불 (세로) | 941×1672 | 후보: 온보딩 첫 화면, 빈 책장 상태 |
| `forest-peek-src.jpg` | 밤 숲 나무 사이로 동물들이 책을 안고 고개를 내밀고, 백로는 가지에 앉음, 곰은 앞쪽에서 등불 (세로) | 941×1672 | 후보: 로그인 배너 교체, 404 |
| `forest-path-src.png` | 캐릭터 없는 밤 숲길 (가로) | 1536×1024 | 온보딩 배너(사용 중) |
| `parade-v2-src.png` | 낮 숲, 곰이 앞장서고 토끼·강아지·고양이·백로가 책 안고 따라감 — 캐릭터가 더 크고 또렷한 판 (가로) | 1536×1024 | 후보: 로딩 띠·회원가입 배너를 이걸로 교체 |
| `character-sheet.png` | 곰·백로·토끼·강아지·고양이 정면 시트 | 1536×1024 | 낱개 캐릭터 원본(사용 중) |
| `pattern-v2-src.jpg` | 세이지 종이 위 캐릭터·나무·별·등불 패턴, 곰 포함 (세로) | 1024×1536 | 후보: 배지 탭·독서 리포트 띠 교체 |
| `pattern-v3-src.png` | 같은 패턴, 연두빛 배경, 곰·토끼 없음 (세로) | 1024×1536 | 후보: 밝은 배경이 필요한 곳(빈 상태 뒤) |
