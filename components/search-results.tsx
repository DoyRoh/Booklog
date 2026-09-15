import Link from "next/link";
import type { SearchResult } from "@/lib/search";
import { shortDate } from "@/components/log-row";

const LABEL_COLOR: Record<string, string> = {
  숙제: "var(--point-deep)",
  "숙제 설명": "var(--ink-2)",
  질문: "#3A6EA5",
  "숙제 책": "var(--point-deep)",
  추천도서: "var(--lantern)",
  "추천 설명": "var(--lantern)",
  그룹: "var(--ink-2)",
};

/** 검색 결과 한 줄 -- 표지·제목·그룹명·날짜·종류 배지·스니펫, 누르면
 * 원래 위치(앵커 포함)로 바로 이동. app/search와 미리보기가 공유한다. */
export default function SearchResults({ results }: { results: SearchResult[] }) {
  return (
    <div
      className="divide-y overflow-hidden rounded-[var(--r)] border"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      {results.map((r) => (
        <Link key={r.id} href={r.href} className="flex items-start gap-3 px-4 py-3">
          {r.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.coverUrl} alt="" className="h-14 w-10 flex-none rounded object-cover" style={{ border: "1px solid var(--rule)" }} />
          ) : (
            <span
              className="flex h-14 w-10 flex-none items-center justify-center rounded text-[10px]"
              style={{ background: "var(--paper)", color: "var(--ink-2)" }}
            >
              {r.kind === "group" ? "그룹" : "책"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="d rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ background: LABEL_COLOR[r.label] ?? "var(--ink-2)" }}
              >
                {r.label}
              </span>
              <span className="truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                {r.groupName}
                {r.date ? ` · ${shortDate(r.date)}` : ""}
              </span>
            </div>
            <p className="d mt-0.5 truncate text-sm">{r.title}</p>
            {r.snippet && r.snippet !== r.title && (
              <p
                className="mt-0.5 text-xs"
                style={{
                  color: "var(--ink-2)",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.snippet}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
