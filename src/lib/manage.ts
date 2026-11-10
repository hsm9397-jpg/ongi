// 고객이 직접 예약을 확인·변경·취소할 때 쓰는 공통 로직
import crypto from "node:crypto";
import { BOOKING, BRANCHES, Branch, Trainer, calendarIdOf, getBranch } from "@/config/branches";
import { CalEvent, getEvent, listEvents } from "./google";
import { kstHourMinute, todayKst } from "./time";
import { mask, nameToken } from "./members";

const secret = () =>
  crypto
    .createHash("sha256")
    .update(process.env.MANAGE_SECRET || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "ongi-demo")
    .digest();

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (s: string) => crypto.createHmac("sha256", secret()).update(s).digest("base64url").slice(0, 22);

/** 브라우저에 넘길 예약 식별값 (위조 방지 서명 포함) */
export function makeToken(branchId: string, trainerId: string, eventId: string) {
  const body = `${branchId}|${trainerId}|${eventId}`;
  return `${b64(body)}.${sign(body)}`;
}

export function readToken(token: unknown): { branch: Branch; trainer: Trainer; calendarId: string; eventId: string } | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [bodyB64, sig] = token.split(".");
  let body = "";
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [branchId, trainerId, eventId] = body.split("|");
  const branch = getBranch(branchId);
  const trainer = branch?.trainers.find((t) => t.id === trainerId);
  const calendarId = trainer && calendarIdOf(trainer);
  if (!branch || !trainer || !calendarId || !eventId) return null;
  return { branch, trainer, calendarId, eventId };
}

const norm = (s: string) => s.replace(/\s/g, "");

export function ownedBy(e: CalEvent, name: string, last4: string) {
  return e.fromWeb && e.props?.last4 === last4 && norm(e.props?.name ?? "") === norm(name);
}

/** 취소(그리고 체험·PT 변경): 예약 전날 자정(23:59)까지. 예약 당일이 되면 불가 (2026-11-09 대표) */
export function canChange(start: Date, now = new Date()) {
  return todayKst(now) < kstHourMinute(start).date;
}

/** 기존 회원 시간 변경: 예약 2시간 전까지 */
export function canMemberChange(start: Date, now = new Date()) {
  return start.getTime() - now.getTime() > BOOKING.memberChangeCutoffHours * 3_600_000;
}

/** 오늘 이미 한 번 시간을 바꾼 예약인지 (바꿀 때 새 일정에 chgDate를 남김) */
export const changedToday = (e: CalEvent, now = new Date()) => e.props?.chgDate === todayKst(now);

export const CONTACT_TRAINER = "담당 선생님께 문의해 주세요.";

export type MyBooking = {
  token: string;
  branchId: string;
  branchName: string;
  trainerId: string;
  trainerName: string;
  kind: "trial" | "member" | "pt";
  date: string;
  hour: number;
  minute: number;
  /** 시간 변경 버튼을 보여줄지 */
  changeable: boolean;
  /** 취소 버튼을 보여줄지 */
  cancelable: boolean;
  /** 오늘 이미 변경함 → 다시 누르면 담당 선생님 문의 팝업 */
  changedToday: boolean;
  /** 예약자 이름 서명값 (변경·취소 때 이름 대신 보냄) */
  who: string;
  /** 가린 예약자 이름 (같은 뒷번호로 여러 명이면 고르기용) */
  label: string;
};

/** name이 비어 있으면 뒷번호 4자리만으로 찾는다 (2026-11-09 대표: 이름 입력 없이) */
export async function findBookings(name: string, last4: string, now = new Date()): Promise<MyBooking[]> {
  const to = new Date(now.getTime() + (BOOKING.daysAhead + 2) * 86_400_000);
  const out: MyBooking[] = [];
  await Promise.all(
    BRANCHES.filter((b) => b.open).flatMap((b) =>
      b.trainers.map(async (t) => {
        const cal = calendarIdOf(t);
        if (!cal) return;
        const events = await listEvents(cal, now, to, undefined, { source: "ongi-web", last4 }).catch(() => [] as CalEvent[]);
        for (const e of events) {
          if (!(name ? ownedBy(e, name, last4) : e.fromWeb && e.props?.last4 === last4) || e.props?.branch !== b.id) continue;
          const { date, hour, minute } = kstHourMinute(e.start);
          out.push({
            token: makeToken(b.id, t.id, e.id),
            branchId: b.id,
            branchName: b.short,
            trainerId: t.id,
            trainerName: t.name,
            kind: e.props?.kind === "member" ? "member" : e.props?.kind === "pt" ? "pt" : "trial",
            date,
            hour,
            minute,
            changeable: e.props?.kind === "member" ? canMemberChange(e.start, now) : canChange(e.start, now),
            cancelable: canChange(e.start, now),
            changedToday: e.props?.kind === "member" && changedToday(e, now),
            who: nameToken(e.props?.name ?? ""),
            label: mask(e.props?.name ?? ""),
          });
        }
      })
    )
  );
  return out.sort((a, b) => (a.date + String(a.hour).padStart(2, "0")).localeCompare(b.date + String(b.hour).padStart(2, "0")));
}

/** 토큰 + 이름 + 뒷4자리로 실제 일정을 다시 확인 */
export async function loadOwned(token: unknown, name: string, last4: string, action: "change" | "cancel" = "cancel") {
  const ref = readToken(token);
  if (!ref) return { error: "예약 정보를 다시 조회해 주세요.", status: 400 } as const;
  const ev = await getEvent(ref.calendarId, ref.eventId);
  if (!ev || !ownedBy(ev, name, last4)) return { error: "예약을 찾지 못했어요. 이미 변경·취소되었을 수 있어요.", status: 404 } as const;
  if (action === "change" && ev.props?.kind === "member") {
    if (!canMemberChange(ev.start)) return { error: CONTACT_TRAINER, contact: true, status: 409 } as const;
    if (changedToday(ev)) return { error: CONTACT_TRAINER, contact: true, status: 409 } as const;
    return { ...ref, ev } as const;
  }
  if (!canChange(ev.start))
    return { error: "예약 당일에는 직접 변경·취소할 수 없어요(전날 자정까지 가능). 카카오톡으로 문의해 주세요.", status: 400 } as const;
  return { ...ref, ev } as const;
}

export type Upcoming = { date: string; hour: number; minute: number; branchName: string; trainerName: string; web: boolean; act?: { token: string; who: string; kind: string; branchId: string; trainerId: string; changeable: boolean; cancelable: boolean; changedToday: boolean } };
/** 회원 페이지 '내 예약': 홈페이지 예약 + 선생님이 캘린더에 직접 잡은 일정(제목 이름이 같은 것) */
export async function myUpcoming(name: string, last4: string, sameNameCount: number, now = new Date()): Promise<Upcoming[]> {
  const { parseTitle, SKIP_TITLE } = await import("./remind");
  const { normName } = await import("./notion");
  const me = normName(name);
  const to = new Date(now.getTime() + 60 * 86_400_000);
  const out: Upcoming[] = [];
  const seen = new Set<string>();
  await Promise.all(
    BRANCHES.filter((b) => b.open || b.hidden).flatMap((b) =>
      b.trainers.map(async (t) => {
        const cal = calendarIdOf(t);
        if (!cal) return;
        const events = await listEvents(cal, now, to).catch(() => [] as CalEvent[]);
        for (const e of events) {
          if (e.allDay || e.open) continue;
          let mine = false;
          if (e.fromWeb) mine = ownedBy(e, name, last4);
          else if (!SKIP_TITLE.test(e.summary)) {
            const p = parseTitle(e.summary);
            // 2:1 "강혜정/고희영"은 한 명씩 비교
            const names = p ? p.name.split("/") : [];
            mine = names.includes(me) && (p?.last4 ? p.last4 === last4 : sameNameCount <= 1);
          }
          if (!mine || seen.has(e.id)) continue;
          seen.add(e.id);
          const { date, hour, minute } = kstHourMinute(e.start);
          const act = e.fromWeb
            ? {
                token: makeToken(b.id, t.id, e.id),
                who: nameToken(e.props?.name ?? ""),
                kind: e.props?.kind ?? "member",
                branchId: b.id,
                trainerId: t.id,
                changeable: e.props?.kind === "member" ? canMemberChange(e.start, now) : canChange(e.start, now),
                cancelable: canChange(e.start, now),
                changedToday: e.props?.kind === "member" && changedToday(e, now),
              }
            : undefined;
          out.push({ date, hour, minute, branchName: b.short, trainerName: t.name, web: e.fromWeb, act });
        }
      })
    )
  );
  return out.sort((a, b) => (a.date + String(a.hour).padStart(2, "0") + String(a.minute).padStart(2, "0")).localeCompare(b.date + String(b.hour).padStart(2, "0") + String(b.minute).padStart(2, "0")));
}
