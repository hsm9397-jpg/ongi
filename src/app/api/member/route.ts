import { NextResponse } from "next/server";
import { BRANCHES, memberDbIdsOf } from "@/config/branches";
import { isValidName, mask, maskAll, namesByLast4, nameToken, readNameToken, validMembers } from "@/lib/members";
import { normName } from "@/lib/notion";
import { guessTrainer } from "@/lib/availability";
import { clientIp, digitsOnly, tooMany } from "@/lib/validate";

export const dynamic = "force-dynamic";

// 기존 회원 확인: 연락처 뒷 4자리만으로 찾는다. (2026-11-06 대표 결정: 이름 입력 생략)
// 같은 뒷번호 회원이 여럿이면 가린 이름으로 고르게 하고, 실제 이름은 서명값(who)으로만 주고받는다.
export async function POST(req: Request) {
  if (tooMany(`member:${clientIp(req)}`)) {
    return NextResponse.json({ error: "확인 시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const last4 = digitsOnly(body.last4);
  if (last4.length !== 4) {
    return NextResponse.json({ error: "연락처 뒷 4자리를 입력해 주세요." }, { status: 400 });
  }
  const picked = body.who ? readNameToken(body.who) : null;
  try {
    const hits = await namesByLast4(last4);
    if (picked) for (const n of [...hits.keys()]) if (n !== picked) hits.delete(n);
    if (!hits.size) {
      return NextResponse.json(
        { error: "이 번호로 등록된 회원을 찾지 못했어요. 번호를 다시 확인하시거나 카카오채널 [온기pt]로 문의해 주세요." },
        { status: 404 }
      );
    }
    const valid: string[] = [];
    for (const n of hits.keys()) if (await isValidName(n)) valid.push(n);
    if (!valid.length) {
      return NextResponse.json(
        { error: "회원권이 만료되어 예약할 수 없어요. 재등록은 카카오톡 [온기pt]로 문의해 주세요.", expired: true },
        { status: 403 }
      );
    }
    if (valid.length > 1) {
      const labels = maskAll(valid);
      return NextResponse.json({ choices: valid.map((n, i) => ({ label: labels[i], who: nameToken(n) })) });
    }
    const name = valid[0];
    const dbs = hits.get(name)!;
    const memberships = [];
    // 담당 선생님 기준: '근막이완 회원 리스트(담당자별)'에서 이 회원의 담당 선생님 지점만 연다.
    // (지점을 옮긴 회원이 예전 지점 누적 DB에도 남아 있어도 현재 담당 지점으로 잡히도록 · 2026-11-10 대표)
    const groups = new Set(((await validMembers()) ?? []).filter((m) => m.name === normName(name)).map((m) => m.group));
    for (const b of BRANCHES.filter((b) => b.open)) {
      const t = b.trainers.find((x) => groups.has(x.name));
      if (!t) continue;
      memberships.push({
        branch: b.id,
        branchName: b.name,
        trainerId: t.id,
        trainers: b.trainers.map((x) => ({ id: x.id, name: x.name, selfBook: !!x.selfBook })),
      });
    }
    if (!memberships.length) for (const b of BRANCHES.filter((b) => b.open)) {
      if (!memberDbIdsOf(b).some((id) => dbs.has(id))) continue;
      memberships.push({
        branch: b.id,
        branchName: b.name,
        trainerId: await guessTrainer(b, name).catch(() => undefined),
        trainers: b.trainers.map((t) => ({ id: t.id, name: t.name, selfBook: !!t.selfBook })),
      });
    }
    if (!memberships.length) {
      return NextResponse.json({ error: "예약할 수 있는 지점을 찾지 못했어요. 카카오채널 [온기pt]로 문의해 주세요." }, { status: 404 });
    }
    return NextResponse.json({ who: nameToken(name), label: mask(name), memberships });
  } catch (e) {
    console.error("member", e);
    return NextResponse.json({ error: "회원 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
