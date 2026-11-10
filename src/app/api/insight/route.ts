import { NextResponse } from "next/server";
import { recordInsight, type InsightEvent } from "@/lib/insight";
import { visitsReady } from "@/lib/visits";
import { todayKst } from "@/lib/time";
import { clientIp, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";
const BOT = /bot|crawl|spider|slurp|yeti|daum|facebookexternalhit|kakaotalk-scrap|preview|headless|lighthouse/i;

/** 방문자 행동 기록 (페이지 열림·클릭·머문 시간). 개인정보는 받지 않음 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!visitsReady() || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  if (tooMany(`ins:${clientIp(req)}`, 200)) return new NextResponse(null, { status: 204 });
  try {
    const body = (await req.json().catch(() => null)) as { events?: InsightEvent[] } | InsightEvent | null;
    const list = (body && "events" in body ? body.events : body ? [body as InsightEvent] : []) ?? [];
    const date = todayKst();
    for (const e of list.slice(0, 20)) if (e && ["view", "click", "dwell"].includes(e.t)) await recordInsight(date, e);
  } catch (e) {
    console.error("insight", e);
  }
  return new NextResponse(null, { status: 204 });
}
