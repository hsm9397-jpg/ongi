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
  const err = j.find((x) => x?.error)?.error;
  if (err && /max requests limit|limit exceeded/i.test(err)) throw new Error(`redis limit: ${err}`);
  return j.map((x) => x.result);
}

// 무료 Upstash는 한 달 명령 50만 개 제한: 여러 명령을 스크립트 하나(EVAL)로 묶어 1개로 센다 (2026-11-26 한도 초과 뒤)
const HINCR_LUA = `local ttl = tonumber(ARGV[1])
for i = 2, #ARGV, 3 do redis.call('HINCRBY', KEYS[tonumber(ARGV[i])], ARGV[i + 1], tonumber(ARGV[i + 2])) end
if ttl > 0 then for i = 1, #KEYS do redis.call('EXPIRE', KEYS[i], ttl) end end
return 1`;

/** 해시 칸 여러 개를 한 번에 더한다: ops = [키, 칸, 더할 수] */
export async function hincrMany(ops: [string, string, number][], ttl = 0) {
  if (!ops.length) return;
  const keys: string[] = [];
  const argv: (string | number)[] = [ttl];
  for (const [k, f, n] of ops) {
    let i = keys.indexOf(k);
    if (i < 0) i = keys.push(k) - 1;
    argv.push(i + 1, f, n);
  }
  await pipeline([["EVAL", HINCR_LUA, keys.length, ...keys, ...argv]]);
}

const VISIT_LUA = `redis.call('INCR', KEYS[2]); redis.call('INCR', KEYS[3])
if redis.call('SET', KEYS[1], '1', 'NX', 'EX', 172800) then
  redis.call('INCR', KEYS[4]); redis.call('INCR', KEYS[5]); redis.call('SETNX', KEYS[6], ARGV[1])
end
return 1`;

export async function recordVisit(date: string, ip: string, ua: string) {
  const who = crypto.createHash("sha256").update(`${date}|${ip}|${ua}`).digest("base64url").slice(0, 16);
  await pipeline([["EVAL", VISIT_LUA, 6, `v:seen:${date}:${who}`, `v:pv:${date}`, "v:pv:total", `v:day:${date}`, "v:total", "v:since", date]]);
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

const CLICK_LUA = `redis.call('INCR', KEYS[1]); redis.call('INCR', KEYS[2])
redis.call('HINCRBY', KEYS[3], ARGV[1], 1); redis.call('EXPIRE', KEYS[3], 3456000)
return 1`;

/** 네이버 예약 버튼 클릭 (체험·PT 상담). kind: trial|pt, branch: 지점 id */
export async function recordClick(date: string, kind: string, branch: string) {
  await pipeline([["EVAL", CLICK_LUA, 3, `c:${kind}:${date}`, `c:${kind}:total`, `c:${kind}:br:${date}`, branch]]);
}

export async function readClicks(dates: string[]) {
  const kinds = ["trial", "pt"];
  const res = await pipeline([
    ...kinds.flatMap((k) => [...dates.map((d) => ["GET", `c:${k}:${d}`]), ["GET", `c:${k}:total`], ["HGETALL", `c:${k}:br:${dates[0]}`]]),
  ]);
  const n = (x: unknown) => Number(x ?? 0) || 0;
  const out: Record<string, { days: number[]; total: number; todayByBranch: Record<string, number> }> = {};
  kinds.forEach((k, ki) => {
    const off = ki * (dates.length + 2);
    const h = (res[off + dates.length + 1] as string[] | null) ?? [];
    const by: Record<string, number> = {};
    for (let i = 0; i + 1 < h.length; i += 2) by[h[i]] = n(h[i + 1]);
    out[k] = { days: dates.map((_, i) => n(res[off + i])), total: n(res[off + dates.length]), todayByBranch: by };
  });
  return out;
}
