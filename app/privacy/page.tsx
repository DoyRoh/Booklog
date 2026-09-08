import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-6 pb-20 pt-10">
      <h1 className="d text-xl">개인정보처리방침</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        시행일: 2026년 9월 8일
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        <section>
          <p className="d text-sm">1. 수집하는 개인정보 항목</p>
          <ul className="mt-1 list-disc pl-5">
            <li>계정: 이메일, 비밀번호(암호화 저장)</li>
            <li>아이 프로필: 이름, 생년월일(선택), 아바타</li>
            <li>독서기록: 읽은 책, 평점·기분·메모, 사진, 음성(동의 시)</li>
            <li>그룹 활동: 소속 그룹, 숙제 완료 현황</li>
          </ul>
        </section>

        <section>
          <p className="d text-sm">2. 개인정보의 수집·이용 목적</p>
          <p className="mt-1">
            아이의 독서 활동을 기록·보관하고, 보호자가 지정한 교사·기관과 필요한 범위 내에서만
            공유하기 위해 사용합니다. 광고·마케팅 목적으로는 사용하지 않습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">3. 음성 기록에 대한 별도 동의</p>
          <p className="mt-1">
            아이의 목소리가 담긴 음성 기록은 선택 동의 항목입니다. 동의하지 않으면 음성 녹음 기능
            자체가 화면에 나타나지 않으며, 언제든지 온보딩 설정을 다시 진행해 동의를 철회할 수
            있습니다. 사진·음성 파일은 비공개로 저장되며, 화면에 표시할 때마다 짧은 시간만
            유효한 서명된 링크로만 접근할 수 있습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">4. 개인정보의 제3자 제공</p>
          <p className="mt-1">
            서비스는 이용자의 개인정보를 외부에 판매하거나 광고 목적으로 제공하지 않습니다. 교사·
            기관 프로필은 보호자가 직접 가입을 승인하거나 그룹을 팔로우한 경우에 한해, 아이가
            무엇을 읽었는지(제목·완료 여부)만 확인할 수 있습니다 — 사진·음성·부모 메모는 교사·
            기관에게 노출되지 않습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">5. 개인정보의 보관 및 파기</p>
          <p className="mt-1">
            계정 삭제를 요청하면 해당 계정과 아이 프로필, 독서기록, 사진·음성 파일을 지체 없이
            삭제합니다. 다른 보호자와 공동으로 등록된 아이 프로필은 모든 보호자가 삭제될 때까지
            유지됩니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">6. 이용자의 권리</p>
          <p className="mt-1">
            이용자는 언제든지 자신과 아이 프로필의 개인정보 열람·수정·삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">7. 문의</p>
          <p className="mt-1">개인정보 관련 문의는 서비스 운영자에게 연락해 주세요.</p>
        </section>
      </div>

      <Link href="/onboarding" className="mt-8 text-sm" style={{ color: "var(--point)" }}>
        ← 돌아가기
      </Link>
    </div>
  );
}
