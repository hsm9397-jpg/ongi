// 회차권 잔여 횟수 계산 (2026-11-07 대표 규칙)
// - 지점 매출 현황 DB에서 회원의 등록 이력(날짜 + 프로그램 회수)을 찾는다. 체험·PT는 제외.
// - 회원 페이지의 '방문 기록' DB에서 회차 숫자를 읽는다. '체험', '리뷰' 등 숫자가 아닌 회차는 세지 않는다.
// - 회원권을 다 쓰면 회차를 1부터 다시 적는다. 그래서 마지막 '1' 이후의 최대 회차가 현재 회원권의 사용 횟수.
// - 마지막 '1' 날짜 이전(같은 날 포함) 마지막 등록 = 지금 쓰는 회원권, 그 뒤 등록분은 아직 시작 전이라 통째로 남는다.
import { normName, notion, plainText, schemaOf } from "./notion";

type Prop = { type: string; [k: string]: unknown };
type Row = { id: string; properties: Record<string, Prop> };
type Block = { id: string; type: string; has_children?: boolean; child_database?: { title: string } };

const SALES_DBS = () =>
  (process.env.NOTION_SALES_DBS ||
    "28346121f7658009936ef563ffe67ab9,3c646121f76580a4a078fe1e650b3b7b,34f46121f76580889991f2be9c2e1b95,25c1832e36d34eb0800f3a5e3d61e521")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export type Reg = { date: string; total: number };
export type Visit = { date: string; n: number };

const dateOf = (p?: Prop) => ((p?.date as { start?: string } | null)?.start ?? "").slice(0, 10);

/** "10회", "근막이완10회(1주년)" → 10. 체험·PT·숫자 없음 → null */
export function totalOf(program: string): number | null {
  if (/체험|PT/i.test(program)) return null;
  const m = program.match(/(\d+)\s*회/);
  return m ? Number(m[1]) : null;
}

const programCache = new Map<string, string>();
async function programTitle(pageId: string): Promise<string> {
  const hit = programCache.get(pageId);
  if (hit !== undefined) return hit;
  const p = await notion<Row>(`/pages/${pageId}`);
  const t = plainText(Object.values(p.properties).find((x) => x.type === "title"));
  programCache.set(pageId, t);
  return t;
}

async function registrationsIn(db: string, name: string): Promise<Reg[]> {
  const out: Reg[] = [];
  const { titleProp } = await schemaOf(db);
  const r = await notion<{ results: Row[] }>(`/databases/${db}/query`, {
    method: "POST",
    body: JSON.stringify({ filter: { property: titleProp, title: { contains: name.slice(0, 10) } }, page_size: 100 }),
  });
  await Promise.all(
    r.results.map(async (row) => {
      if (normName(plainText(row.properties[titleProp])) !== name) return;
      const props = Object.entries(row.properties);
      const date = dateOf(props.find(([, p]) => p.type === "date")?.[1]);
      const rel = props.find(([n, p]) => p.type === "relation" && (n.includes("서비스") || n.includes("프로그램")))?.[1];
      const ids = ((rel?.relation as { id: string }[]) ?? []).map((x) => x.id);
      if (!date || !ids.length) return;
      const total = totalOf(await programTitle(ids[0]));
      if (total) out.push({ date, total });
    })
  );
  return out;
}

async function registrations(name: string): Promise<Reg[]> {
  const all = (await Promise.all(SALES_DBS().map((db) => registrationsIn(db, name)))).flat();
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

/** 회원 페이지 안의 '방문 기록' DB (최상위 또는 칸 나누기 안) */
async function visitDb(pageId: string): Promise<string | null> {
  const kids = async (id: string) => (await notion<{ results: Block[] }>(`/blocks/${id}/children?page_size=100`)).results;
  const top = await kids(pageId);
  const find = (bs: Block[]) => bs.find((b) => b.type === "child_database" && (b.child_database?.title ?? "").includes("방문"));
  let hit = find(top);
  if (hit) return hit.id;
  for (const cl of top.filter((b) => b.type === "column_list")) {
    for (const col of await kids(cl.id)) {
      hit = find(await kids(col.id));
      if (hit) return hit.id;
    }
  }
  return null;
}

async function visits(pageId: string): Promise<Visit[]> {
  const db = await visitDb(pageId);
  if (!db) return [];
  const out: Visit[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion<{ results: Row[]; has_more: boolean; next_cursor: string | null }>(`/databases/${db}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    for (const row of r.results) {
      const raw = plainText(row.properties["회차"]).trim();
      if (!/^\d+$/.test(raw)) continue; // 체험, 리뷰 등은 세지 않음
      const date = dateOf(Object.values(row.properties).find((p) => p.type === "date"));
      if (date) out.push({ date, n: Number(raw) });
    }
    cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}

/** 규칙만 담은 계산 (테스트하기 쉽게 분리) */
export function computeRemaining(regs: Reg[], vs: Visit[]): { remaining: number; total: number } | null {
  if (!regs.length) return null;
  const sorted = [...vs].sort((a, b) => a.date.localeCompare(b.date) || a.n - b.n);
  let one = -1;
  sorted.forEach((v, i) => v.n === 1 && (one = i));
  const latest = regs[regs.length - 1];
  if (one < 0) return { remaining: latest.total, total: latest.total };
  const oneDate = sorted[one].date;
  const used = Math.max(...sorted.slice(one).map((v) => v.n));
  const cur = [...regs].reverse().find((r) => r.date <= oneDate);
  const later = regs.filter((r) => r.date > oneDate);
  const remaining = (cur ? Math.max(0, cur.total - used) : 0) + later.reduce((s, r) => s + r.total, 0);
  return { remaining, total: later.length ? later[later.length - 1].total : cur?.total ?? latest.total };
}

const cache = new Map<string, { at: number; v: { remaining: number; total: number } | null }>();
/** 회원 이름 + 회원 페이지 ID로 잔여 회차. 확인할 수 없으면 null (화면에 안 보임) */
export async function remainingOf(name: string, pageId: string): Promise<{ remaining: number; total: number } | null> {
  if (process.env.DEMO_MODE === "1") return { remaining: 3, total: 10 };
  const key = `${name}|${pageId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  try {
    const [regs, vs] = await Promise.all([registrations(name), visits(pageId)]);
    const v = computeRemaining(regs, vs);
    cache.set(key, { at: Date.now(), v });
    return v;
  } catch (e) {
    console.error("remainingOf", e);
    return null;
  }
}
