import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staffAuth";
import { readClicks, readVisits, visitsReady } from "@/lib/visits";
import { BRANCHES } from "@/config/branches";
import { addDays, todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 직원 화면: 최근 30일 일별 방문자와 누적 */
export async function GET(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  if (process.env.DEMO_MODE === "1") {
    const t = todayKst();
    const days = Array.from({ length: 30 }, (_, i) => ({ date: addDays(t, -i), visitors: 40 - i, views: 90 - i * 2 }));
    const clicks = { trial: { days: days.map((_, i) => 8 - (i % 5)), total: 120, todayByBranch: { sl: 3, sbp: 2, priv: 2, main: 1 } }, pt: { days: days.map(() => 1), total: 15, todayByBranch: { pt: 1 } } };
    return NextResponse.json({ ready: true, days, total: 1234, totalViews: 3456, since: "2026-11-09", clicks, branchNames: Object.fromEntries(BRANCHES.map((b) => [b.id, b.short])) });
  }
  if (!visitsReady()) return NextResponse.json({ ready: false });
  try {
    const t = todayKst();
    const dates = Array.from({ length: 30 }, (_, i) => addDays(t, -i));
    const [r, clicks] = await Promise.all([readVisits(dates), readClicks(dates).catch(() => null)]);
    return NextResponse.json({ ready: true, ...r, clicks, branchNames: Object.fromEntries(BRANCHES.map((b) => [b.id, b.short])) });
  } catch (e) {
    console.error("staff/visits", e);
    return NextResponse.json({ error: "방문자 수를 불러오지 못했어요." }, { status: 502 });
  }
}
