import { NextResponse } from "next/server";
import { BRANCHES, memberDbIdsOf } from "@/config/branches";
import { findMember } from "@/lib/notion";
import { isValidName } from "@/lib/members";
import { guessTrainer } from "@/lib/availability";
import { cleanName, clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(`member:${clientIp(req)}`)) {
    return NextResponse.json({ error: "확인 시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  const last4 = digitsOnly(body.last4);
  if (name.length < 2 || last4.length !== 4) {
    return NextResponse.json({ error: "이름과 연락처 뒷 4자리를 입력해 주세요." }, { status: 400 });
  }
  try {
    const found = [];
    for (const b of BRANCHES.filter((b) => b.open)) {
      const ids = memberDbIdsOf(b);
      if (!ids.length) continue;
      const m = await findMember(ids, name, last4);
      if (m.length) {
        found.push({
          branch: b.id,
          branchName: b.name,
          name: m[0].name,
          trainerId: await guessTrainer(b, m[0].name).catch(() => undefined),
          trainers: b.trainers.map((t) => ({ id: t.id, name: t.name })),
        });
      }
    }
    if (!found.length) {
      return NextResponse.json(
        { error: "회원 정보를 찾지 못했어요. 이름과 연락처 뒷자리를 다시 확인하시거나 카카오채널 [온기pt]로 문의해 주세요." },
        { status: 404 }
      );
    }
    if (!(await isValidName(found[0].name))) {
      return NextResponse.json(
        { error: "회원권이 만료되어 예약할 수 없어요. 재등록은 카카오톡 [온기pt]로 문의해 주세요.", expired: true },
        { status: 403 }
      );
    }
    return NextResponse.json({ memberships: found });
  } catch (e) {
    console.error("member", e);
    return NextResponse.json({ error: "회원 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
