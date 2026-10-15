import Link from "next/link";
import { PrinterIcon } from "@/components/icons/misc-icons";

/** 페이지 제목 오른쪽의 작은 "인쇄" 링크 -- 강조 버튼이 아니라 보조 동작이라
 * 회색 글자 + 프린터 아이콘으로만(사용자 지적: 컨트롤 줄의 내보내기 버튼이 엉성해 보임). */
export default function PrintExportLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex flex-none items-center gap-1 text-xs" style={{ color: "var(--ink-2)" }}>
      <PrinterIcon width={15} height={15} />
      인쇄·내보내기
    </Link>
  );
}
