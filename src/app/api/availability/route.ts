import { NextRequest, NextResponse } from "next/server";
import { BOOKING, getBranch } from "@/config/branches";
import { getAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branch") ?? "";
  const trainer = req.nextUrl.searchParams.get("trainer") ?? undefined;
  const branch = getBranch(branchId);
  if (!branch || !branch.open) return NextResponse.json({ error: "지점을 찾을 수 없어요." }, { status: 400 });
  if (trainer && !branch.trainers.some((t) => t.id === trainer)) {
    return NextResponse.json({ error: "담당 선생님 정보가 맞지 않아요." }, { status: 400 });
  }
  try {
    // 담당 선생님을 지정하는 건 기존 회원 예약뿐 → 2주까지만
    const days = await getAvailability(branch, trainer, new Date(), trainer ? BOOKING.memberDaysAhead : BOOKING.daysAhead);
    // 예약 중지 지점은 달력은 보여주되 모든 시간을 마감으로
    if (branch.bookable === false) for (const k of Object.keys(days)) days[k] = days[k].map((s) => ({ ...s, available: false }));
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("availability", e);
    return NextResponse.json({ error: "예약 가능한 시간을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
