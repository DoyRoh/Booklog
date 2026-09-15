// 그룹 초대 코드, 아이 공유 코드가 공통으로 쓰는 형식 -- 헷갈리기 쉬운
// 글자(0/O, 1/I 등)를 뺀 32자 알파벳/숫자 6자리.
export function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
