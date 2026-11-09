import { NextResponse } from "next/server";
import { recordVisit, visitsReady } from "@/lib/visits";
import { todayKst } from "@/lib/time";
import { clientIp, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|yeti|daum|facebookexternalhit|kakaotalk-scrap|preview|headless|lighthouse/i;

/** 페이지를 열 때마다 한 번 호출: 방문자·조회수 기록 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!visitsReady() || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = clientIp(req);
  if (tooMany(`visit:${ip}`, 60)) return new NextResponse(null, { status: 204 });
  try {
    await recordVisit(todayKst(), ip, ua);
  } catch (e) {
    console.error("visit", e);
  }
  return new NextResponse(null, { status: 204 });
}
