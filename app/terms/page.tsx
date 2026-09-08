import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col px-6 pb-20 pt-10">
      <h1 className="d text-xl">이용약관</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        시행일: 2026년 9월 8일
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        <section>
          <p className="d text-sm">제1조 (목적)</p>
          <p className="mt-1">
            이 약관은 책숲(이하 &ldquo;서비스&rdquo;)을 이용함에 있어 서비스와 이용자의 권리·의무 및
            책임사항을 정합니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제2조 (서비스의 내용)</p>
          <p className="mt-1">
            서비스는 아이의 독서 활동을 부모·교사·기관이 함께 기록하고 추천도서를 공유할 수 있는
            독서 기록 플랫폼입니다. 서비스는 광고, 결제, SNS·댓글·채팅 등의 기능을 제공하지
            않습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제3조 (계정 및 프로필)</p>
          <p className="mt-1">
            이용자는 하나의 계정 아래 아이 프로필, 선생님·기관 프로필을 함께 등록할 수 있습니다.
            계정 정보(이메일·비밀번호)는 이용자 본인이 관리할 책임이 있으며, 타인에게 계정을
            공유하거나 대여할 수 없습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제4조 (이용자의 의무)</p>
          <p className="mt-1">
            이용자는 아이의 독서기록·사진·음성 등 콘텐츠를 등록할 때 타인의 권리를 침해하지 않아야
            하며, 서비스를 본래 목적(독서 기록·추천) 이외의 용도로 사용해서는 안 됩니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제5조 (콘텐츠의 소유)</p>
          <p className="mt-1">
            이용자가 등록한 독서기록·사진·음성·메모의 저작권은 이용자에게 있습니다. 서비스는 이를
            제3자에게 판매하거나 광고 목적으로 사용하지 않습니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제6조 (서비스 변경 및 중단)</p>
          <p className="mt-1">
            서비스는 운영상·기술상 필요에 따라 제공하는 기능의 전부 또는 일부를 변경하거나 중단할
            수 있으며, 중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>

        <section>
          <p className="d text-sm">제7조 (계정 삭제)</p>
          <p className="mt-1">
            이용자는 언제든지 서비스 운영자에게 요청하여 계정과 그에 연결된 아이 프로필·독서기록을
            삭제할 수 있습니다.
          </p>
        </section>
      </div>

      <Link href="/onboarding" className="mt-8 text-sm" style={{ color: "var(--point)" }}>
        ← 돌아가기
      </Link>
    </div>
  );
}
