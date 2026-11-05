import { JWT } from "google-auth-library";
import { toKstIso } from "./time";
import { BOOKING } from "@/config/branches";
import { demoCreate, demoEvents, demoMode } from "./mock";

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
export async function listEvents(calendarId: string, timeMin: Date, timeMax: Date, q?: string): Promise<CalEvent[]> {
  if (demoMode()) return demoEvents(calendarId, timeMin, timeMax).filter((e) => !q || e.summary.includes(q));
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
      out.push({
        id: e.id,
        summary,
        start,
        end,
        allDay,
        // 종일 일정은 '휴무' 같은 단어가 있을 때만 막고, 시간 일정은 '바쁨'이면 막는다
        blocks: allDay ? dayOff : e.transparency !== "transparent",
        description: e.description,
        fromWeb: e.extendedProperties?.private?.source === "ongi-web",
      });
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

export async function createEvent(
  calendarId: string,
  input: { summary: string; start: Date; end: Date; description: string; kind: "trial" | "member"; phone: string }
): Promise<{ id: string; htmlLink?: string }> {
  if (demoMode()) return demoCreate(calendarId, input.summary, input.start, input.end);
  const c = getClient();
  const res = await c.request<{ id: string; htmlLink?: string }>({
    url: `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
    method: "POST",
    data: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: toKstIso(input.start), timeZone: "Asia/Seoul" },
      end: { dateTime: toKstIso(input.end), timeZone: "Asia/Seoul" },
      extendedProperties: { private: { source: "ongi-web", kind: input.kind, phone: input.phone } },
    },
  });
  return res.data;
}
