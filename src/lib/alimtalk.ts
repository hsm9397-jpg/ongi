// 고객에게 카카오 알림톡(솔라피)으로 예약 확정·변경·취소를 알린다.
// 필요한 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(발신번호), SOLAPI_PFID(카카오 채널 발신프로필 ID)
// 설정이 없거나 고객 연락처를 모르면 조용히 건너뛴다 (예약 자체는 막지 않음).
import crypto from "node:crypto";
import type { Branch, Trainer } from "@/config/branches";
import { fullPhoneOf } from "./members";
import { kstHourMinute } from "./time";

/** 솔라피에서 승인된 템플릿 ID (2026-11-09 대표 전달) */
export const ALIMTALK_TEMPLATES = {
  new: "KA01TP261107001224054lxp93yb59Vu",
  change: "KA01TP2611070015236412pe7uroxEiY",
  cancel: "KA01TP261107001630236v2rj6xYxJCu",
  /** 1일전 리마인드 (변수: 회원명, 예약시간) */
  remind: "KA01TP260812013652923zi15VSaFT4T",
} as const;

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
/** 26.11.07 (토) 14:00 */
export function fmtKakao(d: Date): string {
  const { date, hour, minute } = kstHourMinute(d);
  const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${date.slice(2).replace(/-/g, ".")} (${dow}) ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export type AlimInput = {
  type: keyof typeof ALIMTALK_TEMPLATES;
  branch: Branch;
  trainer: Trainer;
  name: string;
  /** 전체 연락처(체험·PT) 또는 뒷번호 4자리(회원: 노션에서 전체 번호를 찾음) */
  phone: string;
  when: Date;
  oldWhen?: Date;
};

/** 승인된 템플릿 변수 (2026-11-09 캡처 기준)
 *  확정: 이름·날짜·시간·지점·담당자 / 변경: 이름·이전일시·일시·지점·담당자 / 취소: 이름·일시·지점·담당자 */
export function alimVariables(a: AlimInput): Record<string, string> {
  const base = { "#{이름}": a.name, "#{지점}": a.branch.name, "#{담당자}": a.trainer.name };
  if (a.type === "new") {
    const [day, dow, time] = fmtKakao(a.when).split(" "); // 26.11.07 (토) 14:00
    return { ...base, "#{날짜}": `${day} ${dow}`, "#{시간}": time };
  }
  if (a.type === "remind") return { "#{회원명}": a.name, "#{예약시간}": fmtKakao(a.when) };
  if (a.type === "change") return { ...base, "#{이전일시}": a.oldWhen ? fmtKakao(a.oldWhen) : "", "#{일시}": fmtKakao(a.when) };
  return { ...base, "#{일시}": fmtKakao(a.when) };
}

/** 알림톡 한 건 보내기. ok와 사유(실패 시 솔라피 응답)를 돌려준다 */
export async function sendAlimDetail(to: string, templateId: string, variables: Record<string, string>): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = (process.env.SOLAPI_SENDER || "").replace(/\D/g, "");
  const pfId = process.env.SOLAPI_PFID || "KA01PF2605110707236702uKEbcB6bFY"; // 카카오 채널 [온기pt] (비밀값 아님)
  const missing = [!key && "SOLAPI_API_KEY", !secret && "SOLAPI_API_SECRET", !from && "SOLAPI_SENDER"].filter(Boolean);
  if (missing.length) return { ok: false, detail: `Vercel 환경변수 없음: ${missing.join(", ")} (넣은 뒤 Redeploy 필요)` };
  if (to.length < 10) return { ok: false, detail: "받는 번호를 찾지 못함" };
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secret!).update(date + salt).digest("hex");
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}` },
      body: JSON.stringify({ messages: [{ to, from, kakaoOptions: { pfId, templateId, variables, disableSms: true } }] }),
    });
    const body = await res.text();
    if (!res.ok) { console.error("alimtalk 실패", res.status, body); return { ok: false, detail: `솔라피 ${res.status}: ${body.slice(0, 400)}` }; }
    if (/"failedMessageList":\[\{/.test(body)) { console.error("alimtalk 일부 실패", body); return { ok: false, detail: `솔라피 거부: ${body.slice(body.indexOf("failedMessageList"), body.indexOf("failedMessageList") + 400)}` }; }
    return { ok: true, detail: "솔라피 접수 완료" };
  } catch (e) {
    console.error("alimtalk 오류", e);
    return { ok: false, detail: `연결 오류: ${(e as Error).message}` };
  }
}

export async function sendAlim(to: string, templateId: string, variables: Record<string, string>): Promise<boolean> {
  return (await sendAlimDetail(to, templateId, variables)).ok;
}

export async function alimtalk(a: AlimInput): Promise<void> {
  let to = a.phone.replace(/\D/g, "");
  if (to.length === 4) to = await fullPhoneOf(a.name, to);
  const variables = alimVariables(a);
  if (!(await sendAlim(to, ALIMTALK_TEMPLATES[a.type], variables))) console.log("alimtalk 건너뜀/실패", a.type, JSON.stringify(variables));
}
