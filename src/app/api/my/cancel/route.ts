import { NextResponse } from "next/server";
import { deleteEvent } from "@/lib/google";
import { loadOwned } from "@/lib/manage";
import { notify } from "@/lib/notify";
import { cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(`mychg:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  const last4 = digitsOnly(body.last4);
  try {
    const r = await loadOwned(body.token, name, last4);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    await deleteEvent(r.calendarId, r.eventId);
    await notify({ type: "cancel", branchName: r.branch.name, trainer: r.trainer, name: r.ev.props?.name ?? name, kind: r.ev.props?.kind ?? "", when: r.ev.start });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("my/cancel", e);
    return NextResponse.json({ error: "취소하지 못했어요. 잠시 후 다시 시도하거나 카카오톡으로 문의해 주세요." }, { status: 502 });
  }
}
