import { NextResponse } from "next/server";
import { runAfterTrial } from "@/lib/afterTrial";
import { staffAuthorized } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron 10분마다: 끝난 체험 일정에 체험 후 안내 발송 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const fromCron = secret ? req.headers.get("authorization") === `Bearer ${secret}` : /vercel-cron/i.test(req.headers.get("user-agent") ?? "");
  if (!fromCron) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const items = await runAfterTrial({ send: true });
    return NextResponse.json({ sent: items.filter((i) => i.status === "sent").length });
  } catch (e) {
    console.error("cron/after-trial", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** 직원 화면: 오늘 체험자 목록과 발송 상태 (보내지 않음) */
export async function POST(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  try {
    return NextResponse.json({ items: await runAfterTrial({ send: false }) });
  } catch (e) {
    console.error("after-trial preview", e);
    return NextResponse.json({ error: "불러오지 못했어요." }, { status: 502 });
  }
}
