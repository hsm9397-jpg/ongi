// 1일전 리마인드: 내일 모든 선생님 캘린더 일정 중 체험·PT상담·오픈·종일 일정을 빼고,
// 노션 누적 회원 DB에서 연락처를 찾아 알림톡을 보낸다. (2026-11-09 대표 결정: 체험자 제외 전체 스케줄)
import { BRANCHES, calendarIdOf } from "@/config/branches";
import { ALIMTALK_TEMPLATES, alimVariables, fmtKakao, sendAlim } from "./alimtalk";
import { listEvents } from "./google";
import { phonesFor } from "./members";
import { normName } from "./notion";
import { addDays, kstDate, todayKst } from "./time";
import { pipeline, visitsReady } from "./visits";

export type RemindItem = { name: string; when: string; branch: string; trainer: string; status: "send" | "sent" | "skip" | "fail"; reason?: string };

const SKIP_TITLE = /체험|상담|오픈|휴무|휴가|점심|회의|교육|블락|block/i;

/** 제목 "김온기 3/10", "김온기1234 3/10" → 이름, 뒷번호 */
function parseTitle(t: string): { name: string; last4?: string } | null {
  const m = t.trim().match(/^([가-힣]{2,4})(?:\s*(\d{4})(?![\d/]))?/);
  if (!m) return null;
  return { name: normName(m[1]), last4: m[2] };
}

export async function runRemind(opts: { dry: boolean; now?: Date }): Promise<{ date: string; items: RemindItem[] }> {
  const date = addDays(todayKst(opts.now ?? new Date()), 1);
  const from = kstDate(date, 0), to = kstDate(addDays(date, 1), 0);
  const items: RemindItem[] = [];
  // 같은 사람이 내일 여러 타임이면 가장 이른 타임 1번만
  const byPhone = new Map<string, { name: string; when: Date; idx: number }>();
  for (const b of BRANCHES.filter((b) => b.open || b.hidden)) {
    for (const t of b.trainers) {
      const cal = calendarIdOf(t);
      if (!cal) continue;
      const events = await listEvents(cal, from, to).catch(() => []);
      for (const e of events) {
        if (e.allDay || e.open || SKIP_TITLE.test(e.summary) || e.props?.kind === "trial" || e.props?.kind === "pt") continue;
        const p = parseTitle(e.summary);
        if (!p) continue;
        const name = e.props?.name ? normName(e.props.name) : p.name;
        const last4 = (e.props?.phone ?? "").length === 4 ? e.props!.phone : p.last4;
        const item: RemindItem = { name, when: fmtKakao(e.start), branch: b.short, trainer: t.name, status: "send" };
        const full = (e.props?.phone ?? "").length >= 10 ? [e.props!.phone] : await phonesFor(name, last4).catch(() => []);
        if (full.length !== 1) {
          item.status = "skip";
          item.reason = full.length ? "같은 이름 회원이 여러 명" : "노션에서 연락처를 못 찾음";
          items.push(item);
          continue;
        }
        const prev = byPhone.get(full[0]);
        if (prev && prev.when <= e.start) continue;
        if (prev) items.splice(prev.idx, 1, { ...items[prev.idx], status: "skip", reason: "같은 날 이른 예약에 함께 안내" });
        byPhone.set(full[0], { name, when: e.start, idx: items.length });
        items.push(item);
      }
    }
  }
  if (!opts.dry) {
    for (const [phone, v] of byPhone) {
      const it = items[v.idx];
      // 같은 날 두 번 보내지 않도록 기록 (저장소가 있으면)
      if (visitsReady()) {
        const [ok] = await pipeline([["SET", `rm:${date}:${phone}`, "1", "NX", "EX", 259200]]).catch(() => ["OK"]);
        if (ok !== "OK") { it.status = "sent"; it.reason = "이미 보냄"; continue; }
      }
      const sent = await sendAlim(phone, ALIMTALK_TEMPLATES.remind, alimVariables({ type: "remind", branch: BRANCHES[0], trainer: BRANCHES[0].trainers[0], name: v.name, phone, when: v.when }));
      it.status = sent ? "sent" : "fail";
      if (!sent) it.reason = "발송 실패 (솔라피 발송 내역 확인)";
    }
    if (visitsReady()) await pipeline([["SET", "rm:last", JSON.stringify({ at: new Date().toISOString(), date, items })]]).catch(() => {});
  }
  return { date, items };
}

export async function lastRemind(): Promise<{ at: string; date: string; items: RemindItem[] } | null> {
  if (!visitsReady()) return null;
  const [v] = await pipeline([["GET", "rm:last"]]).catch(() => [null]);
  return typeof v === "string" ? JSON.parse(v) : null;
}
