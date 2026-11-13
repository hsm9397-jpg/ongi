import { NextResponse } from "next/server";
import { deleteEvent } from "@/lib/google";
import { loadOwned } from "@/lib/manage";
import { readNameToken } from "@/lib/members";
import { notify } from "@/lib/notify";
import { alimtalk } from "@/lib/alimtalk";
import { logMember } from "@/lib/memberLog";
import { kstHourMinute, todayKst } from "@/lib/time";
import { cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(`mychg:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.who ? readNameToken(body.who) ?? "" : body.name);
  const last4 = digitsOnly(body.last4);
  try {
    const r = await loadOwned(body.token, name, last4);
    if ("error" in r) return NextResponse.json({ error: r.error, contact: "contact" in r ? r.contact : undefined }, { status: r.status });
    await deleteEvent(r.calendarId, r.eventId);
    if (r.ev.props?.kind === "member") {
      const sameDay = kstHourMinute(r.ev.start).date === todayKst();
      await logMember(r.ev.props?.name ?? name, r.ev.props?.phone ?? last4, { t: "cancel", when: r.ev.start, sameDay, branch: r.branch.short, trainer: r.trainer.name });
    }
    await notify({ type: "cancel", branchName: r.branch.name, trainer: r.trainer, team: r.branch.trainers, name: r.ev.props?.name ?? name, kind: r.ev.props?.kind ?? "", when: r.ev.start });
    await alimtalk({ type: "cancel", branch: r.branch, trainer: r.trainer, name: r.ev.props?.name ?? name, phone: r.ev.props?.phone ?? last4, when: r.ev.start });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("my/cancel", e);
    return NextResponse.json({ error: "취소하지 못했어요. 잠시 후 다시 시도하거나 카카오톡으로 문의해 주세요." }, { status: 502 });
  }
}
