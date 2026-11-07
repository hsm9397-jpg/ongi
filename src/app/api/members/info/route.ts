import { NextResponse } from "next/server";
import { readMemberToken, validMembers } from "@/lib/members";
import { historyOf, remainingOf, walletOf } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** 이 폰에서 확인한 회원: 담당자, 등록 이력, 잔여 회차 또는 금액권 잔액 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = readMemberToken(body.token);
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const list = await validMembers();
  if (!list) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 502 });
  const m = list.find((x) => x.id === id);
  if (!m) return NextResponse.json({ expired: true });
  try {
    if (m.group === "금액권") {
      return NextResponse.json({ kind: "wallet", wallets: await walletOf(m.id) });
    }
    const [history, left] = await Promise.all([historyOf(m.name), remainingOf(m.name, m.id)]);
    return NextResponse.json({ kind: "sessions", trainer: m.group, history, remaining: left?.remaining ?? null, total: left?.total ?? null });
  } catch (e) {
    console.error("members/info", e);
    return NextResponse.json({ error: "회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
