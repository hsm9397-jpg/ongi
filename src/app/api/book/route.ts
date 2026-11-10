import { NextResponse } from "next/server";
import { BOOKING, calendarIdOf, getBranch, memberDbIdsOf } from "@/config/branches";
import { isValidName, readNameToken } from "@/lib/members";
import { pickTrainer } from "@/lib/availability";
import { carveOpen, createEvent } from "@/lib/google";
import { notify } from "@/lib/notify";
import { alimtalk } from "@/lib/alimtalk";
import { findMember } from "@/lib/notion";
import { isValidDate, kstDate } from "@/lib/time";
import { cleanMemo, cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

const fmtPhone = (d: string) => (d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d);

export async function POST(req: Request) {
  if (tooMany(`book:${clientIp(req)}`, 20)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "member" ? "member" : body.kind === "trial" ? "trial" : body.kind === "pt" ? "pt" : null;
  const branch = getBranch(String(body.branch ?? ""));
  const date = body.date;
  const hour = Number(body.hour);
  // 회원 예약은 이름 대신 /api/member가 준 서명값(who)으로 온다
  const name = body.kind === "member" && body.who ? cleanName(readNameToken(body.who) ?? "") : cleanName(body.name);
  if (!kind || !branch || !branch.open || branch.bookable === false || (kind === "pt") !== (branch.only === "pt") || !isValidDate(date) || !Number.isInteger(hour) || name.length < 2) {
    return NextResponse.json({ error: "예약 정보가 올바르지 않아요." }, { status: 400 });
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || kstDate(date, hour).getTime() - Date.now() < BOOKING.minLeadHours * 3_600_000) {
    return NextResponse.json({ error: `예약은 ${BOOKING.minLeadHours}시간 이후 운영 시간 안에서만 할 수 있어요.` }, { status: 400 });
  }

  let phone = "";
  let trainerId: string | undefined;
  let memberName = name;
  if (kind === "trial" || kind === "pt") {
    phone = digitsOnly(body.phone);
    if (phone.length < 10 || phone.length > 11) {
      return NextResponse.json({ error: "연락처를 정확히 입력해 주세요." }, { status: 400 });
    }
  } else {
    // 회원 예약은 서버에서 한 번 더 회원 확인
    const last4 = digitsOnly(body.last4);
    const m = last4.length === 4 ? await findMember(memberDbIdsOf(branch), name, last4) : [];
    if (!m.length) return NextResponse.json({ error: "회원 확인이 필요해요. 처음부터 다시 시도해 주세요." }, { status: 403 });
    memberName = m[0].name;
    if (!(await isValidName(memberName))) {
      return NextResponse.json({ error: "회원권이 만료되어 예약할 수 없어요. 재등록은 카카오톡 [온기pt]로 문의해 주세요." }, { status: 403 });
    }
    phone = last4;
    trainerId = typeof body.trainer === "string" ? body.trainer : undefined;
    if (!trainerId || !branch.trainers.some((t) => t.id === trainerId)) {
      return NextResponse.json({ error: "담당 선생님을 선택해 주세요." }, { status: 400 });
    }
  }

  try {
    const pick = await pickTrainer(branch, date, hour, trainerId, new Date(), kind === "member" ? BOOKING.memberDaysAhead : BOOKING.daysAhead);
    if (!pick) return NextResponse.json({ error: "방금 다른 예약이 들어왔어요. 다른 시간을 골라주세요." }, { status: 409 });
    const cal = calendarIdOf(pick.trainer)!;

    // 일정 제목은 기존 노션 '예약 분석' 집계 규칙과 같게: 체험='이름+뒷4자리 체험', 회원='이름' (회차는 담당자가 붙임)
    const summary = kind === "trial" ? `${name}${phone.slice(-4)} 체험` : kind === "pt" ? `${name}${phone.slice(-4)} PT상담` : `${memberName}${pick.trainer.memberSuffix ?? ""}`;
    const memo = cleanMemo(body.memo);
    const description = [
      `[홈페이지 예약] ${kind === "trial" ? "첫 방문 체험" : kind === "pt" ? "PT 상담·평가(무료)" : "회원 예약"}`,
      `지점: ${branch.name}`,
      kind !== "member" ? `연락처: ${fmtPhone(phone)}` : `연락처 뒷자리: ${phone}`,
      memo ? `요청사항: ${memo}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await createEvent(cal, { summary, start: pick.start, end: pick.end, description, kind, phone, name: memberName, branch: branch.id, colorId: kind === "member" ? pick.trainer.memberColor : undefined });
    await carveOpen(cal, pick.start, pick.end).catch((e) => console.error("carveOpen", e));
    await notify({
      type: "new",
      branchName: branch.name,
      trainer: pick.trainer,
      team: branch.trainers,
      name: memberName,
      kind,
      when: pick.start,
    });
    await alimtalk({ type: "new", branch, trainer: pick.trainer, name: memberName, phone, when: pick.start });

    return NextResponse.json({
      ok: true,
      booking: {
        kind,
        branchName: branch.name,
        date,
        hour,
        minutes: BOOKING.sessionMinutes,
        trainerName: pick.trainer.name,
        name: memberName,
      },
    });
  } catch (e) {
    console.error("book", e);
    return NextResponse.json({ error: "예약을 저장하지 못했어요. 잠시 후 다시 시도하거나 카카오채널로 문의해 주세요." }, { status: 502 });
  }
}
