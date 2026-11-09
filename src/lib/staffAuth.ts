import { timingSafeEqual } from "node:crypto";

/** 직원 화면 비밀번호 확인 (Vercel 환경변수 STAFF_PASSWORD) */
export function staffAuthorized(req: Request) {
  const want = process.env.STAFF_PASSWORD ?? "";
  const got = req.headers.get("x-staff-key") ?? "";
  if (!want) return false;
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
