// 노션 회원 DB 조회. 회차·회원권은 담당자가 노션에서 직접 관리하므로 여기서는 '읽기'만 합니다.
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

type Prop = { type: string; [k: string]: unknown };

export async function notion<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN 환경변수가 없습니다.");
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`노션 API 오류 ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// DB마다 제목 칸 이름이 '이름' 또는 '회원명'으로 달라서 스키마를 읽어 찾는다.
const schemaCache = new Map<string, { titleProp: string; phoneProp?: string }>();

export async function schemaOf(dbId: string) {
  const hit = schemaCache.get(dbId);
  if (hit) return hit;
  const db = await notion<{ properties: Record<string, Prop> }>(`/databases/${dbId}`);
  const entries = Object.entries(db.properties);
  const titleProp = entries.find(([, p]) => p.type === "title")?.[0] ?? "이름";
  const phoneProp =
    entries.find(([n, p]) => p.type === "phone_number" || (n.includes("연락처") && p.type === "rich_text"))?.[0] ??
    entries.find(([n]) => n.includes("전화"))?.[0];
  const s = { titleProp, phoneProp };
  schemaCache.set(dbId, s);
  return s;
}

export function plainText(p: Prop | undefined): string {
  if (!p) return "";
  if (p.type === "phone_number") return (p.phone_number as string | null) ?? "";
  if (p.type === "rich_text" || p.type === "title") {
    return ((p[p.type] as { plain_text: string }[]) ?? []).map((t) => t.plain_text).join("");
  }
  return "";
}

const digits = (s: string) => s.replace(/\D/g, "");
/** "이경신 회원님", "윤유진님", "홍길동6135" → "이경신" */
export const normName = (s: string) =>
  s.replace(/\(.*?\)/g, "").replace(/\d/g, "").replace(/\s+/g, "").replace(/(회원님|회원|님)$/, "");

export type MemberMatch = { dbId: string; pageId: string; name: string };

/** 이름 + 연락처 뒷 4자리로 회원을 찾는다. 일치하는 회원 페이지 목록을 돌려준다. */
export async function findMember(dbIds: string[], name: string, last4: string): Promise<MemberMatch[]> {
  if (process.env.DEMO_MODE === "1") {
    // 예시 회원: 김온기 / 1234 (각 지점 첫 번째 DB에서 찾은 것으로 처리)
    return normName(name) === "김온기" && last4 === "1234" && dbIds.length ? [{ dbId: dbIds[0], pageId: "demo", name: "김온기" }] : [];
  }
  const want = normName(name);
  const matches: MemberMatch[] = [];
  for (const dbId of dbIds) {
    const { titleProp, phoneProp } = await schemaOf(dbId);
    const res = await notion<{ results: { id: string; properties: Record<string, Prop> }[] }>(`/databases/${dbId}/query`, {
      method: "POST",
      body: JSON.stringify({ filter: { property: titleProp, title: { contains: name.trim().slice(0, 10) } }, page_size: 50 }),
    });
    for (const page of res.results) {
      const title = plainText(page.properties[titleProp]);
      // 제목에 '홍길동6135' 처럼 뒷자리를 붙여 쓰는 경우도 있어서 제목 숫자도 함께 본다
      const phone = digits(phoneProp ? plainText(page.properties[phoneProp]) : "") || digits(title);
      if (normName(title.replace(/\d/g, "")) === want && phone.endsWith(last4)) {
        matches.push({ dbId, pageId: page.id, name: title.replace(/\d/g, "").trim() });
      }
    }
  }
  return matches;
}
