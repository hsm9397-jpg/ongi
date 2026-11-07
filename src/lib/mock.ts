// DEMO_MODE=1 이면 구글·노션 없이 예시 데이터로 화면을 확인할 수 있습니다. 실제 운영에서는 끄세요.
import type { CalEvent } from "./google";

export const demoMode = () => process.env.DEMO_MODE === "1";

const created: { calendarId: string; ev: CalEvent }[] = [];
const NAMES = ["박서연", "최민준", "정하늘", "윤지아", "강도윤", "조은별", "임채원", "한서진"];

function seeded(str: string) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

export function demoEvents(calendarId: string, timeMin: Date, timeMax: Date): CalEvent[] {
  const out: CalEvent[] = [];
  for (let t = new Date(timeMin); t < timeMax; t = new Date(t.getTime() + 3600_000)) {
    const kstH = (t.getUTCHours() + 9) % 24;
    if (kstH < 10 || kstH > 20) continue;
    const r = seeded(`${calendarId}-${t.toISOString()}`);
    if (r() < 0.55) {
      const trial = r() < 0.2;
      const name = NAMES[Math.floor(r() * NAMES.length)];
      out.push({
        id: `demo-${calendarId}-${t.getTime()}`,
        summary: trial ? `${name}${1000 + Math.floor(r() * 8999)} 체험` : `${name} ${1 + Math.floor(r() * 9)}/10`,
        start: t,
        end: new Date(t.getTime() + 50 * 60_000),
        allDay: false,
        blocks: true,
        fromWeb: false,
      });
    }
  }
  for (const c of created) if (c.calendarId === calendarId && c.ev.start < timeMax && c.ev.end > timeMin) out.push(c.ev);
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function demoCreate(calendarId: string, summary: string, start: Date, end: Date, props?: Record<string, string>, description?: string) {
  const ev: CalEvent = { id: `web-${Date.now()}-${created.length}`, summary, start, end, allDay: false, blocks: true, fromWeb: true, props, description };
  created.push({ calendarId, ev });
  return { id: ev.id };
}

export function demoDelete(eventId: string) {
  const i = created.findIndex((c) => c.ev.id === eventId);
  if (i >= 0) created.splice(i, 1);
}

export function demoOpen(calendarId: string, start: Date, end: Date) {
  created.push({ calendarId, ev: { id: `open-${Date.now()}-${created.length}`, summary: "오픈", start, end, allDay: false, blocks: false, open: true, fromWeb: false } });
}

export function demoMove(eventId: string, start: Date, end: Date) {
  const c = created.find((x) => x.ev.id === eventId);
  if (c) Object.assign(c.ev, { start, end });
}
