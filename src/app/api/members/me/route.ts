import { NextResponse } from "next/server";
import { nameToken, readMemberSharer, readMemberToken, validMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

/** 기억해 둔 기기: 아직 유효 회원이면 페이지 주소를 다시 준다 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = readMemberToken(body.token);
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const list = await validMembers();
  if (!list) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  const m = list.find((x) => x.id === id);
  if (!m) return NextResponse.json({ expired: true });
  // 공유자로 로그인한 기기면 예약할 때 공유자 이름이 일정에 함께 남도록 "주인|공유자"로 준다
  const as = readMemberSharer(body.token);
  return NextResponse.json({ name: m.name, url: m.url, who: nameToken(as ? `${m.name}|${as}` : m.name) });
}
