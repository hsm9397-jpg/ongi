import { NextResponse } from "next/server";
import { memberToken, phoneMatches, validMembers } from "@/lib/members";
import { clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** 이름(목록에서 고른 것) + 뒷번호 4자리 확인 → 회원 페이지 주소 */
export async function POST(req: Request) {
  if (tooMany(`mopen:${clientIp(req)}`, 8)) {
    return NextResponse.json({ error: "시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const last4 = digitsOnly(body.last4);
  const list = await validMembers();
  const m = list?.find((x) => x.id === body.id);
  if (!m || last4.length !== 4) return NextResponse.json({ error: "다시 시도해 주세요." }, { status: 400 });
  if (!(await phoneMatches(m.name, last4))) {
    return NextResponse.json({ error: "연락처 뒷번호가 맞지 않아요. 다시 확인하시거나 카카오톡으로 문의해 주세요." }, { status: 403 });
  }
  return NextResponse.json({ name: m.name, url: m.url, token: memberToken(m.id) });
}
