export const cleanName = (v: unknown) =>
  typeof v === "string" ? v.replace(/[\r\n\t]/g, " ").trim().slice(0, 20) : "";
export const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");
export const cleanMemo = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 300) : "");

// 아주 단순한 시도 횟수 제한 (서버 인스턴스별). 회원 확인을 무작정 대입하는 것을 늦춘다.
const hits = new Map<string, { n: number; until: number }>();
export function tooMany(key: string, limit = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.until < now) {
    hits.set(key, { n: 1, until: now + windowMs });
    return false;
  }
  h.n++;
  return h.n > limit;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
