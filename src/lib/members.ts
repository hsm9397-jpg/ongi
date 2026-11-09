// 유효 회원 = '근막이완 회원 통합 리스트'와 '금액권(멤버쉽) 회원 리스트'에 있는 회원.
// 지점별 회원현황(누적) DB에만 있는 회원은 만료 회원으로 본다. (2026-11-06 대표 결정)
import crypto from "node:crypto";
import { BRANCHES, memberDbIdsOf } from "@/config/branches";
import { findMember, normName, notion, plainText, schemaOf } from "./notion";

type Prop = { type: string; [k: string]: unknown };
type Page = { id: string; url: string; public_url?: string | null; properties: Record<string, Prop> };

export type ValidMember = { id: string; name: string; group: string; url: string; sharers?: { name: string; last4: string }[] };

/** 금액권 '공유자' 칸: "김은수3509, 현재상1209"처럼 이름+뒷번호 4자리 */
function parseSharers(text: string): { name: string; last4: string }[] {
  const out: { name: string; last4: string }[] = [];
  for (const m of text.matchAll(/([가-힣A-Za-z]{2,})\s*\(?\s*(?:\d{3}-?\d{3,4}-?)?(\d{4})\)?/g)) out.push({ name: normName(m[1]), last4: m[2] });
  return out;
}

const VALID_DBS = () =>
  (process.env.NOTION_VALID_DBS || "fcb46121f765830ea8d501a3a6eb51ee,32946121f765801a8bf9c58f847716c9")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const PUBLIC_SITE = () => process.env.NOTION_PUBLIC_SITE || "https://tabby-character-dd3.notion.site";

const DEMO: ValidMember[] = [
  { id: "demo1", name: "김온기", group: "현승민", url: "https://www.notion.so" },
  { id: "demo2", name: "이경신", group: "현승민", url: "https://www.notion.so" },
  { id: "demo3", name: "박선영", group: "황사라", url: "https://www.notion.so" },
  { id: "demo4", name: "조은비", group: "금액권", url: "https://www.notion.so", sharers: [{ name: "조은솔", last4: "5678" }] },
];

let cache: { at: number; list: ValidMember[] } | null = null;

/** 유효 회원 전체 (5분 캐시). 노션 연결이 안 돼 있으면 null */
export async function validMembers(): Promise<ValidMember[] | null> {
  if (process.env.DEMO_MODE === "1") return DEMO;
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.list;
  try {
    const list: ValidMember[] = [];
    for (const db of VALID_DBS()) {
      let cursor: string | undefined;
      do {
        const r = await notion<{ results: Page[]; has_more: boolean; next_cursor: string | null }>(`/databases/${db}/query`, {
          method: "POST",
          body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        });
        for (const p of r.results) {
          const title = Object.values(p.properties).find((x) => x.type === "title");
          const name = normName(plainText(title));
          if (!name) continue;
          const sel = Object.entries(p.properties).find(([k, x]) => k.includes("담당") && x.type === "select")?.[1];
          const group = sel ? ((sel.select as { name?: string } | null)?.name ?? "") : "금액권";
          const id = p.id.replace(/-/g, "");
          const shareProp = Object.entries(p.properties).find(([k]) => k.includes("공유자"))?.[1];
          const sharers = shareProp ? parseSharers(plainText(shareProp)) : [];
          list.push({ id, name, group: group || "미지정", url: p.public_url || `${PUBLIC_SITE()}/${id}`, ...(sharers.length ? { sharers } : {}) });
        }
        cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
      } while (cursor);
    }
    cache = { at: Date.now(), list };
    return list;
  } catch (e) {
    console.error("validMembers", e);
    return null;
  }
}

/** 예약할 때: 유효 회원인지. 확인할 수 없으면(노션 연결 전) 막지 않는다. */
export async function isValidName(name: string): Promise<boolean> {
  const list = await validMembers();
  if (!list) return true;
  const n = normName(name);
  return list.some((m) => m.name === n || m.sharers?.some((x) => x.name === n));
}

/** 이 이름 + 뒷번호가 지점 누적 회원 DB에 있는지 */
export async function phoneMatches(name: string, last4: string): Promise<boolean> {
  if (process.env.DEMO_MODE === "1") return last4 === "1234";
  for (const b of BRANCHES.filter((b) => b.open || b.hidden)) {
    const ids = memberDbIdsOf(b);
    if (ids.length && (await findMember(ids, name, last4)).length) return true;
  }
  return false;
}

export function mask(name: string): string {
  const c = [...name];
  if (c.length <= 1) return name;
  if (c.length === 2) return c[0] + "*";
  return c[0] + "*".repeat(c.length - 2) + c[c.length - 1];
}

/** 여러 명을 가린 이름으로 보여줄 때, 가린 결과가 겹치면 겹치는 사람만 가운데 글자를 보여준다 */
export function maskAll(names: string[]): string[] {
  const m = names.map(mask);
  return names.map((n, i) => (m.filter((x) => x === m[i]).length > 1 ? n : m[i]));
}

// 한 번 확인한 기기를 기억하기 위한 서명값
const key = () =>
  crypto.createHash("sha256").update("member|" + (process.env.MANAGE_SECRET || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "ongi-demo")).digest();
const sig = (s: string) => crypto.createHmac("sha256", key()).update(s).digest("base64url").slice(0, 22);
export const memberToken = (id: string) => `${id}.${sig(id)}`;
export function readMemberToken(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const [id, s] = t.split(".");
  if (!id || !s) return null;
  const e = sig(id);
  return s.length === e.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e)) ? id : null;
}

// 이름을 화면에 그대로 보내지 않고 서명값으로 주고받기 위한 토큰
export const nameToken = (name: string) => {
  const id = Buffer.from(name, "utf8").toString("base64url");
  return `${id}.${sig("n|" + id)}`;
};
export function readNameToken(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const [id, s] = t.split(".");
  if (!id || !s) return null;
  const e = sig("n|" + id);
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  return Buffer.from(id, "base64url").toString("utf8");
}

// 지점 누적 회원 DB 전체의 '이름·연락처·DB' 목록 (5분 캐시)
type Entry = { name: string; phone: string; dbId: string };
let phoneCache: { at: number; list: Entry[] } | null = null;
async function phoneBook(): Promise<Entry[]> {
  if (process.env.DEMO_MODE === "1") return [{ name: "김온기", phone: "01012341234", dbId: "demo" }];
  if (phoneCache && Date.now() - phoneCache.at < 5 * 60_000) return phoneCache.list;
  const list: Entry[] = [];
  const ids = new Set<string>();
  for (const b of BRANCHES) for (const id of memberDbIdsOf(b)) ids.add(id);
  for (const db of ids) {
    const { titleProp, phoneProp } = await schemaOf(db);
    let cursor: string | undefined;
    do {
      const r = await notion<{ results: Page[]; has_more: boolean; next_cursor: string | null }>(`/databases/${db}/query`, {
        method: "POST",
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
      });
      for (const p of r.results) {
        const title = plainText(p.properties[titleProp]);
        const phone = (phoneProp ? plainText(p.properties[phoneProp]) : "").replace(/\D/g, "") || title.replace(/\D/g, "");
        const n = normName(title);
        if (!n || phone.length < 4) continue;
        list.push({ name: n, phone, dbId: db });
      }
      cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
    } while (cursor);
  }
  phoneCache = { at: Date.now(), list };
  return list;
}

/** 누적 회원 DB에서 뒷번호가 일치하는 회원: 이름 → 그 회원이 있는 DB들 */
export async function namesByLast4(last4: string): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (const e of await phoneBook()) {
    if (!e.phone.endsWith(last4)) continue;
    out.set(e.name, (out.get(e.name) ?? new Set()).add(e.dbId));
  }
  return out;
}

/** 담당 선생님(또는 금액권) 회원 중 뒷번호가 일치하는 회원 */
export async function findByLast4(group: string, last4: string): Promise<ValidMember[]> {
  const list = (await validMembers()) ?? [];
  const inGroup = list.filter((m) => m.group === group);
  // 금액권 공유자: 공유자 칸에 적힌 뒷번호로 들어오면 결제한 회원의 페이지를 함께 연다 (이름은 공유자 이름으로 표시)
  const shared = inGroup.flatMap((m) => (m.sharers ?? []).filter((x) => x.last4 === last4).map((x) => ({ ...m, name: x.name })));
  if (process.env.DEMO_MODE === "1") return [...(last4 === "1234" ? inGroup.slice(0, 1) : []), ...shared];
  const hits = await namesByLast4(last4);
  return [...inGroup.filter((m) => hits.has(m.name)), ...shared];
}

/** 회원 알림톡용: 이름 + 뒷번호로 누적 회원 DB의 전체 연락처를 찾는다 (없으면 빈 값) */
export async function fullPhoneOf(name: string, last4: string): Promise<string> {
  if (process.env.DEMO_MODE === "1") return "";
  const n = normName(name);
  try {
    return (await phoneBook()).find((e) => e.name === n && e.phone.endsWith(last4))?.phone ?? "";
  } catch {
    return "";
  }
}

/** 리마인드용: 이름(+뒷번호)으로 누적 회원 DB에서 찾은 서로 다른 전체 연락처들 */
export async function phonesFor(name: string, last4?: string): Promise<string[]> {
  const n = normName(name);
  const list = (await phoneBook()).filter((e) => e.name === n && (!last4 || e.phone.endsWith(last4)));
  return [...new Set(list.map((e) => e.phone))];
}
