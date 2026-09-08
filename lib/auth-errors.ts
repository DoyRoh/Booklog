// Supabase Auth가 돌려주는 에러 메시지는 전부 영어라, 처음 앱을 쓰는
// 학부모 입장에서는 뭐가 잘못됐는지 알기 어렵다. 자주 나오는 메시지만
// 한국어로 옮기고, 모르는 메시지는 원문을 그대로 보여준다(숨기는 것보다
// 낫다는 판단).
const KNOWN_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않아요."],
  [/email not confirmed/i, "이메일 인증이 아직 안 됐어요. 메일함을 확인해 주세요."],
  [/user already registered/i, "이미 가입된 이메일이에요. 로그인해 주세요."],
  [/password should be at least/i, "비밀번호는 6자 이상이어야 해요."],
  [/unable to validate email address/i, "이메일 형식이 올바르지 않아요."],
  [/rate limit/i, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."],
  [/for security purposes/i, "잠시 후 다시 시도해 주세요."],
  [/new password should be different/i, "이전과 다른 비밀번호를 입력해 주세요."],
  [/auth session missing/i, "로그인이 만료됐어요. 다시 로그인해 주세요."],
];

export function translateAuthError(message: string): string {
  const match = KNOWN_MESSAGES.find(([pattern]) => pattern.test(message));
  return match ? match[1] : message;
}
