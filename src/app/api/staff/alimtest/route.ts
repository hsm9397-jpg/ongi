import { NextResponse } from "next/server";
import { BRANCHES } from "@/config/branches";
import { ALIMTALK_TEMPLATES, STAFF_TEMPLATES, alimVariables, sendAlimDetail } from "@/lib/alimtalk";
import { staffAuthorized } from "@/lib/staffAuth";
import { digitsOnly } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** 직원 화면: 입력한 번호로 알림톡 테스트 발송, 솔라피 응답을 그대로 보여준다 */
export async function POST(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const to = digitsOnly(body.to);
  const staff = String(body.type ?? "").startsWith("staff-");
  const raw = staff ? String(body.type).slice(6) : body.type;
  const type = (["new", "change", "cancel", "remind"] as const).find((t) => t === raw) ?? "new";
  const b = BRANCHES.find((x) => x.id === "sbp") ?? BRANCHES[0];
  const when = new Date(Date.now() + 86_400_000);
  const vars = alimVariables({ type, branch: b, trainer: b.trainers[0], name: "테스트", phone: to, when, oldWhen: new Date(when.getTime() - 3_600_000) });
  const r = await sendAlimDetail(to, (staff && STAFF_TEMPLATES[type]) || ALIMTALK_TEMPLATES[type], vars);
  return NextResponse.json(r);
}
