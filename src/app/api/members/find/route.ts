import { NextResponse } from "next/server";
import { findByLast4, maskAll, memberToken } from "@/lib/members";
import { clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** 선생님 + 뒷번호 4자리 → 해당 회원(실명)과 바로 열 수 있는 열쇠 */
export async function POST(req: Request) {
  if (tooMany(`mfind:${clientIp(req)}`, 10)) {
    return NextResponse.json({ error: "시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const group = typeof body.group === "string" ? body.group.slice(0, 20) : "";
  const last4 = digitsOnly(body.last4);
  if (!group || last4.length !== 4) return NextResponse.json({ error: "뒷번호 4자리를 입력해 주세요." }, { status: 400 });
  try {
    const found = await findByLast4(group, last4);
    const labels = maskAll(found.map((m) => m.name));
    return NextResponse.json({ items: found.map((m, i) => ({ name: labels[i], url: m.url, token: memberToken(m.id) })) });
  } catch (e) {
    console.error("members/find", e);
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
