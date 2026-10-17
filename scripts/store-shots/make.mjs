// 앱스토어 미리보기 이미지 만들기 -- 앱 화면 캡처를 둥근 카드로 가운데 놓고
// 위에 큰 제목 + 작은 설명을 얹는다(밀리의 서재 스토어 이미지 방식).
//
//   node scripts/store-shots/make.mjs ipad
//   node scripts/store-shots/make.mjs iphone
//
// 입력: docs/store-screenshots/src/<기기>/*.{webp,png,jpg} (파일 이름 순서 = 스토어 순서)
// 출력: docs/store-screenshots/<기기>/NN.png (앱스토어 규격 크기)
// 문구는 아래 SLIDES에서 고친다(파일 이름 앞부분으로 찾음).
import { createRequire } from "node:module";
// playwright는 이 저장소 의존성이 아니라 전역 설치를 쓴다(NODE_PATH로 찾음).
const { chromium } = createRequire(import.meta.url)("playwright");
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const DEVICES = {
  // 13형 iPad (App Store Connect 필수 크기)
  ipad: { width: 2064, height: 2752, shotWidth: 0.74, radius: 56, frame: 22, title: 136, sub: 64, top: 230 },
  // 6.9형 iPhone
  iphone: { width: 1320, height: 2868, shotWidth: 0.78, radius: 90, frame: 18, title: 100, sub: 48, top: 230 },
};

// 파일 이름이 이 키로 시작하면 그 문구를 쓴다.
const SLIDES = {
  today: { title: "오늘도 책숲을 걸어요", sub: "읽은 책이 쌓이면 우리 아이만의 숲이 자라요", art: "bear-lantern.png" },
  library: { title: "우리 아이 책장, 한눈에", sub: "읽은 책, 읽고 싶은 책을 나무 선반에 꽂아요", art: "tree-bushy.png" },
  record: { title: "책 한 권, 30초면 기록 끝", sub: "별점과 기분 스티커로 아이와 함께 남겨요", art: "star-rating.png" },
  homework: { title: "선생님 숙제도 한곳에서", sub: "마감일과 읽을 책을 한눈에, 다 읽으면 숙제 완료", art: "lantern-on.png" },
  // blur: 캡처에서 가릴 곳(이메일 등) -- 캡처 폭·높이에 대한 비율 [x, y, w, h]
  profile: { title: "아이도, 숲지기도 한 계정으로", sub: "아이가 여럿이어도, 선생님 프로필도 손쉽게 바꿔요", art: "rabbit.png", blur: [[0.165, 0.128, 0.17, 0.03]] },
  forest: { title: "읽을수록 숲이 자라요", sub: "배지를 모으면 나무와 별, 등불이 우리 숲에 심겨요", art: "tree-pine.png" },
  group: { title: "선생님·도서관이 골라 준 책", sub: "숲지기의 추천도서를 둘러보고 팔로우해요", art: "bird-letter.png" },
  library2: { title: "근처 도서관에 있을까?", sub: "자주 가는 도서관의 대출 가능 여부를 바로 봐요", art: "tent.png" },
};

const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const dataUrl = (path) => `data:${MIME[extname(path).toLowerCase()] ?? "image/png"};base64,${readFileSync(path).toString("base64")}`;

function html(d, slide, shot) {
  const art = slide.art ? dataUrl(join(ROOT, "public/illustrations", slide.art)) : null;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap">
<style>
  html,body{margin:0;width:${d.width}px;height:${d.height}px;overflow:hidden}
  body{position:relative;background:#1B5E3A;font-family:"Gowun Dodum",sans-serif;color:#fff}
  .head{position:absolute;left:0;right:0;top:${d.top}px;text-align:center}
  h1{margin:0;font-size:${d.title}px;line-height:1.22;font-weight:400;letter-spacing:-0.02em;-webkit-text-stroke:${Math.round(d.title / 42)}px #fff;word-break:keep-all}
  p{margin:${Math.round(d.sub * 0.7)}px auto 0;max-width:86%;font-size:${d.sub}px;line-height:1.45;color:rgba(255,255,255,.82);word-break:keep-all}
  .art{position:absolute;max-height:${Math.round(d.title * 1.6)}px;max-width:${Math.round(d.title * 1.5)}px;z-index:2}
  .card{position:absolute;left:50%;transform:translateX(-50%);bottom:${Math.round(d.height * 0.045)}px;width:${Math.round(d.width * d.shotWidth)}px;
    padding:${d.frame}px;background:#fff;border-radius:${d.radius + d.frame}px;box-shadow:0 30px 80px rgba(0,0,0,.30),0 6px 18px rgba(0,0,0,.18)}
  .shot{position:relative}
  .blur{position:absolute;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);background:rgba(255,255,255,.55);border-radius:12px}
  .card img{display:block;width:100%;border-radius:${d.radius}px}
</style></head><body>
  ${art ? `<img class="art" src="${art}">` : ""}
  <div class="head"><h1>${slide.title}</h1><p>${slide.sub}</p></div>
  <div class="card"><div class="shot"><img src="${dataUrl(shot)}">${(slide.blur ?? []).map(([x, y, w, h]) => `<div class="blur" style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%"></div>`).join("")}</div></div>
</body></html>`;
}

const device = process.argv[2] ?? "ipad";
const d = DEVICES[device];
if (!d) throw new Error(`기기는 ${Object.keys(DEVICES).join(" / ")} 중 하나`);
const srcDir = join(ROOT, "docs/store-screenshots/src", device);
const outDir = join(ROOT, "docs/store-screenshots", device);
mkdirSync(outDir, { recursive: true });
const files = readdirSync(srcDir).filter((f) => MIME[extname(f).toLowerCase()]).sort();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: d.width, height: d.height } });
for (const [i, f] of files.entries()) {
  const key = basename(f, extname(f)).replace(/^\d+-/, "");
  const slide = SLIDES[key];
  if (!slide) throw new Error(`${f}: SLIDES에 "${key}" 문구가 없어요`);
  await page.setContent(html(d, slide, join(srcDir, f)), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // 화면 아래가 잘리지 않게, 카드가 제목과 겹치면 카드를 줄인다.
  await page.evaluate(() => {
    const head = document.querySelector(".head").getBoundingClientRect();
    const card = document.querySelector(".card");
    const artH = document.querySelector(".art")?.getBoundingClientRect().height ?? 0;
    // 캐릭터가 설명과 카드 사이에 들어갈 자리를 남긴다.
    const room = window.innerHeight * 0.955 - head.bottom - Math.max(90, artH * 0.75 + 30);
    const r = card.getBoundingClientRect();
    if (r.height > room) card.style.width = `${(r.width * room) / r.height}px`;
    // 캐릭터는 카드 오른쪽 위 모서리에 걸터앉게(긴 제목과 겹치지 않도록).
    const art = document.querySelector(".art");
    if (art) {
      const c = card.getBoundingClientRect();
      const a = art.getBoundingClientRect();
      art.style.left = `${Math.min(c.right - a.width * 0.85, window.innerWidth - a.width - 20)}px`;
      // 설명 글자와 겹치지 않게 머리글 아래에서 시작.
      art.style.top = `${Math.max(c.top - a.height * 0.78, head.bottom + 16)}px`;
    }
  });
  const out = join(outDir, `${String(i + 1).padStart(2, "0")}-${key}.png`);
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
