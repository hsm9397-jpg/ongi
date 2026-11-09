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

export function alimVariables(a: AlimInput): Record<string, string> {
  const v: Record<string, string> = { "#{이름}": a.name, "#{일시}": fmtKakao(a.when), "#{지점}": a.branch.name };
  if (a.type !== "cancel") v["#{담당자}"] = a.trainer.name;
  if (a.type === "change") v["#{이전일시}"] = a.oldWhen ? fmtKakao(a.oldWhen) : "";
  return v;
}

export async function alimtalk(a: AlimInput): Promise<void> {
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = (process.env.SOLAPI_SENDER || "").replace(/\D/g, "");
  const pfId = process.env.SOLAPI_PFID || "";
  let to = a.phone.replace(/\D/g, "");
  if (to.length === 4) to = await fullPhoneOf(a.name, to);
  const variables = alimVariables(a);
  if (!key || !secret || !from || !pfId || to.length < 10) {
    console.log("alimtalk (설정 또는 연락처 없음, 건너뜀)", a.type, JSON.stringify(variables));
    return;
  }
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        messages: [{ to, from, kakaoOptions: { pfId, templateId: ALIMTALK_TEMPLATES[a.type], variables, disableSms: true } }],
      }),
    });
    if (!res.ok) console.error("alimtalk 실패", res.status, await res.text());
  } catch (e) {
    console.error("alimtalk 오류", e);
  }
}
