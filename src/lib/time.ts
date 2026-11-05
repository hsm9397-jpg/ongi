// 한국 시간(KST, UTC+9, 서머타임 없음) 기준 날짜 계산.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' (KST 기준 오늘) */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** KST 날짜+시각을 실제 시각(Date)으로 */
export function kstDate(date: string, hour: number, minute = 0): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+09:00`);
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

/** RFC3339 with +09:00 */
export function toKstIso(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19);
  return `${k}+09:00`;
}

export function kstHourMinute(d: Date): { date: string; hour: number; minute: number } {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return { date: k.toISOString().slice(0, 10), hour: k.getUTCHours(), minute: k.getUTCMinutes() };
}
