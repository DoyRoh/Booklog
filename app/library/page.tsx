import Link from "next/link";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">책장</h1>
        <Link
          href="/library/add"
          className="d rounded-[14px] px-4 py-2 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 책 등록
        </Link>
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        읽은 책이 책장 형태로 정리됩니다.
      </p>
    </div>
  );
}
