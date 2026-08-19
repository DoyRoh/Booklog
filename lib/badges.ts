export type BadgeRecord = {
  status: "want" | "reading" | "done";
  read_date: string;
  book_id: string;
  photo_url: string | null;
  voice_url: string | null;
};

export type Badge = {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
};

// 레거시 앱(유안이 독서기록)의 배지 시스템 중, 책숲 데이터 모델(HABA 100·분야
// 없음)만으로 계산 가능한 것들만 옮겼다. 아이 간 비교가 아니라 그 아이
// 스스로의 기록에 대한 성취만 보여준다.
export function computeBadges(records: BadgeRecord[]): Badge[] {
  const done = records.filter((r) => r.status === "done");
  const total = done.length;

  const uniqDates = Array.from(new Set(done.map((r) => r.read_date))).sort();
  let run = 0;
  let bestStreak = 0;
  let prevTime: number | null = null;
  for (const d of uniqDates) {
    const t = new Date(`${d}T00:00:00`).getTime();
    run = prevTime !== null && t - prevTime === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prevTime = t;
  }

  const bookCounts = new Map<string, number>();
  for (const r of done) {
    bookCounts.set(r.book_id, (bookCounts.get(r.book_id) ?? 0) + 1);
  }
  const rereads = Array.from(bookCounts.values()).filter((count) => count > 1).length;

  const photos = done.filter((r) => r.photo_url).length;
  const voices = done.filter((r) => r.voice_url).length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekKey = weekStart.toISOString().slice(0, 10);
  const week = done.filter((r) => r.read_date >= weekKey).length;

  const milestones: { id: string; label: string; count: number }[] = [
    { id: "m1", label: "첫걸음", count: 1 },
    { id: "m3", label: "세 권째", count: 3 },
    { id: "m5", label: "다섯 권", count: 5 },
    { id: "m10", label: "탐험차 출발", count: 10 },
    { id: "m20", label: "스무 권", count: 20 },
    { id: "m30", label: "독서 탐험가", count: 30 },
    { id: "m50", label: "대형 탐험차", count: 50 },
    { id: "m100", label: "독서 탐험선", count: 100 },
  ];

  return [
    ...milestones.map((m) => ({
      id: m.id,
      label: m.label,
      description: `${m.count}권 기록`,
      achieved: total >= m.count,
    })),
    { id: "week10", label: "이번 주 10권", description: "한 주 10권", achieved: week >= 10 },
    { id: "d2", label: "이틀 연속", description: "2일 연속 기록", achieved: bestStreak >= 2 },
    { id: "d3", label: "사흘 연속", description: "3일 연속 기록", achieved: bestStreak >= 3 },
    { id: "week", label: "일주일 연속", description: "7일 연속 기록", achieved: bestStreak >= 7 },
    { id: "again", label: "또 읽었어", description: "같은 책 2번", achieved: rereads >= 1 },
    { id: "again3", label: "아끼는 책", description: "다시 읽기 3권", achieved: rereads >= 3 },
    { id: "photo10", label: "표지 수집가", description: "사진 10장", achieved: photos >= 10 },
    { id: "voice5", label: "목소리 기록", description: "녹음 5개", achieved: voices >= 5 },
  ];
}
