// 방문자 인사이트: 무엇을 눌렀는지, 어느 구간에 얼마나 머물렀는지, 어디서 왔는지 (개인정보 없이 하루 단위 합계만)
import { pipeline } from "./visits";

export const SECTION_LABEL: Record<string, string> = {
  top: "첫 화면", about: "소개", method: "근막이완", process: "진행 과정", reviews: "후기", branches: "지점",
  team: "팀", info: "이용 안내", price: "서비스 금액", book: "예약", faq: "FAQ",
};
const TTL = 100 * 86_400;
const clean = (s: unknown, n = 40) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export type InsightEvent =
  | { t: "view"; path: string; ref: string }
  | { t: "click"; path: string; label: string }
  | { t: "dwell"; path: string; total: number; sections: Record<string, number>; first?: boolean; fresh?: string[] };

export async function recordInsight(date: string, e: InsightEvent) {
  const k = (x: string) => `ins:${date}:${x}`;
  const cmds: (string | number)[][] = [];
  const path = clean(e.path, 60) || "/";
  if (e.t === "view") {
    cmds.push(["HINCRBY", k("ref"), clean(e.ref, 20) || "직접", 1], ["HINCRBY", k("path"), path, 1]);
  } else if (e.t === "click") {
    const label = clean(e.label);
    if (!label) return;
    cmds.push(["HINCRBY", k("click"), `${path}|${label}`, 1]);
  } else {
    const total = Math.min(1800, Math.max(0, Math.round(Number(e.total) || 0)));
    const fresh = new Set((Array.isArray(e.fresh) ? e.fresh : Object.keys(e.sections ?? {})).map((x) => clean(x, 30)));
    if (total > 0) cmds.push(["HINCRBY", k("dwell"), path, total]);
    if (e.first !== false) cmds.push(["HINCRBY", k("dwelln"), path, 1]);
    for (const [id, sec] of Object.entries(e.sections ?? {}).slice(0, 30)) {
      const s = Math.min(1800, Math.max(0, Math.round(Number(sec) || 0)));
      const sid = clean(id, 30);
      if (s < 1 || !sid) continue;
      cmds.push(["HINCRBY", k("sec"), `${path}|${sid}`, s]);
      if (fresh.has(sid)) cmds.push(["HINCRBY", k("secn"), `${path}|${sid}`, 1]);
    }
  }
  if (!cmds.length) return;
  for (const x of ["ref", "path", "click", "dwell", "dwelln", "sec", "secn"]) cmds.push(["EXPIRE", k(x), TTL]);
  await pipeline(cmds);
}

type H = Record<string, number>;
const sumInto = (acc: H, flat: unknown) => {
  const a = (flat as string[] | null) ?? [];
  for (let i = 0; i + 1 < a.length; i += 2) acc[a[i]] = (acc[a[i]] ?? 0) + (Number(a[i + 1]) || 0);
};

export async function readInsight(dates: string[]) {
  const kinds = ["ref", "path", "click", "dwell", "dwelln", "sec", "secn"] as const;
  const res = await pipeline(dates.flatMap((d) => kinds.map((x) => ["HGETALL", `ins:${d}:${x}`])));
  const agg = Object.fromEntries(kinds.map((x) => [x, {} as H])) as Record<(typeof kinds)[number], H>;
  dates.forEach((_, di) => kinds.forEach((x, ki) => sumInto(agg[x], res[di * kinds.length + ki])));
  const top = (h: H, n = 30) => Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, n);
  const homeViews = agg.path["/"] ?? 0;
  const sections = Object.keys(agg.sec)
    .filter((k) => k.startsWith("/|"))
    .map((k) => {
      const id = k.slice(2);
      const n = agg.secn[k] ?? 0;
      return { id, label: SECTION_LABEL[id] ?? id, reach: n, avgSec: n ? Math.round(agg.sec[k] / n) : 0, totalSec: agg.sec[k] };
    })
    .sort((a, b) => (Object.keys(SECTION_LABEL).indexOf(a.id) + 99) % 99 - (Object.keys(SECTION_LABEL).indexOf(b.id) + 99) % 99);
  const pages = top(agg.path, 15).map(([path, views]) => ({ path, views, avgSec: agg.dwelln[path] ? Math.round(agg.dwell[path] / agg.dwelln[path]) : 0 }));
  return {
    sessions: agg.dwelln["/"] ?? 0,
    homeViews,
    refs: top(agg.ref, 10).map(([name, n]) => ({ name, n })),
    pages,
    clicks: top(agg.click, 30).map(([k, n]) => {
      const i = k.indexOf("|");
      return { path: k.slice(0, i), label: k.slice(i + 1), n };
    }),
    sections,
  };
}
