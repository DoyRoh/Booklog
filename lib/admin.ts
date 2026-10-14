// 책숲 운영자 계정 -- 공식 숲지기 책 표지 채우기 같은 운영 도구만 이 계정에 보인다.
export const ADMIN_EMAILS = ["byul890808@gmail.com"];

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email) && ADMIN_EMAILS.includes(email!.trim().toLowerCase());
}
