// 체험자 연락처 찾기: 홈페이지 예약 정보 → 캘린더 일정 메모의 번호 → 노션 '체험자(지점)' DB(직원이 네이버에서 옮겨 적는 곳)
import { notion, normName, plainText } from "./notion";
import { kstHourMinute } from "./time";

type Prop = { type: string; [k: string]: unknown };
type Page = { properties: Record<string, Prop> };

// 예약 스케쥴 관리 페이지의 체험자(지하)·(2층)·(신반포스퀘어)·(선릉) DB
const TRIAL_DBS = () =>
  (process.env.NOTION_TRIAL_DBS || "39946121f76580e9a5d7ec0c170893e3,3b246121f76580d0b3f7e40ea96e28f1,3b446121f7658097a365d5fb1b5d7650,40946121f765805f8239da7d08d5bc53")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const phonesIn = (s: string) => (s.match(/01\d[\d-\s]{7,11}\d/g) ?? []).map((x) => x.replace(/\D/g, "")).filter((x) => x.length >= 10 && x.length <= 11);

let cache: { at: number; rows: { name: string; phone: string; date: string }[] } | null = null;
async function trialRows() {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.rows;
  const rows: { name: string; phone: string; date: string }[] = [];
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  for (const db of TRIAL_DBS()) {
    try {
      const r = await notion<{ results: Page[] }>(`/databases/${db}/query`, {
        method: "POST",
        body: JSON.stringify({ page_size: 100, sorts: [{ timestamp: "created_time", direction: "descending" }] }),
      });
      for (const p of r.results) {
        const props = Object.values(p.properties);
        const name = normName(plainText(props.find((x) => x.type === "title")));
        const phone = phonesIn(props.map((x) => plainText(x)).join(" "))[0] ?? "";
        const d = props.find((x) => x.type === "date")?.date as { start?: string } | null | undefined;
        const date = d?.start ? (d.start.length > 10 ? kstHourMinute(new Date(d.start)).date : d.start) : "";
        if (name && phone && (!date || date >= since)) rows.push({ name, phone, date });
      }
    } catch (e) {
      console.error("trial db", db, (e as Error).message);
    }
  }
  cache = { at: Date.now(), rows };
  return rows;
}

/** 체험 일정 하나의 연락처. 못 찾으면 빈 값 */
export async function trialPhone(ev: { summary: string; description?: string; start: Date; props?: Record<string, string> }): Promise<{ name: string; phone: string; from: string }> {
  const m = ev.summary.trim().match(/^([가-힣]{2,4})\s*(\d{4})?/);
  const name = ev.props?.name ? normName(ev.props.name) : m ? normName(m[1]) : "";
  const last4 = m?.[2];
  if ((ev.props?.phone ?? "").length >= 10) return { name, phone: ev.props!.phone, from: "홈페이지 예약" };
  const inDesc = phonesIn(ev.description ?? "").find((p) => !last4 || p.endsWith(last4));
  if (inDesc) return { name, phone: inDesc, from: "캘린더 메모" };
  if (!name) return { name, phone: "", from: "" };
  const date = kstHourMinute(ev.start).date;
  const rows = (await trialRows()).filter((r) => r.name === name && (!last4 || r.phone.endsWith(last4)));
  const sameDay = [...new Set(rows.filter((r) => r.date === date).map((r) => r.phone))];
  if (sameDay.length === 1) return { name, phone: sameDay[0], from: "노션 체험자 DB" };
  const any = [...new Set(rows.map((r) => r.phone))];
  if (any.length === 1) return { name, phone: any[0], from: "노션 체험자 DB" };
  return { name, phone: "", from: any.length > 1 ? "같은 이름 여러 명" : "" };
}
