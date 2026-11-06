// 지점·베드·담당자 설정. 지점이나 선생님이 바뀌면 이 파일만 고치면 됩니다.
// 캘린더 ID와 노션 DB ID는 비밀값이 아니지만 개인 이메일이 들어가므로 환경변수로 넣습니다.

export type Trainer = {
  id: string;
  name: string;
  /** 구글 캘린더 ID를 담은 환경변수 이름 */
  calendarEnv: string;
};

export type Branch = {
  id: string;
  name: string;
  short: string;
  beds: number;
  womenOnly?: boolean;
  /** 고객 예약 화면에 노출할지 (오픈 예정 지점은 false) */
  open: boolean;
  trainers: Trainer[];
  /** 노션 회원 DB ID를 담은 환경변수 이름 (쉼표로 여러 개 가능) */
  memberDbEnv: string;
  /** 첫 타임 시작 시각, 마지막 타임 시작 시각 (24시간제) */
  firstHour: number;
  lastHour: number;
};

export const BRANCHES: Branch[] = [
  {
    id: "main",
    name: "온기 PT&근막이완",
    short: "온기PT&근막이완(본점)",
    beds: 1,
    open: true,
    trainers: [{ id: "hsm", name: "현승민", calendarEnv: "CAL_HYUNSEUNGMIN" }],
    memberDbEnv: "NOTION_MEMBER_DB_MAIN",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "priv",
    name: "온기 근막이완 더 프라이빗",
    short: "온기 근막이완(본점)",
    beds: 1,
    open: true,
    trainers: [{ id: "bts", name: "배태성", calendarEnv: "CAL_BAETAESEONG" }],
    memberDbEnv: "NOTION_MEMBER_DB_PRIV",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "sbp",
    name: "신반포스퀘어점",
    short: "신반포스퀘어",
    beds: 2,
    womenOnly: true,
    open: true,
    trainers: [
      { id: "hsr", name: "황사라", calendarEnv: "CAL_HWANGSARA" },
      { id: "kny", name: "김나영", calendarEnv: "CAL_KIMNAYOUNG" },
    ],
    memberDbEnv: "NOTION_MEMBER_DB_SBP",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "sl",
    name: "선릉점",
    short: "선릉",
    beds: 3,
    open: true,
    trainers: [
      { id: "shj", name: "송효재", calendarEnv: "CAL_SONGHYOJAE" },
      { id: "ljm", name: "이정민", calendarEnv: "CAL_LEEJUNGMIN" },
      { id: "hjs", name: "허재성", calendarEnv: "CAL_HEOJAESEONG" },
    ],
    memberDbEnv: "NOTION_MEMBER_DB_SL",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "cd",
    name: "청담점",
    short: "청담",
    beds: 2,
    open: false,
    trainers: [],
    memberDbEnv: "NOTION_MEMBER_DB_CD",
    firstHour: 10,
    lastHour: 20,
  },
];

export const BOOKING = {
  /** 한 타임 진행 시간(분) */
  sessionMinutes: 50,
  /** 오늘부터 며칠 앞까지 예약을 열지 */
  daysAhead: 30,
  /** 지금부터 최소 몇 시간 뒤 타임부터 예약 가능 */
  minLeadHours: 3,
  /** 체험 안내 문구 */
  trialPriceText: "7만원",
  /** 이 단어가 들어간 종일 일정은 그날 전체를 막습니다 */
  dayOffKeywords: ["휴무", "휴가", "OFF", "off", "오프"],
};

export function getBranch(id: string): Branch | undefined {
  return BRANCHES.find((b) => b.id === id);
}

export function calendarIdOf(t: Trainer): string | undefined {
  if (process.env.DEMO_MODE === "1") return `demo-${t.id}`;
  const v = process.env[t.calendarEnv];
  return v && v.trim() ? v.trim() : undefined;
}

export function memberDbIdsOf(b: Branch): string[] {
  if (process.env.DEMO_MODE === "1") return b.id === "sbp" ? ["demo"] : [];
  return (process.env[b.memberDbEnv] || "")
    .split(",")
    .map((s) => s.trim().replace(/-/g, ""))
    .filter(Boolean);
}

/** 브라우저로 보내도 되는 공개 정보만 */
export function publicBranches() {
  return BRANCHES.filter((b) => b.open).map((b) => ({
    id: b.id,
    name: b.name,
    short: b.short,
    womenOnly: !!b.womenOnly,
    trainers: b.trainers.map((t) => ({ id: t.id, name: t.name })),
  }));
}
