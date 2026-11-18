import { NextResponse } from "next/server";
import { readNameToken, splitWho, validMembers } from "@/lib/members";
import { remainingOf } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** 회원 확인 뒤 따로 불러오는 잔여 회차 (예약 화면이 이걸 기다리지 않게 분리) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = splitWho(readNameToken(body.who)).name;
  if (!name) return NextResponse.json({ remaining: null });
  const vm = (await validMembers())?.find((m) => m.name === name && m.group !== "금액권");
  const left = vm ? await remainingOf(name, vm.id) : null;
  return NextResponse.json({ remaining: left?.remaining ?? null, total: left?.total ?? null });
}
