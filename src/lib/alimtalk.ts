// 고객에게 카카오 알림톡(솔라피)으로 예약 확정·변경·취소를 알린다.
// 필요한 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(발신번호), SOLAPI_PFID(카카오 채널 발신프로필 ID)
// 설정이 없거나 고객 연락처를 모르면 조용히 건너뛴다 (예약 자체는 막지 않음).
import crypto from "node:crypto";
import { phoneOf, type Branch, type Trainer } from "@/config/branches";
import { fullPhoneOf } from "./members";
import { kstHourMinute } from "./time";

/** 지점별 체험 1일전 안내 (변수: 회원명, 예약시간). 일정이 있는 선생님 캘린더의 지점으로 고른다 (2026-11-09 대표) */
export const TRIAL_REMIND_TEMPLATES: Record<string, string> = {
  main: "KA01TP261102085311480GQ2cz2LY28J", // 2층 온기PT&근막이완 (잠원동 1호점)
  pt: "KA01TP261102085311480GQ2cz2LY28J",
  sbp: "KA01TP261102085355069vnlti0moWj2", // 신반포스퀘어점
  priv: "KA01TP261102074702198wQaZ4EHvgww", // 지하 1층 온기 근막이완 (잠원동 2호점)
  sl: "KA01TP261102065637779YZX79oD7ASk", // 선릉점
};

/** 솔라피에서 승인된 템플릿 ID (2026-11-09 대표 전달) */
export const ALIMTALK_TEMPLATES = {
  // 2026-11-10 대표: 회원·담당 선생님 모두 새 템플릿 (이전: 확정 …lxp93yb59Vu, 변경 …2pe7uroxEiY, 취소 …v2rj6xYxJCu)
  new: "KA01TP261110025711564wymi58lDVP1",
  change: "KA01TP261110025841815DDu2xbo43c8",
  cancel: "KA01TP261110025749751gC338HqnmvU",
  /** 1일전 리마인드 (변수: 회원명, 예약시간) */
  remind: "KA01TP260812013652923zi15VSaFT4T",
  /** 체험 후 안내 (변수: 이름). 체험 일정 끝나는 시각에 발송 */
  afterTrial: "KA01TP260921130621048h3HqArYcdxs",
} as const;

/** 담당 선생님용 템플릿. 2026-11-10부터 회원과 같은 템플릿을 씀 (따로 바꾸고 싶으면 여기만 수정) */
export const STAFF_TEMPLATES: Partial<Record<keyof typeof ALIMTALK_TEMPLATES, string>> = {
  new: "KA01TP261110025711564wymi58lDVP1",
  change: "KA01TP261110025841815DDu2xbo43c8",
  cancel: "KA01TP261110025749751gC338HqnmvU",
};

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
  /** 변경 때 이전 담당 (다르면 그 선생님에게도 보냄) */
  oldTrainer?: Trainer;
};

/** 승인된 템플릿 변수 (2026-11-09 캡처 기준)
 *  확정: 이름·날짜·시간·지점·담당자 / 변경: 이름·이전일시·일시·지점·담당자 / 취소: 이름·일시·지점·담당자 */
export function alimVariables(a: AlimInput): Record<string, string> {
  const base = { "#{이름}": a.name, "#{지점}": a.branch.name, "#{담당자}": a.trainer.name };
  if (a.type === "new") {
    const [day, dow, time] = fmtKakao(a.when).split(" "); // 26.11.07 (토) 14:00
    return { ...base, "#{날짜}": `${day} ${dow}`, "#{시간}": time };
  }
  if (a.type === "afterTrial") return { "#{이름}": a.name };
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

/** 예약자와 담당 선생님(Vercel 환경변수 PHONE_이름)에게 같은 알림톡을 보낸다 (2026-11-09 대표) */
export async function alimtalk(a: AlimInput): Promise<void> {
  let to = a.phone.replace(/\D/g, "");
  if (to.length === 4) to = await fullPhoneOf(a.name, to);
  const variables = alimVariables(a);
  if (!to) console.log("alimtalk 예약자 번호 없음", a.type, JSON.stringify(variables));
  // 예약자에게는 회원용, 담당(변경 시 이전 담당 포함) 선생님에게는 내부용 템플릿
  const staff = new Set([a.trainer, a.oldTrainer].map((t) => (t && phoneOf(t)) || "").filter((x) => x.length >= 10));
  const sends: [string, string][] = [];
  if (to.length >= 10 && !staff.has(to)) sends.push([to, ALIMTALK_TEMPLATES[a.type]]);
  for (const ph of staff) sends.push([ph, STAFF_TEMPLATES[a.type] ?? ALIMTALK_TEMPLATES[a.type]]);
  for (const [ph, tpl] of sends) {
    if (!(await sendAlim(ph, tpl, variables))) console.log("alimtalk 실패", a.type, JSON.stringify(variables));
  }
}
