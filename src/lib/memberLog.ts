// 회원 예약 내역: 홈페이지에서 한 예약·변경·취소를 회원별로 남긴다 (2026-11-13 대표, Upstash Redis)
// 키: mlog:{이름}:{뒷4자리}, 오래된 것부터 쌓는 목록. 최근 200개만 보관.
import { pipeline, visitsReady } from "./visits";
import { normName } from "./notion";
import { kstHourMinute } from "./time";

export type LogItem = { t: "book" | "change" | "cancel"; at: string; date: string; hour: number; minute: number; to?: { date: string; hour: number; minute: number }; sameDay?: boolean; branch?: string; trainer?: string };

const key = (name: string, last4: string) => `mlog:${normName(name)}:${last4}`;
const demo = new Map<string, LogItem[]>();

export async function logMember(name: string, last4: string, item: Omit<LogItem, "at" | "date" | "hour" | "minute"> & { when: Date; toWhen?: Date }) {
  if (!name || last4.length !== 4) return;
  const w = kstHourMinute(item.when);
  const { when: _w, toWhen, ...rest } = item;
  void _w;
  const row: LogItem = { ...rest, at: new Date().toISOString(), date: w.date, hour: w.hour, minute: w.minute, ...(toWhen ? { to: kstHourMinute(toWhen) } : {}) };
  try {
    if (process.env.DEMO_MODE === "1") { const k = key(name, last4); demo.set(k, [...(demo.get(k) ?? []), row]); return; }
    if (!visitsReady()) return;
    await pipeline([["RPUSH", key(name, last4), JSON.stringify(row)], ["LTRIM", key(name, last4), -200, -1]]);
  } catch (e) {
    console.error("memberLog", e);
  }
}

export async function readMemberLog(name: string, last4: string): Promise<LogItem[]> {
  if (process.env.DEMO_MODE === "1") return demo.get(key(name, last4)) ?? [];
  if (!visitsReady()) return [];
  const [r] = (await pipeline([["LRANGE", key(name, last4), 0, -1]])) as (string[] | null)[];
  return (r ?? []).flatMap((s) => { try { return [JSON.parse(s) as LogItem]; } catch { return []; } });
}
