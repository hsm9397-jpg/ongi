import { JWT } from "google-auth-library";
import { toKstIso } from "./time";
import { BOOKING } from "@/config/branches";
import { demoCreate, demoDelete, demoEvents, demoMode, demoMove, demoOpen } from "./mock";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const API = "https://www.googleapis.com/calendar/v3";

let client: JWT | null = null;

function getClient(): JWT {
  if (client) return client;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 없습니다.");
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const key = JSON.parse(json) as { client_email: string; private_key: string };
  client = new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
  return client;
}

export type CalEvent = {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  /** 이 일정이 시간을 차지하는지 (투명 일정은 제외) */
  blocks: boolean;
  description?: string;
  fromWeb: boolean;
  /** 제목이 '오픈'인 일정: 근무시간 밖이라도 이 시간만 예약을 받는다 */
  open?: boolean;
  /** 홈페이지 예약에 붙여 둔 정보 (이름, 뒷4자리, 종류 등) */
  props?: Record<string, string>;
};

type RawEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** 캘린더 하나의 일정 목록 (반복 일정은 펼쳐서) */
export async function listEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
  q?: string,
  privateProps?: Record<string, string>
): Promise<CalEvent[]> {
  if (demoMode())
    return demoEvents(calendarId, timeMin, timeMax).filter(
      (e) => (!q || e.summary.includes(q)) && (!privateProps || Object.entries(privateProps).every(([k, v]) => e.props?.[k] === v))
    );
  const c = getClient();
  const out: CalEvent[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (q) params.set("q", q);
    for (const [k, v] of Object.entries(privateProps ?? {})) params.append("privateExtendedProperty", `${k}=${v}`);
    if (pageToken) params.set("pageToken", pageToken);
    const res = await c.request<{ items?: RawEvent[]; nextPageToken?: string }>({
      url: `${API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    });
    for (const e of res.data.items ?? []) {
      if (e.status === "cancelled") continue;
      const allDay = !!e.start?.date;
      const start = new Date(allDay ? `${e.start!.date}T00:00:00+09:00` : e.start!.dateTime!);
      const end = new Date(allDay ? `${e.end!.date}T00:00:00+09:00` : e.end!.dateTime!);
      const summary = e.summary ?? "";
      const dayOff = BOOKING.dayOffKeywords.some((k) => summary.includes(k));
      const open = isOpenTitle(summary) && !allDay;
      out.push({
        id: e.id,
        summary,
        start,
        end,
        allDay,
        // 종일 일정은 '휴무' 같은 단어가 있을 때만 막고, 시간 일정은 '바쁨'이면 막는다
        blocks: open ? false : allDay ? dayOff : e.transparency !== "transparent",
        open,
        description: e.description,
        fromWeb: e.extendedProperties?.private?.source === "ongi-web",
        props: e.extendedProperties?.private,
      });
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

/** '오픈' 일정인지 (앞뒤 공백·대소문자 무시, 'OPEN'도 인정) */
export const isOpenTitle = (t: string) => /^\s*(오픈|open)\s*$/i.test(t);

/** 일정 시간 바꾸기 ('오픈' 일정에서 예약된 시간을 잘라낼 때) */
export async function moveEvent(calendarId: string, eventId: string, start: Date, end: Date): Promise<void> {
  if (demoMode()) return demoMove(eventId, start, end);
  const c = getClient();
  await c.request({
    url: `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    method: "PATCH",
    data: { start: { dateTime: toKstIso(start), timeZone: "Asia/Seoul" }, end: { dateTime: toKstIso(end), timeZone: "Asia/Seoul" } },
  });
}

/** 새 '오픈' 일정 (잘라낸 뒤 남은 뒷부분) */
export async function createOpenEvent(calendarId: string, start: Date, end: Date): Promise<void> {
  if (demoMode()) {
    demoOpen(calendarId, start, end);
    return;
  }
  const c = getClient();
  await c.request({
    url: `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
    method: "POST",
    data: { summary: "오픈", transparency: "transparent", start: { dateTime: toKstIso(start), timeZone: "Asia/Seoul" }, end: { dateTime: toKstIso(end), timeZone: "Asia/Seoul" } },
  });
}

/** 예약한 시간(정시~다음 정시)을 그 선생님의 '오픈' 일정에서 잘라낸다. 실패해도 예약은 그대로 둔다 */
export async function carveOpen(calendarId: string, start: Date, end: Date): Promise<void> {
  const cutEnd = new Date(Math.max(end.getTime(), start.getTime() + 3_600_000));
  const opens = (await listEvents(calendarId, start, cutEnd)).filter((e) => e.open && e.start < cutEnd && e.end > start);
  for (const o of opens) {
    const oStart = o.start;
    const oEnd = o.end;
    const before = oStart < start;
    const after = oEnd > cutEnd;
    if (before) await moveEvent(calendarId, o.id, oStart, start);
    else if (after) await moveEvent(calendarId, o.id, cutEnd, oEnd);
    else await deleteEvent(calendarId, o.id);
    if (before && after) await createOpenEvent(calendarId, cutEnd, oEnd);
  }
}

export async function createEvent(
  calendarId: string,
  input: { summary: string; start: Date; end: Date; description: string; kind: "trial" | "member" | "pt"; phone: string; name: string; branch: string; extra?: Record<string, string> }
): Promise<{ id: string; htmlLink?: string }> {
  const props = { ...(input.extra ?? {}), source: "ongi-web", kind: input.kind, phone: input.phone, last4: input.phone.slice(-4), name: input.name, branch: input.branch };
  if (demoMode()) return demoCreate(calendarId, input.summary, input.start, input.end, props, input.description);
  const c = getClient();
  const res = await c.request<{ id: string; htmlLink?: string }>({
    url: `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
    method: "POST",
    data: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: toKstIso(input.start), timeZone: "Asia/Seoul" },
      end: { dateTime: toKstIso(input.end), timeZone: "Asia/Seoul" },
      extendedProperties: { private: props },
    },
  });
  return res.data;
}

export async function getEvent(calendarId: string, eventId: string): Promise<CalEvent | null> {
  if (demoMode()) {
    const now = new Date();
    return demoEvents(calendarId, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 60 * 86_400_000)).find((e) => e.id === eventId) ?? null;
  }
  const c = getClient();
  try {
    const res = await c.request<RawEvent>({ url: `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}` });
    const e = res.data;
    if (e.status === "cancelled" || !e.start?.dateTime) return null;
    return {
      id: e.id,
      summary: e.summary ?? "",
      start: new Date(e.start.dateTime),
      end: new Date(e.end!.dateTime!),
      allDay: false,
      blocks: e.transparency !== "transparent",
      description: e.description,
      fromWeb: e.extendedProperties?.private?.source === "ongi-web",
      props: e.extendedProperties?.private,
    };
  } catch {
    return null;
  }
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  if (demoMode()) return demoDelete(eventId);
  const c = getClient();
  await c.request({ url: `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, method: "DELETE" });
}
