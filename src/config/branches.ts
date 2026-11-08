// 지점·베드·담당자 설정. 지점이나 선생님이 바뀌면 이 파일만 고치면 됩니다.
// 캘린더 ID와 노션 DB ID는 비밀값이 아니지만 개인 이메일이 들어가므로 환경변수로 넣습니다.

export type Trainer = {
  id: string;
  name: string;
  /** 구글 캘린더 ID를 담은 환경변수 이름 */
  calendarEnv: string;
  /** 선생님이 직접 일정을 잡음: 사이트 예약을 받지 않고 '직접 문의' 안내만 띄운다 */
  selfBook?: boolean;
};

export type Branch = {
  id: string;
  name: string;
  short: string;
  beds: number;
  womenOnly?: boolean;
  /** 고객 예약 화면에 노출할지 (오픈 예정 지점은 false) */
  open: boolean;
  /** 지점 목록 칩에서는 숨김 (PT 상담처럼 별도 버튼으로 들어가는 예약) */
  hidden?: boolean;
  /** 이 '지점'으로 받는 예약 종류. 기본은 체험·회원, PT 상담 전용이면 "pt" */
  only?: "pt";
  /** 온라인 예약을 받을지 (false면 지점 안내만 보이고 날짜 선택이 막힘) */
  bookable?: boolean;
  /** 신규 체험만 막기 (기존 회원 예약은 그대로 받음) */
  trialClosed?: boolean;
  /** 지점을 눌렀을 때 보이는 소개 문구 */
  desc: string;
  /** 지점 아래 안내 한 줄 (예: 예약 불가 사유) */
  notice?: string;
  /** 주소. 비워 두면 위치 보기 버튼이 숨겨집니다 */
  address?: string;
  /** 지도 검색용 주소 (층·호수 제외한 도로명) */
  mapQuery?: string;
  /** 첫 방문 체험은 네이버 예약으로 받는다 (플레이스 순위 유지, 2026-11-06 결정) */
  naverTrial?: string;
  /** PT 상담·평가 네이버 예약 링크 */
  naverPt?: string;
  /** 예약 화면 장소 칸에 바로 보여줄 사진 */
  photos?: string[];
  /** 지도 핀 위치 (구글 지도 plus code에서 변환) */
  lat?: number;
  lng?: number;
  trainers: Trainer[];
  /** 노션 회원 DB ID를 담은 환경변수 이름 (쉼표로 여러 개 가능) */
  memberDbEnv: string;
  /** 첫 타임 시작 시각, 마지막 타임 시작 시각 (24시간제) */
  firstHour: number;
  lastHour: number;
  /** 정해진 시간만 열 때 (예: PT 상담 9~12시, 17~20시) */
  hours?: number[];
  /** 대기 예약만 받는 지점 (체험 누르면 안내 팝업) */
  waitlist?: boolean;
};

/** 이 지점이 예약을 받는 시작 시각들 */
export const hoursOf = (b: Branch): number[] =>
  b.hours ?? Array.from({ length: b.lastHour - b.firstHour + 1 }, (_, i) => b.firstHour + i);

export const BRANCHES: Branch[] = [
  {
    id: "main",
    waitlist: true,
    desc: "잠원동 1호점으로 대표가 진행하며 PT 진행 및 1인용 근막이완 공간이 구비되어 있습니다.",
    trialClosed: true,
    notice: "현재 신규 예약은 불가합니다.",
    address: "서울시 서초구 신반포로33길 62 한신로얄상가 2층",
    mapQuery: "서울 서초구 신반포로33길 62",
    lat: 37.513587,
    lng: 127.009328,
    naverTrial: "https://m.booking.naver.com/booking/13/bizes/1538431/items/7200334",
    name: "온기 PT&근막이완 (잠원동 1호점)",
    short: "온기 PT&근막이완 (잠원동 1호점)",
    beds: 1,
    open: true,
    trainers: [{ id: "hsm", name: "현승민", calendarEnv: "CAL_HYUNSEUNGMIN" }],
    memberDbEnv: "NOTION_MEMBER_DB_MAIN",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "priv",
    waitlist: true,
    desc: "오로지 1인을 위한 프라이빗룸으로 가장 아늑한 지점입니다.",
    address: "서울시 서초구 신반포로33길 62 한신로얄상가 지하 1층",
    mapQuery: "서울 서초구 신반포로33길 62",
    lat: 37.513587,
    lng: 127.009328,
    naverTrial: "https://m.booking.naver.com/booking/13/bizes/1646425/items/7655040",
    name: "온기 근막이완 (잠원동 2호점)",
    short: "온기 근막이완 (잠원동 2호점)",
    beds: 1,
    open: true,
    trainers: [{ id: "bts", name: "배태성", calendarEnv: "CAL_BAETAESEONG" }],
    memberDbEnv: "NOTION_MEMBER_DB_PRIV",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "sbp",
    waitlist: true,
    desc: "여성 전용 지점으로 분리된 2룸으로 룸 간의 독립성을 유지하였습니다.",
    address: "서울시 서초구 잠원로8길 25 신반포스퀘어 2층 213-1호",
    mapQuery: "서울 서초구 잠원로8길 25",
    lat: 37.514363,
    lng: 127.011641,
    naverTrial: "https://m.booking.naver.com/booking/13/bizes/1727252/items/8012950",
    name: "신반포스퀘어점",
    short: "신반포스퀘어점",
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
    desc: "가장 큰 지점으로 독립적으로 분리된 3룸을 갖췄으며, 각 룸은 분리되어 독립성을 가집니다. 여러 명이 동시 진행 가능합니다.",
    address: "서울시 강남구 선릉로86길 31 롯데골드로즈2차 4층 403호",
    mapQuery: "서울 강남구 선릉로86길 31",
    lat: 37.504162,
    lng: 127.052109,
    naverTrial: "https://m.booking.naver.com/booking/13/bizes/1759220/items/8143892",
    name: "선릉점",
    short: "선릉점",
    beds: 3,
    open: true,
    trainers: [
      { id: "shj", name: "송효재", calendarEnv: "CAL_SONGHYOJAE" },
      { id: "ljm", name: "이정민", calendarEnv: "CAL_LEEJUNGMIN", selfBook: true },
      { id: "hjs", name: "허재성", calendarEnv: "CAL_HEOJAESEONG" },
    ],
    memberDbEnv: "NOTION_MEMBER_DB_SL",
    firstHour: 10,
    lastHour: 20,
  },
  {
    id: "pt",
    desc: "운동 목적이나 몸 상태에 따라 필요한 체성분, 근력, 가동성, 기능 테스트를 진행하고 운동의 방향을 설정하는 시간입니다. 여성 트레이너가 진행합니다.",
    address: "서울시 서초구 신반포로33길 62 한신로얄상가 2층",
    mapQuery: "서울 서초구 신반포로33길 62",
    lat: 37.513587,
    lng: 127.009328,
    name: "온기 PT&근막이완 · PT 상담·평가",
    short: "온기 PT&근막이완 (잠원동 1호점)",
    beds: 1,
    open: true,
    hidden: true,
    only: "pt",
    naverPt: "https://m.booking.naver.com/booking/13/bizes/1538431/items/7200124",
    photos: ["/branches/pt/1.webp", "/branches/pt/2.webp", "/branches/pt/3.webp", "/branches/pt/4.webp"],
    trainers: [{ id: "kjh", name: "김정화", calendarEnv: "CAL_KIMJUNGHWA" }],
    memberDbEnv: "NOTION_MEMBER_DB_PT",
    firstHour: 9,
    lastHour: 20,
    hours: [9, 10, 11, 12, 17, 18, 19, 20],
  },
  {
    id: "cd",
    desc: "오픈 예정입니다.",
    name: "청담점",
    short: "청담점",
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
  /** 기존 회원은 2주 앞까지만 예약 (2026-11-06 대표 요청) */
  memberDaysAhead: 14,
  /** 지금부터 최소 몇 시간 뒤 타임부터 예약 가능 */
  minLeadHours: 3,
  /** 예약 시작 몇 시간 전까지 고객이 직접 변경·취소할 수 있는지 */
  changeCutoffHours: 24,
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

/** 알림 문자를 받을 선생님 번호 (환경변수 PHONE_이름, 예: PHONE_HYUNSEUNGMIN) */
export function phoneOf(t: Trainer): string | undefined {
  const v = process.env[t.calendarEnv.replace(/^CAL_/, "PHONE_")];
  return v && v.replace(/\D/g, "").length >= 10 ? v.replace(/\D/g, "") : undefined;
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
    hidden: !!b.hidden,
    only: b.only,
    bookable: b.bookable !== false,
    trialClosed: !!b.trialClosed,
    desc: b.desc,
    notice: b.notice ?? "",
    address: b.address ?? "",
    mapQuery: b.mapQuery ?? b.address ?? "",
    naverTrial: b.naverTrial ?? "",
    naverPt: b.naverPt ?? "",
    photos: b.photos ?? [],
    waitlist: !!b.waitlist,
    lat: b.lat ?? 0,
    lng: b.lng ?? 0,
    trainers: b.trainers.map((t) => ({ id: t.id, name: t.name, selfBook: !!t.selfBook })),
  }));
}
