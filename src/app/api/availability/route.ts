import { NextRequest, NextResponse } from "next/server";
import { getBranch } from "@/config/branches";
import { getAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branch") ?? "";
  const trainer = req.nextUrl.searchParams.get("trainer") ?? undefined;
  const branch = getBranch(branchId);
  if (!branch || !branch.open) return NextResponse.json({ error: "지점을 찾을 수 없어요." }, { status: 400 });
  if (branch.bookable === false) return NextResponse.json({ error: "이 지점은 현재 온라인 예약을 받지 않아요." }, { status: 400 });
  if (trainer && !branch.trainers.some((t) => t.id === trainer)) {
    return NextResponse.json({ error: "담당 선생님 정보가 맞지 않아요." }, { status: 400 });
  }
  try {
    const days = await getAvailability(branch, trainer);
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("availability", e);
    return NextResponse.json({ error: "예약 가능한 시간을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
