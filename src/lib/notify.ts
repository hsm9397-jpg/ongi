// 예약·변경·취소가 생기면 담당 선생님과 관리자에게 문자(솔라피)로 알린다.
// 필요한 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(발신번호),
//   NOTIFY_PHONES(항상 받을 번호, 쉼표로 여러 개), PHONE_선생님(예: PHONE_HYUNSEUNGMIN)
// 설정이 없으면 조용히 건너뛴다 (예약 자체는 막지 않음).
import crypto from "node:crypto";
import { Trainer, phoneOf } from "@/config/branches";
import { kstHourMinute } from "./time";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export function fmtWhen(d: Date): string {
  const { date, hour, minute } = kstHourMinute(d);
  const [, m, day] = date.split("-").map(Number);
  const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${m}/${day}(${dow}) ${hour}:${String(minute).padStart(2, "0")}`;
}

export type NotifyInput = {
  type: "new" | "change" | "cancel";
  branchName: string;
  trainer: Trainer;
  /** 변경 시 이전 담당 (다르면 둘 다 알림) */
  oldTrainer?: Trainer;
  name: string;
  kind: string;
  when: Date;
  oldWhen?: Date;
};

export function notifyText(n: NotifyInput): string {
  const head = { new: "[온기 새 예약]", change: "[온기 예약 변경]", cancel: "[온기 예약 취소]" }[n.type];
  const kind = n.kind === "trial" ? "체험" : n.kind === "pt" ? "PT 상담" : "회원";
  const lines = [head, `${n.branchName} · ${n.trainer.name} 선생님`, `${n.name} (${kind})`];
  if (n.type === "change" && n.oldWhen) lines.push(`${fmtWhen(n.oldWhen)} → ${fmtWhen(n.when)}`);
  else lines.push(fmtWhen(n.when));
  if (n.type === "change" && n.oldTrainer && n.oldTrainer.id !== n.trainer.id) lines.push(`담당 변경: ${n.oldTrainer.name} → ${n.trainer.name}`);
  lines.push(n.type === "new" ? "홈페이지 예약" : "고객이 홈페이지에서 직접 처리했어요.");
  return lines.join("\n");
}

export async function notify(n: NotifyInput): Promise<void> {
  const text = notifyText(n);
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = (process.env.SOLAPI_SENDER || "").replace(/\D/g, "");
  const to = new Set<string>();
  for (const p of (process.env.NOTIFY_PHONES || "").split(",")) if (p.replace(/\D/g, "").length >= 10) to.add(p.replace(/\D/g, ""));
  for (const t of [n.trainer, n.oldTrainer]) {
    const p = t && phoneOf(t);
    if (p) to.add(p);
  }
  if (!key || !secret || !from || !to.size) {
    console.log("notify (문자 설정 없음, 건너뜀)\n" + text);
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
      body: JSON.stringify({ messages: [...to].map((t) => ({ to: t, from, text })) }),
    });
    if (!res.ok) console.error("notify 실패", res.status, await res.text());
  } catch (e) {
    console.error("notify 오류", e);
  }
}
