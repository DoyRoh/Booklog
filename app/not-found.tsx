import Link from "next/link";
import SceneBanner from "@/components/scene-banner";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-10">
      <SceneBanner scene="parade" height={170} />
      <p className="hand mt-6 text-xl" style={{ color: "var(--point-deep)" }}>
        숲길을 잘못 들었나 봐요.
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        찾는 페이지가 없어요. 주소가 바뀌었거나 잘못 입력됐을 수 있어요.
      </p>
      <Link
        href="/today"
        className="d mt-6 inline-block rounded-[14px] px-4 py-3 text-center text-sm text-white"
        style={{ background: "var(--point)" }}
      >
        오늘 화면으로 가기
      </Link>
    </div>
  );
}
