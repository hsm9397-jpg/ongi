import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { BRANCHES, calendarIdOf } from "@/config/branches";
import { listEvents } from "@/lib/google";
import { addDays, isValidDate, kstDate, kstHourMinute, todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const want = process.env.STAFF_PASSWORD ?? "";
  const got = req.headers.get("x-staff-key") ?? "";
  if (!want) return false;
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  const date = req.nextUrl.searchParams.get("date") ?? todayKst();
  if (!isValidDate(date)) return NextResponse.json({ error: "날짜가 올바르지 않아요." }, { status: 400 });
  const from = kstDate(date, 0), to = kstDate(addDays(date, 1), 0);
  try {
    const branches = await Promise.all(
      BRANCHES.filter((b) => b.open).map(async (b) => ({
        id: b.id,
        name: b.name,
        beds: b.beds,
        firstHour: Math.min(b.firstHour, ...b.trainers.flatMap((t) => Object.values(t.week ?? {}).map((w) => w![0]))),
        lastHour: Math.max(b.lastHour, ...b.trainers.flatMap((t) => Object.values(t.week ?? {}).map((w) => w![1]))),
        trainers: await Promise.all(
          b.trainers.map(async (t) => {
            const cal = calendarIdOf(t);
            let connected = !!cal;
            const events = cal
              ? await listEvents(cal, from, to).catch((err) => {
                  console.error(`calendar ${t.name}`, err);
                  connected = false;
                  return [];
                })
              : [];
            return {
              id: t.id,
              name: t.name,
              connected,
              events: events.map((e) => {
                const s = kstHourMinute(e.start), en = kstHourMinute(e.end);
                return {
                  title: e.summary,
                  allDay: e.allDay,
                  start: `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`,
                  end: `${String(en.hour).padStart(2, "0")}:${String(en.minute).padStart(2, "0")}`,
                  startHour: s.hour + s.minute / 60,
                  kind: e.summary.includes("체험") && !e.summary.includes("체험단") ? "trial" : e.blocks ? "member" : "other",
                  fromWeb: e.fromWeb,
                };
              }),
            };
          })
        ),
      }))
    );
    return NextResponse.json({ date, branches }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("staff", e);
    return NextResponse.json({ error: "캘린더를 불러오지 못했어요." }, { status: 502 });
  }
}
