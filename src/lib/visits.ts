// 사이트 방문자 수: Vercel Storage의 Upstash Redis(무료)에 하루 단위로 센다.
// 같은 기기(IP+브라우저)는 하루에 한 번만 방문자로 센다. 페이지 조회수는 따로 센다.
import crypto from "node:crypto";

// Vercel에서 연결할 때 붙는 이름 앞부분(KV_, STORAGE_ 등)이 달라도 찾는다: 값이 https://…upstash.io 인 변수를 주소로 보고
// 같은 앞부분의 …TOKEN(읽기 전용 제외)을 열쇠로 쓴다
function conn(): { url: string; token: string } {
  const env = Object.entries(process.env).filter(([, v]) => !!v) as [string, string][];
  const u = env.find(([k, v]) => /^https:\/\/[^\s]+\.upstash\.io/.test(v) && /URL$/.test(k));
  if (!u) return { url: "", token: "" };
  const base = u[0].replace(/(_REST_API_URL|_REDIS_REST_URL|_REST_URL|_URL)$/, "");
  const t = env.find(([k]) => k.startsWith(base) && /TOKEN$/.test(k) && !/READ_ONLY/.test(k));
  return { url: u[1].replace(/\/$/, ""), token: t?.[1] ?? "" };
}
const url = () => conn().url;
const token = () => conn().token;
export const visitsReady = () => !!(url() && token());

export async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
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
