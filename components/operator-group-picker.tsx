import Link from "next/link";

/** 숲지기가 그룹을 여러 개 운영할 때, 어느 그룹에 할 일인지 먼저 고르는 목록. */
export default function OperatorGroupPicker({
  groups,
  basePath,
  verb,
}: {
  groups: { id: string; name: string }[];
  basePath: string;
  verb: string;
}) {
  return (
    <div className="flex flex-col">
      {groups.map((group, index) => (
        <Link
          key={group.id}
          href={`${basePath}?group=${group.id}`}
          className="flex items-center justify-between px-[24px] py-[14px] text-sm"
          style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
        >
          <span className="d">{group.name}</span>
          <span className="text-xs" style={{ color: "var(--point-deep)" }}>
            {verb} ›
          </span>
        </Link>
      ))}
    </div>
  );
}
