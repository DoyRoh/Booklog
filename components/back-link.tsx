"use client";

import { useRouter } from "next/navigation";

// 약관·처리방침 페이지의 "돌아가기". 앱 안에서 이 페이지로 왔으면(고객지원
// 화면 등) 직전 화면으로 되돌아가고, 링크로 바로 열었으면 첫 화면으로 간다.
// 예전엔 항상 /onboarding으로 보내서, 새 창에서 열면 입력이 초기화됐다.
export default function BackLink() {
  const router = useRouter();
  function goBack() {
    const fromHere =
      typeof document !== "undefined" &&
      document.referrer.startsWith(window.location.origin) &&
      window.history.length > 1;
    if (fromHere) router.back();
    else router.replace("/login");
  }
  return (
    <button
      type="button"
      onClick={goBack}
      className="mt-8 self-start text-sm"
      style={{ color: "var(--point)" }}
    >
      ← 돌아가기
    </button>
  );
}
