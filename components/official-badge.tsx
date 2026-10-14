// 책숲이 직접 고른 공식 그룹(groups.verified) 표시 -- 개인 숲지기와 구분된다.
export default function OfficialBadge() {
  return (
    <span
      className="d ml-1.5 inline-block rounded-full px-2 py-[1px] align-middle text-[10px]"
      style={{ background: "var(--point-deep)", color: "#fff" }}
    >
      책숲 공식
    </span>
  );
}
