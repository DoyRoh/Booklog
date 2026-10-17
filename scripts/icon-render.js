// 앱 아이콘 글자 얹기: bg-nomoon.png(scripts/icon-bg.py 결과) 옆에서 실행.
// NODE_PATH=$(npm root -g) node scripts/icon-render.js
const { chromium } = require("playwright");
const fs = require("fs");
const bg = "data:image/png;base64," + fs.readFileSync("bg-nomoon.png").toString("base64");
// [파일, 크기, 배경 포함?, 글자 폭 비율, 획 굵기(1024 기준)]
const jobs = [
  ["icon-only.png", 1024, true, 0.70, 7],
  ["icon-foreground.png", 1024, false, 0.52, 6],
  ["icon-maskable-512.png", 512, true, 0.60, 7],
  ["icon-background.png", 1024, true, 0, 0],
];
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage();
  for (const [out, size, withBg, ratio, stroke] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    const s = size / 1024;
    await p.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400&display=block">
<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${withBg ? `url(${bg}) center/cover` : "transparent"}}
#t{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);white-space:nowrap;font-family:"Gowun Batang";font-weight:400;
color:#F6EEDC;-webkit-text-stroke:${stroke * s}px #F6EEDC;line-height:1;font-size:100px;letter-spacing:0.02em}</style></head>
<body>${ratio ? '<div id="t">책숲</div>' : ""}</body></html>`, { waitUntil: "networkidle" });
    await p.evaluate(async (target) => {
      await document.fonts.ready;
      const t = document.getElementById("t");
      if (!t) return;
      const w = t.getBoundingClientRect().width;
      t.style.fontSize = `${(100 * target) / w}px`;
    }, ratio * size);
    await p.screenshot({ path: out, omitBackground: !withBg });
    console.log(out);
  }
  await b.close();
})();
