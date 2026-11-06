import { NextResponse } from "next/server";
import { mask, validMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

/** 담당 선생님별 회원 이름(가운데 가림) */
export async function GET(req: Request) {
  const group = new URL(req.url).searchParams.get("group") || "";
  const list = await validMembers();
  if (!list) return NextResponse.json({ error: "회원 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  const items = list
    .filter((m) => m.group === group)
    .map((m) => ({ id: m.id, label: mask(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  return NextResponse.json({ items });
}
