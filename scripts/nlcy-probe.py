# 임시 검사 5: 엑셀 열 구성.
import io, re, time, urllib.request, zipfile
B = "https://nlcy.go.kr/NLCY/board/C10600000000_suggestBookListExcel.do"
for code in ["01", "02", "03", "04", "05"]:
    for opt in ["2025-", "2026-"]:
        u = f"{B}?schOpt2={opt}&bcid=nlcy_normal08&schBdcode=_nlcy_normal08{code}"
        data = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read()
        z = zipfile.ZipFile(io.BytesIO(data))
        ss = [re.sub(r"<[^>]+>", "", m) for m in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode(), re.S)]
        sheet = z.read("xl/worksheets/sheet1.xml").decode()
        rows = re.findall(r"<row[^>]*>(.*?)</row>", sheet, re.S)
        print(f"\n### 08{code} {opt} rows={len(rows)}")
        for r in rows[:4] + rows[-1:]:
            cells = []
            for attrs, body in re.findall(r"<c([^>]*)>(.*?)</c>", r, re.S):
                v = re.search(r"<v>(.*?)</v>", body, re.S)
                t = re.search(r"<t[^>]*>(.*?)</t>", body, re.S)
                val = ss[int(v.group(1))] if v and 't="s"' in attrs else (v.group(1) if v else (t.group(1) if t else ""))
                ref = re.search(r'r="([A-Z]+)', attrs).group(1)
                cells.append(f"{ref}={val[:40]}")
            print("  ", " | ".join(cells))
        time.sleep(1)
