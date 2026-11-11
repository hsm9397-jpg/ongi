import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staffAuth";
import { SECTION_LABEL, readInsight } from "@/lib/insight";
import { visitsReady } from "@/lib/visits";
import { addDays, todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 직원 화면: 방문자 인사이트 (days=1|7|30) */
export async function GET(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  const days = [1, 7, 30].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 7;
  if (process.env.DEMO_MODE === "1") {
    return NextResponse.json({
      ready: true, days, sessions: 120, homeViews: 150,
      refs: [{ name: "네이버", n: 60 }, { name: "인스타그램", n: 40 }, { name: "직접", n: 30 }, { name: "카카오톡", n: 20 }],
      pages: [{ path: "/", views: 150, avgSec: 74 }, { path: "/member", views: 40, avgSec: 52 }, { path: "/price", views: 12, avgSec: 31 }],
      clicks: [{ path: "/", label: "체험 예약하기", n: 45 }, { path: "/", label: "네이버 예약 · 선릉점", n: 22 }, { path: "/", label: "카카오톡 문의", n: 18 }],
      videos: [{ name: "전체 과정(재확인)", plays: 18, ends: 7 }, { name: "근막이완 소개", plays: 25, ends: 9 }],
      sections: [["top", 120, 12], ["about", 90, 9], ["method", 80, 15], ["reviews", 70, 21], ["branches", 65, 18], ["price", 60, 14], ["book", 55, 25]].map(([id, reach, avgSec]) => ({ id, label: SECTION_LABEL[String(id)] ?? String(id), reach, avgSec, totalSec: 0 })),
    });
  }
  if (!visitsReady()) return NextResponse.json({ ready: false });
  try {
    const t = todayKst();
    const r = await readInsight(Array.from({ length: days }, (_, i) => addDays(t, -i)));
    return NextResponse.json({ ready: true, days, ...r });
  } catch (e) {
    console.error("staff/insight", e);
    return NextResponse.json({ error: "인사이트를 불러오지 못했어요." }, { status: 502 });
  }
}
