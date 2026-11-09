import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staffAuth";
import { readVisits, visitsReady } from "@/lib/visits";
import { addDays, todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 직원 화면: 최근 30일 일별 방문자와 누적 */
export async function GET(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  if (process.env.DEMO_MODE === "1") {
    const t = todayKst();
    const days = Array.from({ length: 30 }, (_, i) => ({ date: addDays(t, -i), visitors: 40 - i, views: 90 - i * 2 }));
    return NextResponse.json({ ready: true, days, total: 1234, totalViews: 3456, since: "2026-11-09" });
  }
  if (!visitsReady()) return NextResponse.json({ ready: false });
  try {
    const t = todayKst();
    const r = await readVisits(Array.from({ length: 30 }, (_, i) => addDays(t, -i)));
    return NextResponse.json({ ready: true, ...r });
  } catch (e) {
    console.error("staff/visits", e);
    return NextResponse.json({ error: "방문자 수를 불러오지 못했어요." }, { status: 502 });
  }
}
