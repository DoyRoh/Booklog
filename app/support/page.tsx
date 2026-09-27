import type { Metadata } from "next";
import Link from "next/link";

// 앱스토어 "지원 URL"이 가리키는 공개 페이지. 문의 이메일과 자주 묻는
// 질문 몇 개만 두어, 심사관과 실제 사용자 모두 어디로 연락해야 하는지
// 바로 알 수 있게 한다. 인증 화면과 같이 앱 크롬(상단바·하단탭) 없이
// 단독으로 보인다(lib/nav.ts).
const SUPPORT_EMAIL = "sangwkk@naver.com";

export const metadata: Metadata = {
  title: "책숲 고객지원",
  description: "책숲 앱 문의처와 자주 묻는 질문",
};

export default function SupportPage() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-6 pb-20 pt-10">
      <h1 className="d text-xl">책숲 고객지원</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        아이의 독서를 부모·선생님·도서관이 함께 기록하는 앱, 책숲입니다.
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        <section>
          <p className="d text-sm">문의하기</p>
          <p className="mt-1">
            사용 중 불편한 점, 오류, 제안, 개인정보 관련 요청은 아래 이메일로 보내 주세요. 보통
            2~3일 안에 답변드립니다.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[책숲] 문의")}`}
            className="d mt-3 inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-white"
            style={{ background: "var(--point-deep)" }}
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section>
          <p className="d text-sm">자주 묻는 질문</p>
          <dl className="mt-2 flex flex-col gap-3">
            <div>
              <dt className="font-semibold">비밀번호를 잊었어요.</dt>
              <dd className="mt-0.5" style={{ color: "var(--ink-2)" }}>
                로그인 화면의 &ldquo;비밀번호를 잊으셨나요?&rdquo;에서 이메일을 입력하면 재설정 링크를
                보내드려요.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">책이 검색에 안 나와요.</dt>
              <dd className="mt-0.5" style={{ color: "var(--ink-2)" }}>
                책 뒷면 바코드를 찍어 보시고, 그래도 없으면(전집·독립출판 등) 제목을 직접 입력해
                기록할 수 있어요. 표지 사진도 직접 올릴 수 있습니다.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">선생님·도서관 그룹은 어떻게 만들어요?</dt>
              <dd className="mt-0.5" style={{ color: "var(--ink-2)" }}>
                프로필·설정 → 숲지기 프로필 → &ldquo;새 그룹 만들기&rdquo;에서 누구나 그룹을 만들어
                추천도서와 숙제를 올릴 수 있어요. 부모는 초대 코드나 그룹 찾기로 참가합니다.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">계정을 삭제하고 싶어요.</dt>
              <dd className="mt-0.5" style={{ color: "var(--ink-2)" }}>
                프로필·설정 화면 맨 아래 &ldquo;계정 삭제하기&rdquo;에서 직접 삭제할 수 있어요. 아이
                프로필과 독서기록, 사진·음성이 함께 지워지며 되돌릴 수 없습니다.
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <p className="d text-sm">약관과 개인정보</p>
          <p className="mt-1 flex gap-4">
            <Link href="/terms" style={{ color: "var(--point)" }}>
              이용약관
            </Link>
            <Link href="/privacy" style={{ color: "var(--point)" }}>
              개인정보처리방침
            </Link>
          </p>
        </section>
      </div>

      <Link href="/login" className="mt-8 text-sm" style={{ color: "var(--point)" }}>
        ← 책숲으로
      </Link>
    </div>
  );
}
