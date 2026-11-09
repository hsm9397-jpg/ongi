import { NextResponse } from "next/server";
import { BOOKING, calendarIdOf } from "@/config/branches";
import { pickTrainer } from "@/lib/availability";
import { carveOpen, createEvent, deleteEvent } from "@/lib/google";
import { loadOwned } from "@/lib/manage";
import { notify } from "@/lib/notify";
import { isValidDate, todayKst } from "@/lib/time";
import { cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(`mychg:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  const last4 = digitsOnly(body.last4);
  const date = body.date;
  const hour = Number(body.hour);
  if (!isValidDate(date) || !Number.isInteger(hour)) return NextResponse.json({ error: "바꿀 날짜와 시간을 골라주세요." }, { status: 400 });
  try {
    const r = await loadOwned(body.token, name, last4, "change");
    if ("error" in r) return NextResponse.json({ error: r.error, contact: "contact" in r ? r.contact : undefined }, { status: r.status });
    if (r.branch.bookable === false) return NextResponse.json({ error: "이 지점은 현재 온라인 예약을 받지 않아요. 카카오톡으로 문의해 주세요." }, { status: 400 });
    const kind = r.ev.props?.kind === "member" ? "member" : r.ev.props?.kind === "pt" ? "pt" : "trial";
    // 회원은 같은 담당 선생님으로만. 체험은 같은 선생님을 먼저, 안 되면 같은 지점의 비어 있는 선생님
    const pick =
      (await pickTrainer(r.branch, date, hour, r.trainer.id, new Date(), kind === "member" ? BOOKING.memberDaysAhead : BOOKING.daysAhead, kind === "member" ? BOOKING.memberChangeLeadHours : BOOKING.minLeadHours)) ??
      (kind === "trial" ? await pickTrainer(r.branch, date, hour) : null);
    if (!pick) return NextResponse.json({ error: "그 시간은 예약이 어려워요. 다른 시간을 골라주세요." }, { status: 409 });
    const cal = calendarIdOf(pick.trainer)!;
    const props = r.ev.props ?? {};
    await createEvent(cal, {
      summary: r.ev.summary,
      start: pick.start,
      end: pick.end,
      description: `${r.ev.description ?? ""}\n(홈페이지에서 고객이 시간 변경)`.trim(),
      kind,
      phone: props.phone ?? last4,
      name: props.name ?? name,
      branch: r.branch.id,
      // 같은 날 두 번째 변경을 막기 위해 변경한 날짜를 남김
      extra: kind === "member" ? { chgDate: todayKst() } : undefined,
    });
    await carveOpen(cal, pick.start, pick.end).catch((e) => console.error("carveOpen", e));
    await deleteEvent(r.calendarId, r.eventId);
    await notify({ type: "change", branchName: r.branch.name, trainer: pick.trainer, oldTrainer: r.trainer, team: r.branch.trainers, name: props.name ?? name, kind, when: pick.start, oldWhen: r.ev.start });
    return NextResponse.json({ ok: true, booking: { date, hour, minutes: BOOKING.sessionMinutes, trainerName: pick.trainer.name, branchName: r.branch.name } });
  } catch (e) {
    console.error("my/change", e);
    return NextResponse.json({ error: "변경하지 못했어요. 잠시 후 다시 시도하거나 카카오톡으로 문의해 주세요." }, { status: 502 });
  }
}
