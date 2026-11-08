import { BOOKING, Branch, Trainer, calendarIdOf, hoursOf } from "@/config/branches";
import { CalEvent, listEvents } from "./google";
import { addDays, kstDate, todayKst } from "./time";

export type Slot = { hour: number; available: boolean };
export type DaySlots = Record<string, Slot[]>; // 'YYYY-MM-DD' -> slots

type Busy = Map<string, CalEvent[]>; // trainerId -> 막는 일정들
type Opens = Map<string, CalEvent[]>; // trainerId -> '오픈' 일정들 (근무시간 밖 추가 타임)

async function loadBusy(branch: Branch, from: Date, to: Date, opens: Opens = new Map()): Promise<Busy> {
  const busy: Busy = new Map();
  await Promise.all(
    branch.trainers.map(async (t) => {
      const cal = calendarIdOf(t);
      if (!cal) {
        busy.set(t.id, [{ id: "no-cal", summary: "캘린더 미설정", start: from, end: to, allDay: true, blocks: true, fromWeb: false }]);
        return;
      }
      try {
        const events = await listEvents(cal, from, to);
        busy.set(t.id, events.filter((e) => e.blocks));
        opens.set(t.id, events.filter((e) => e.open));
      } catch (err) {
        // 캘린더 공유가 아직 안 된 선생님은 예약을 받지 않는다 (다른 선생님 예약은 계속 받음)
        console.error(`calendar ${t.name}`, err);
        busy.set(t.id, [{ id: "no-access", summary: "캘린더 접근 불가", start: from, end: to, allDay: true, blocks: true, fromWeb: false }]);
      }
    })
  );
  return busy;
}

const overlaps = (e: CalEvent, s: Date, en: Date) => e.start < en && e.end > s;

/** 이 선생님이 이 시간에 일하는지: 평소 시간대이거나, '오픈' 일정이 세션 전체를 덮을 때 */
function works(branch: Branch, opens: Opens, t: Trainer, hour: number, start: Date, end: Date) {
  return hoursOf(branch).includes(hour) || (opens.get(t.id) ?? []).some((o) => o.start <= start && o.end >= end);
}

/** 그날 열 수 있는 시작 시각: 평소 시간대 + '오픈' 일정 안의 정시들 */
function hoursFor(branch: Branch, opens: Opens, date: string, onlyTrainer?: string) {
  const hs = new Set(hoursOf(branch));
  for (const t of branch.trainers) {
    if (onlyTrainer && t.id !== onlyTrainer) continue;
    for (const o of opens.get(t.id) ?? [])
      for (let h = 0; h < 24; h++) {
        const s = kstDate(date, h);
        if (o.start <= s && o.end.getTime() >= s.getTime() + BOOKING.sessionMinutes * 60_000) hs.add(h);
      }
  }
  return [...hs].sort((a, b) => a - b);
}

function slotState(branch: Branch, busy: Busy, opens: Opens, hour: number, start: Date, onlyTrainer?: string) {
  const end = new Date(start.getTime() + BOOKING.sessionMinutes * 60_000);
  const busyTrainers = branch.trainers.filter((t) => (busy.get(t.id) ?? []).some((e) => overlaps(e, start, end)));
  // 종일 휴무는 베드를 차지하지 않으므로 '시간 일정'이 있는 선생님 수만 베드 사용으로 센다
  const bedsUsed = branch.trainers.filter((t) =>
    (busy.get(t.id) ?? []).some((e) => !e.allDay && overlaps(e, start, end))
  ).length;
  const free = branch.trainers.filter((t) => !t.selfBook && !busyTrainers.includes(t) && works(branch, opens, t, hour, start, end));
  const candidates = onlyTrainer ? free.filter((t) => t.id === onlyTrainer) : free;
  return { available: bedsUsed < branch.beds && candidates.length > 0, candidates, end };
}

function bookableStart(date: string, hour: number, now: Date) {
  const start = kstDate(date, hour);
  return start.getTime() - now.getTime() >= BOOKING.minLeadHours * 3_600_000 ? start : null;
}

/** 오늘부터 daysAhead일 동안의 지점 빈자리 */
export async function getAvailability(branch: Branch, trainerId?: string, now = new Date(), daysAhead = BOOKING.daysAhead): Promise<DaySlots> {
  const first = todayKst(now);
  const from = kstDate(first, 0);
  const to = kstDate(addDays(first, daysAhead), 0);
  const opens: Opens = new Map();
  const busy = await loadBusy(branch, from, to, opens);
  const out: DaySlots = {};
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(first, i);
    const slots: Slot[] = [];
    for (const h of hoursFor(branch, opens, date, trainerId)) {
      const start = bookableStart(date, h, now);
      slots.push({ hour: h, available: !!start && slotState(branch, busy, opens, h, start, trainerId).available });
    }
    out[date] = slots;
  }
  return out;
}

/** 예약 직전 다시 확인하고, 배정할 선생님을 고른다 (체험은 그날 일정이 가장 적은 선생님) */
export async function pickTrainer(
  branch: Branch,
  date: string,
  hour: number,
  trainerId?: string,
  now = new Date(),
  daysAhead = BOOKING.daysAhead
): Promise<{ trainer: Trainer; start: Date; end: Date } | null> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (date >= addDays(todayKst(now), daysAhead)) return null;
  const start = bookableStart(date, hour, now);
  if (!start) return null;
  const opens: Opens = new Map();
  const busy = await loadBusy(branch, kstDate(date, 0), kstDate(addDays(date, 1), 0), opens);
  const st = slotState(branch, busy, opens, hour, start, trainerId);
  if (!st.available) return null;
  const load = (t: Trainer) => (busy.get(t.id) ?? []).filter((e) => !e.allDay).length;
  const trainer = [...st.candidates].sort((a, b) => load(a) - load(b))[0];
  return { trainer, start, end: st.end };
}

/** 최근 90일 캘린더에서 이 회원 이름이 가장 최근에 들어간 선생님 = 담당 선생님으로 추정 */
export async function guessTrainer(branch: Branch, memberName: string, now = new Date()): Promise<string | undefined> {
  const from = new Date(now.getTime() - 90 * 86_400_000);
  const to = new Date(now.getTime() + BOOKING.daysAhead * 86_400_000);
  let best: { id: string; at: number } | undefined;
  await Promise.all(
    branch.trainers.map(async (t) => {
      const cal = calendarIdOf(t);
      if (!cal) return;
      const events = await listEvents(cal, from, to, memberName).catch(() => []);
      for (const e of events) {
        if (!e.summary.replace(/\s/g, "").includes(memberName)) continue;
        const at = Math.min(e.start.getTime(), now.getTime());
        if (!best || at > best.at) best = { id: t.id, at };
      }
    })
  );
  return best?.id;
}
