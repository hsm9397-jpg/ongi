// 사이트 방문자 수: Vercel Storage의 Upstash Redis(무료)에 하루 단위로 센다.
// 같은 기기(IP+브라우저)는 하루에 한 번만 방문자로 센다. 페이지 조회수는 따로 센다.
import crypto from "node:crypto";

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const visitsReady = () => !!(url() && token());

async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const r = await fetch(`${url()}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const j = (await r.json()) as { result?: unknown; error?: string }[];
  return j.map((x) => x.result);
}

export async function recordVisit(date: string, ip: string, ua: string) {
  const who = crypto.createHash("sha256").update(`${date}|${ip}|${ua}`).digest("base64url").slice(0, 16);
  const [first] = await pipeline([
    ["SET", `v:seen:${date}:${who}`, "1", "NX", "EX", 172800],
    ["INCR", `v:pv:${date}`],
    ["INCR", "v:pv:total"],
  ]);
  if (first === "OK") await pipeline([["INCR", `v:day:${date}`], ["INCR", "v:total"], ["SETNX", "v:since", date]]);
}

export async function readVisits(dates: string[]) {
  const res = await pipeline([
    ...dates.flatMap((d) => [["GET", `v:day:${d}`], ["GET", `v:pv:${d}`]]),
    ["GET", "v:total"],
    ["GET", "v:pv:total"],
    ["GET", "v:since"],
  ]);
  const n = (x: unknown) => Number(x ?? 0) || 0;
  return {
    days: dates.map((d, i) => ({ date: d, visitors: n(res[i * 2]), views: n(res[i * 2 + 1]) })),
    total: n(res[dates.length * 2]),
    totalViews: n(res[dates.length * 2 + 1]),
    since: (res[dates.length * 2 + 2] as string | null) ?? null,
  };
}
