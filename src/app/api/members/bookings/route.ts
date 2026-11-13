import { NextResponse } from "next/server";
import { phoneMatches, readMemberToken, validMembers } from "@/lib/members";
import { myUpcoming } from "@/lib/manage";
import { readMemberLog } from "@/lib/memberLog";
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
  // 예전에 로그인해 뒷번호가 저장 안 된 폰: 한 번만 번호를 확인한다
  if (body.check) {
    const ok = (await phoneMatches(m.name, last4)) || (m.sharers ?? []).some((x) => x.last4 === last4);
    if (!ok) return NextResponse.json({ error: "번호가 맞지 않아요. 다시 확인해 주세요." }, { status: 400 });
  }
  try {
    const same = list.filter((x) => normName(x.name) === normName(m.name)).length;
    const [items, history] = await Promise.all([myUpcoming(m.name, last4, same), readMemberLog(m.name, last4).catch(() => [])]);
    return NextResponse.json({ items, history }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("members/bookings", e);
    return NextResponse.json({ error: "예약을 불러오지 못했어요." }, { status: 502 });
  }
}
