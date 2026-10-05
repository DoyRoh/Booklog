/** 숲지기 이름이 이미 쓰이고 있을 때(유니크 위반 23505)의 안내 문구. */
export function operatorNameError(error: { code?: string; message: string }): string {
  return error.code === "23505"
    ? "이미 다른 숲지기가 쓰고 있는 이름이에요. 다른 이름을 골라 주세요."
    : error.message;
}
