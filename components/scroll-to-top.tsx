"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 대시보드에서 스크롤을 내린 채로 "아이" 스탯처럼 다른 탭으로 이동하면,
 * 새 화면이 짧아도 이전 스크롤 위치가 그대로 남아 화면 중간(때로는
 * 목록 맨 끝)에서 시작된 것처럼 보였다("아이들 메뉴로 이동하면 상단바와
 * 아이 목록 겹쳐보이는데"). 이 화면들은 서버에서 데이터를 불러오는 동안
 * `loading.tsx`로 잠깐 대체되는 라우트라, Next.js가 화면 전환 시 자동으로
 * 맨 위로 스크롤해 주는 동작이 이 스트리밍 타이밍과 어긋나 스크롤이
 * 안 돌아오는 경우가 있다. 라우트(경로)가 실제로 바뀔 때만(같은 탭에서
 * 그룹만 바꾸는 `?group=` 전환은 pathname이 안 바뀌어 영향 없음) 맨 위로
 * 확실히 돌려놓는다.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
