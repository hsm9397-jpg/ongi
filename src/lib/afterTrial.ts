// 체험 후 안내: 캘린더에서 제목에 '체험'이 있는 일정이 끝나면 그 고객에게 알림톡 (2026-11-09 대표)
import { BRANCHES, calendarIdOf } from "@/config/branches";
import { ALIMTALK_TEMPLATES, fmtKakao, sendAlimDetail } from "./alimtalk";
import { listEvents } from "./google";
import { addDays, kstDate, todayKst } from "./time";
import { trialPhone } from "./trial";
import { pipeline, visitsReady } from "./visits";

export type TrialItem = { name: string; when: string; branch: string; trainer: string; status: "send" | "sent" | "skip" | "fail" | "wait"; reason?: string; from?: string };

const isTrial = (t: string) => /체험/.test(t) && !/상담/.test(t);

/** 오늘 체험 일정 전체. send=true면 끝난 지 window분 안의 일정에 발송 */
export async function runAfterTrial(opts: { send: boolean; now?: Date; windowMin?: number; tomorrow?: boolean }): Promise<TrialItem[]> {
  const now = opts.now ?? new Date();
  const date = opts.tomorrow ? addDays(todayKst(now), 1) : todayKst(now);
  const items: TrialItem[] = [];
  for (const b of BRANCHES.filter((b) => b.open || b.hidden)) {
    for (const t of b.trainers) {
      const cal = calendarIdOf(t);
      if (!cal) continue;
      const events = await listEvents(cal, kstDate(date, 0), kstDate(addDays(date, 1), 0)).catch(() => []);
      for (const e of events) {
        if (e.allDay || !isTrial(e.summary)) continue;
        const who = await trialPhone(e).catch(() => ({ name: "", phone: "", from: "" }));
        const item: TrialItem = { name: who.name || e.summary, when: fmtKakao(e.end), branch: b.short, trainer: t.name, status: "wait", from: who.from };
        items.push(item);
        if (!who.phone) { item.status = "skip"; item.reason = who.from || "연락처를 못 찾음 (노션 체험자 DB에 이름·번호 입력 필요)"; continue; }
        if (e.end.getTime() > now.getTime()) { item.reason = opts.tomorrow ? "번호 확인됨 · 끝나는 시각에 발송" : "끝나는 시각에 발송"; continue; }
        const key = `at:${e.id}`;
        if (visitsReady()) {
          const [v] = await pipeline([["GET", key]]).catch(() => [null]);
          if (v) { item.status = "sent"; continue; }
        }
        if (!opts.send) { item.status = "skip"; item.reason = "보내지 않음 (끝난 지 30분 넘음 또는 발송 대기)"; continue; }
        if (now.getTime() - e.end.getTime() > (opts.windowMin ?? 30) * 60_000) { item.status = "skip"; item.reason = "끝난 지 30분 넘어 보내지 않음"; continue; }
        if (visitsReady()) {
          const [ok] = await pipeline([["SET", key, "1", "NX", "EX", 172800]]).catch(() => ["OK"]);
          if (ok !== "OK") { item.status = "sent"; continue; }
        }
        const r = await sendAlimDetail(who.phone, ALIMTALK_TEMPLATES.afterTrial, { "#{이름}": who.name });
        item.status = r.ok ? "sent" : "fail";
        if (!r.ok) item.reason = r.detail;
      }
    }
  }
  return items;
}
