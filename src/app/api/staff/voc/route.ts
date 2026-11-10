import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staffAuth";
import { vocList } from "@/lib/voc";

export const dynamic = "force-dynamic";

/** 직원 화면: 고객의 소리 목록 */
export async function GET(req: Request) {
  if (!staffAuthorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  try {
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    return NextResponse.json({ items: await vocList(fresh) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("staff/voc", e);
    const m = (e as Error).message ?? "";
    const blocked = /404|object_not_found|Could not find|restricted|401|403/i.test(m);
    return NextResponse.json(
      { error: blocked ? "노션 VoC 페이지에 '온기 예약 사이트' 연결이 필요해요. (VoC 페이지 → ··· → 연결 → 온기 예약 사이트)" : "고객의 소리를 불러오지 못했어요." },
      { status: 502 }
    );
  }
}
