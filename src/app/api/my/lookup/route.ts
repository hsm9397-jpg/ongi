import { NextResponse } from "next/server";
import { findBookings } from "@/lib/manage";
import { cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(`my:${clientIp(req)}`, 15)) {
    return NextResponse.json({ error: "조회 시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  const last4 = digitsOnly(body.last4);
  if (last4.length !== 4) {
    return NextResponse.json({ error: "연락처 뒷 4자리를 입력해 주세요." }, { status: 400 });
  }
  try {
    const bookings = await findBookings(name.length >= 2 ? name : "", last4);
    return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("my/lookup", e);
    return NextResponse.json({ error: "예약을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
