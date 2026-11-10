// 고객의 소리(VoC): 노션 '📜 VoC (고객의 소리)' DB를 읽기만 한다 (2026-11-10 대표)
import { notion, plainText } from "./notion";

type Prop = { type: string; [k: string]: unknown };
type Row = { id: string; url?: string; created_time: string; properties: Record<string, Prop> };
export type Voc = { id: string; url: string; title: string; content: string; type: string; branch: string; priority: string; created: string };

const DB = () => process.env.NOTION_VOC_DB || "4aedf87bbf11476486b99706c2b8581b";
const sel = (p?: Prop) => ((p?.select as { name?: string } | null)?.name ?? "");

let cache: { at: number; list: Voc[] } | null = null;
export async function vocList(fresh = false): Promise<Voc[]> {
  if (process.env.DEMO_MODE === "1") {
    return [
      { id: "1", url: "#", title: "", content: "선생님이 너무 친절하시고 꼼꼼하게 봐주셨어요. 몸이 한결 가벼워졌어요.", type: "좋았어요", branch: "선릉점", priority: "", created: "2026-11-09T04:49:04Z" },
      { id: "2", url: "#", title: "", content: "주차가 조금 불편했어요.", type: "아쉬웠어요", branch: "선릉점", priority: "보통", created: "2026-11-09T07:57:49Z" },
      { id: "3", url: "#", title: "", content: "공간이 아늑하고 편안했어요.", type: "좋았어요", branch: "온기 근막이완 더프라이빗", priority: "", created: "2026-11-08T12:11:50Z" },
    ];
  }
  if (!fresh && cache && Date.now() - cache.at < 2 * 60_000) return cache.list;
  const out: Voc[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion<{ results: Row[]; has_more: boolean; next_cursor: string | null }>(`/databases/${DB()}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100, sorts: [{ timestamp: "created_time", direction: "descending" }], ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    for (const row of r.results) {
      const p = row.properties;
      out.push({
        id: row.id,
        url: row.url ?? `https://www.notion.so/${row.id.replace(/-/g, "")}`,
        title: plainText(p["제목"]),
        content: plainText(p["내용"]),
        type: sel(p["유형"]),
        branch: sel(p["지점"]),
        priority: sel(p["우선순위"]),
        created: row.created_time,
      });
    }
    cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
  } while (cursor && out.length < 1000);
  cache = { at: Date.now(), list: out };
  return out;
}
