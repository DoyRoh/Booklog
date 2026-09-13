import { kstMonth, kstWeekStart } from "@/lib/kst";

export type BadgeRecord = {
  status: "want" | "reading" | "done";
  read_date: string;
  book_id: string;
  photo_url: string | null;
  voice_url: string | null;
  favorite?: boolean;
  author?: string | null;
};

/** 독서기록만으로는 알 수 없는 것들 -- 배지 페이지가 따로 조회해서 넘긴다. */
export type BadgeExtras = {
  /** 아이가 속한(승인된) 그룹 수 = 따르는 숲지기 수 */
  groupCount: number;
  /** 속한 그룹들의 추천도서 중 다 읽은 책 수(고유 책 기준) */
  recommendedRead: number;
  /** 책을 전부 끝낸 숙제 수 */
  assignmentsDone: number;
};

export type BadgeSection = "forest" | "lantern" | "revisit" | "keeper" | "collect";

export type Badge = {
  id: string;
  section: BadgeSection;
  label: string;
  description: string;
  achieved: boolean;
  /** 권수 마일스톤이면 그 권수(배지 그림 단계를 정할 때 씀) */
  count?: number;
};

export const BADGE_SECTIONS: { key: BadgeSection; title: string; hint: string }[] = [
  { key: "forest", title: "숲이 자라요", hint: "다 읽은 책 한 권이 나무 한 그루" },
  { key: "lantern", title: "등불을 밝혀요", hint: "매일 이어서 읽으면 밤길이 환해져요" },
  { key: "revisit", title: "다시 찾은 나무", hint: "좋아하는 책은 몇 번이고" },
  { key: "keeper", title: "숲지기와 함께", hint: "선생님·기관이 비춰 준 길을 따라" },
  { key: "collect", title: "숲의 기록", hint: "사진·목소리·이야기꾼" },
];

// 권수 마일스톤: 1, 5, 10~200은 10권 단위, 그 뒤 1000까지는 50권 단위.
// 이름은 숲이 커져 가는 순서 -- 씨앗 → 새싹 → 작은 숲 → … → 천 그루 숲.
const MILESTONE_NAMES: Record<number, string> = {
  1: "씨앗 하나",
  5: "새싹 다섯",
  10: "작은 숲",
  20: "오솔길",
  30: "숲길",
  40: "나무 그늘",
  50: "다람쥐 숲",
  60: "새들의 숲",
  70: "등불 숲",
  80: "별빛 숲",
  90: "안개 숲",
  100: "백 그루 숲",
  110: "옹달샘",
  120: "나무다리",
  130: "숲속 오두막",
  140: "반딧불이 언덕",
  150: "도토리 창고",
  160: "이끼 바위",
  170: "버섯 마을",
  180: "개울가",
  190: "산딸기 덤불",
  200: "이백 그루 숲",
  250: "숲의 노래",
  300: "큰 나무",
  350: "부엉이 숲",
  400: "사슴 숲",
  450: "여우 언덕",
  500: "오백 그루 숲",
  550: "폭포 숲",
  600: "곰의 숲",
  650: "백로 호수",
  700: "별똥별 숲",
  750: "무지개 숲",
  800: "팔백 그루 숲",
  850: "달빛 숲",
  900: "구름 숲",
  950: "새벽 숲",
  1000: "천 그루 숲",
};

export const MILESTONE_COUNTS: number[] = [
  1,
  5,
  ...Array.from({ length: 20 }, (_, i) => (i + 1) * 10),
  ...Array.from({ length: 16 }, (_, i) => 250 + i * 50),
];

function dayStreak(dates: string[]) {
  const uniq = Array.from(new Set(dates)).sort();
  let run = 0;
  let best = 0;
  let prev: number | null = null;
  for (const d of uniq) {
    const t = new Date(`${d}T00:00:00`).getTime();
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

// 아이 간 비교가 아니라 그 아이 스스로의 기록에 대한 성취만 보여준다.
export function computeBadges(records: BadgeRecord[], extras?: Partial<BadgeExtras>): Badge[] {
  const done = records.filter((r) => r.status === "done");
  const total = done.length;
  const bestStreak = dayStreak(done.map((r) => r.read_date));

  const bookCounts = new Map<string, number>();
  for (const r of done) bookCounts.set(r.book_id, (bookCounts.get(r.book_id) ?? 0) + 1);
  const rereads = Array.from(bookCounts.values()).filter((c) => c > 1).length;
  const maxSameBook = Math.max(0, ...bookCounts.values());

  const photos = done.filter((r) => r.photo_url).length;
  const voices = done.filter((r) => r.voice_url).length;
  const favorites = new Set(records.filter((r) => r.favorite).map((r) => r.book_id)).size;
  const authors = new Set(done.map((r) => (r.author ?? "").trim()).filter(Boolean)).size;

  const weekKey = kstWeekStart();
  const week = done.filter((r) => r.read_date >= weekKey).length;

  const perMonth = new Map<string, number>();
  for (const r of done) {
    const k = r.read_date.slice(0, 7);
    perMonth.set(k, (perMonth.get(k) ?? 0) + 1);
  }
  const bestMonth = Math.max(0, ...perMonth.values());
  // 최근 3개월 연속으로 한 권 이상 읽었는지
  const monthsInRow = (() => {
    for (let i = 0; i < 3; i++) {
      if (!perMonth.get(kstMonth(i))) return i;
    }
    return 3;
  })();

  const { groupCount = 0, recommendedRead = 0, assignmentsDone = 0 } = extras ?? {};

  const forest: Badge[] = MILESTONE_COUNTS.map((count) => ({
    id: `m${count}`,
    section: "forest",
    label: MILESTONE_NAMES[count] ?? `${count}그루`,
    description: `나무 ${count}그루`,
    achieved: total >= count,
    count,
  }));

  const lantern: Badge[] = [
    { id: "d2", section: "lantern", label: "등불 켜기", description: "이틀 연속 기록", achieved: bestStreak >= 2 },
    { id: "d3", section: "lantern", label: "등불 셋", description: "사흘 연속 기록", achieved: bestStreak >= 3 },
    { id: "week", section: "lantern", label: "밤길 지킴이", description: "일주일 연속 기록", achieved: bestStreak >= 7 },
    { id: "d14", section: "lantern", label: "보름달 지킴이", description: "2주 연속 기록", achieved: bestStreak >= 14 },
    { id: "d30", section: "lantern", label: "한 달 등불", description: "30일 연속 기록", achieved: bestStreak >= 30 },
    { id: "week10", section: "lantern", label: "바람 부는 숲", description: "한 주에 10권", achieved: week >= 10 },
    { id: "month20", section: "lantern", label: "풍성한 달", description: "한 달에 20권", achieved: bestMonth >= 20 },
    { id: "months3", section: "lantern", label: "계절을 건너", description: "3달 연속 기록", achieved: monthsInRow >= 3 },
  ];

  const revisit: Badge[] = [
    { id: "again", section: "revisit", label: "다시 찾은 나무", description: "같은 책 2번", achieved: rereads >= 1 },
    { id: "again3", section: "revisit", label: "아끼는 나무들", description: "다시 읽은 책 3권", achieved: rereads >= 3 },
    { id: "same5", section: "revisit", label: "단골 나무", description: "한 책을 5번", achieved: maxSameBook >= 5 },
    { id: "fav1", section: "revisit", label: "보물 나무", description: "가장 좋아하는 책 1권", achieved: favorites >= 1 },
    { id: "fav5", section: "revisit", label: "보물 다섯", description: "가장 좋아하는 책 5권", achieved: favorites >= 5 },
  ];

  const keeper: Badge[] = [
    { id: "group1", section: "keeper", label: "첫 숲지기", description: "그룹 1곳 함께", achieved: groupCount >= 1 },
    { id: "group3", section: "keeper", label: "숲지기 셋", description: "그룹 3곳 함께", achieved: groupCount >= 3 },
    { id: "rec10", section: "keeper", label: "등불 따라 열 걸음", description: "추천도서 10권", achieved: recommendedRead >= 10 },
    { id: "rec30", section: "keeper", label: "등불 따라 서른 걸음", description: "추천도서 30권", achieved: recommendedRead >= 30 },
    { id: "rec100", section: "keeper", label: "등불 따라 백 걸음", description: "추천도서 100권", achieved: recommendedRead >= 100 },
    { id: "hw1", section: "keeper", label: "첫 숙제 완료", description: "숙제 1개 끝", achieved: assignmentsDone >= 1 },
    { id: "hw5", section: "keeper", label: "숙제 다섯", description: "숙제 5개 끝", achieved: assignmentsDone >= 5 },
    { id: "hw20", section: "keeper", label: "숙제 스무 개", description: "숙제 20개 끝", achieved: assignmentsDone >= 20 },
  ];

  const collect: Badge[] = [
    { id: "photo10", section: "collect", label: "장면 수집가", description: "사진 10장", achieved: photos >= 10 },
    { id: "photo30", section: "collect", label: "장면 앨범", description: "사진 30장", achieved: photos >= 30 },
    { id: "voice5", section: "collect", label: "숲의 목소리", description: "녹음 5개", achieved: voices >= 5 },
    { id: "voice20", section: "collect", label: "숲의 합창", description: "녹음 20개", achieved: voices >= 20 },
    { id: "author10", section: "collect", label: "이야기꾼 열 명", description: "작가 10명", achieved: authors >= 10 },
    { id: "author30", section: "collect", label: "이야기꾼 서른 명", description: "작가 30명", achieved: authors >= 30 },
  ];

  return [...forest, ...lantern, ...revisit, ...keeper, ...collect];
}
