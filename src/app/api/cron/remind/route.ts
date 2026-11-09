import { NextResponse } from "next/server";
import { lastRemind, runRemind } from "@/lib/remind";
import { staffAuthorized } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron이 매일 호출 → 내일 예약자에게 리마인드 발송 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const fromCron = secret ? req.headers.get("authorization") === `Bearer ${secret}` : /vercel-cron/i.test(req.headers.get("user-agent") ?? "");
  if (!fromCron) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const r = await runRemind({ dry: false });
    return NextResponse.json({ date: r.date, sent: r.items.filter((i) => i.status === "sent").length, skipped: r.items.filter((i) => i.status !== "sent").length });
  } catch (e) {
    console.error("cron/remind", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** 직원 화면: 내일 리마인드 미리보기(보내지 않음) + 마지막 발송 결과 */
export async function POST(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  try {
    const [preview, last] = await Promise.all([runRemind({ dry: true }), lastRemind()]);
    return NextResponse.json({ preview, last });
  } catch (e) {
    console.error("remind preview", e);
    return NextResponse.json({ error: "불러오지 못했어요." }, { status: 502 });
  }
}
