import { NextResponse } from "next/server";
import { readMemberToken, validMembers } from "@/lib/members";
import { myUpcoming } from "@/lib/manage";
import { normName } from "@/lib/notion";
import { clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** 회원 페이지: 본인 확인된 기기에서 다가오는 내 예약 */
export async function POST(req: Request) {
  if (tooMany(`mybk:${clientIp(req)}`, 30)) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const id = readMemberToken(body.token);
  const last4 = digitsOnly(body.last4);
  if (!id || last4.length !== 4) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const list = await validMembers();
  if (!list) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  const m = list.find((x) => x.id === id);
  if (!m) return NextResponse.json({ expired: true });
  try {
    const same = list.filter((x) => normName(x.name) === normName(m.name)).length;
    const items = await myUpcoming(m.name, last4, same);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("members/bookings", e);
    return NextResponse.json({ error: "예약을 불러오지 못했어요." }, { status: 502 });
  }
}
