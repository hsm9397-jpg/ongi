import { NextResponse } from "next/server";
import { recordClick, recordVisit, visitsReady } from "@/lib/visits";
import { BRANCHES } from "@/config/branches";
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
  const body = (await req.json().catch(() => null)) as { href?: string } | null;
  try {
    if (body?.href) {
      // 네이버 예약 버튼 클릭: 주소로 지점·종류를 찾는다
      const h = String(body.href).slice(0, 300);
      const b = BRANCHES.find((x) => x.naverTrial && h.startsWith(x.naverTrial));
      const pt = BRANCHES.find((x) => x.naverPt && h.startsWith(x.naverPt));
      if (b) await recordClick(todayKst(), "trial", b.id);
      else if (pt) await recordClick(todayKst(), "pt", pt.id);
      return new NextResponse(null, { status: 204 });
    }
    await recordVisit(todayKst(), ip, ua);
  } catch (e) {
    console.error("visit", e);
  }
  return new NextResponse(null, { status: 204 });
}
