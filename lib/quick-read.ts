import type { SupabaseClient } from "@supabase/supabase-js";

// 목록 줄의 체크 토글 -- 기록 화면을 거치지 않고 "읽었어요"만 바로 표시한다.
// 켜기: 이 아이의 이 책 기록이 있으면 전부 done(오늘 날짜)으로, 없으면
//       group_id 붙여 done 기록 하나를 새로 만든다(숲지기 화면에 잡히게).
// 끄기: done 기록을 want로 되돌린다 -- 지우지 않아서 평점·메모·사진은 남고,
//       다시 켜면 그대로 돌아온다.
export async function setRead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string,
  bookId: string,
  groupId: string | null,
  done: boolean
) {
  const today = new Date().toISOString().slice(0, 10);
  if (done) {
    const { data: existing } = await supabase
      .from("reading_records")
      .select("id")
      .eq("child_id", childId)
      .eq("book_id", bookId)
      .limit(1);
    if (existing && existing.length > 0) {
      await supabase
        .from("reading_records")
        .update({ status: "done", read_date: today })
        .eq("child_id", childId)
        .eq("book_id", bookId)
        .neq("status", "done");
    } else {
      await supabase
        .from("reading_records")
        .insert({ child_id: childId, book_id: bookId, group_id: groupId, status: "done", read_date: today });
    }
  } else {
    await supabase
      .from("reading_records")
      .update({ status: "want" })
      .eq("child_id", childId)
      .eq("book_id", bookId)
      .eq("status", "done");
  }
}

/** 책갈피 토글 -- 켜기: want 기록 하나 추가(책장에 꽂기). 끄기: want 기록만 지운다(읽은 기록은 안 건드림). */
export async function setShelved(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string,
  bookId: string,
  groupId: string | null,
  shelved: boolean
) {
  if (shelved) {
    await supabase.from("reading_records").insert({ child_id: childId, book_id: bookId, group_id: groupId, status: "want" });
  } else {
    await supabase.from("reading_records").delete().eq("child_id", childId).eq("book_id", bookId).eq("status", "want");
  }
}
