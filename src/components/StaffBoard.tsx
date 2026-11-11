"use client";

import { useCallback, useEffect, useState } from "react";
import StaffPosts from "./StaffPosts";

type Ev = { title: string; allDay: boolean; start: string; end: string; startHour: number; kind: "trial" | "member" | "other"; fromWeb: boolean };
type T = { id: string; name: string; connected: boolean; events: Ev[] };
type CK = { days: number[]; total: number; todayByBranch: Record<string, number> };
type V = { ready: boolean; days?: { date: string; visitors: number; views: number }[]; total?: number; totalViews?: number; since?: string | null; clicks?: { trial: CK; pt: CK } | null; branchNames?: Record<string, string> };
type B = { id: string; name: string; beds: number; firstHour: number; lastHour: number; trainers: T[] };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const label = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`);
  return `${x.getUTCMonth() + 1}월 ${x.getUTCDate()}일 (${DOW[x.getUTCDay()]})`;
};

export default function StaffBoard() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [date, setDate] = useState(kstToday());
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"main" | "insight" | "voc" | "board">("main");
  const [data, setData] = useState<B[] | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<V | null>(null);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("ongi-staff");
      if (k) { setKey(k); setAuthed(true); }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/staff/schedule?date=${date}`, { headers: { "x-staff-key": key } });
      const j = await res.json();
      if (res.status === 401) { setAuthed(false); throw new Error(j.error); }
      if (!res.ok) throw new Error(j.error);
      setData(j.branches);
      fetch("/api/staff/visits", { headers: { "x-staff-key": key } })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => v && setVisits(v))
        .catch(() => {});
      try { sessionStorage.setItem("ongi-staff", key); } catch {}
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date, key]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) {
    return (
      <form className="login" onSubmit={(e) => { e.preventDefault(); setAuthed(true); }}>
        <div className="brand"><small>Conditioning Studio</small><h1>지점 스케줄</h1></div>
        <div className="field">
          <label htmlFor="pw">직원 비밀번호</label>
          <input id="pw" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="primary" type="submit">들어가기</button>
      </form>
    );
  }

  const shown = (data ?? []).filter((b) => filter === "all" || b.id === filter);
  const timed = shown.flatMap((b) => b.trainers.flatMap((t) => t.events.filter((e) => !e.allDay && e.kind !== "other")));
  const cap = shown.reduce((s, b) => s + b.beds * (b.lastHour - b.firstHour + 1), 0);
  const trial = timed.filter((e) => e.kind === "trial").length;

  return (
    <>
      <div className="brand"><small>Conditioning Studio</small><h1 style={{ lineHeight: 1.25, marginTop: 4 }}>{tab === "insight" ? "방문자 인사이트" : tab === "voc" ? "고객의 소리" : tab === "board" ? "게시판" : "지점 스케줄"}</h1></div>
      <nav className="staff-tabs" aria-label="직원 화면 메뉴">
        <button aria-pressed={tab === "main"} onClick={() => setTab("main")}>예약 현황 · 알림톡</button>
        <button aria-pressed={tab === "insight"} onClick={() => setTab("insight")}>인사이트</button>
        <button aria-pressed={tab === "board"} onClick={() => setTab("board")}>게시판</button>
        <button aria-pressed={tab === "voc"} onClick={() => setTab("voc")}>고객의 소리</button>
      </nav>
      {tab === "board" ? (
        <StaffPosts staffKey={key} />
      ) : tab === "voc" ? (
        <VocBoard staffKey={key} />
      ) : tab === "insight" ? (
        <>
          <Visits v={visits} />
          <Insight staffKey={key} />
        </>
      ) : (
      <>
      <div className="toolbar">
        <div className="left">
          <button className="ghost" onClick={() => setDate(shift(date, -1))} aria-label="전날">‹</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜" />
          <button className="ghost" onClick={() => setDate(shift(date, 1))} aria-label="다음날">›</button>
          <button className="ghost" onClick={() => setDate(kstToday())}>오늘</button>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="지점">
            <option value="all">전 지점</option>
            {(data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="ghost" onClick={load} disabled={loading}>{loading ? "불러오는 중…" : "새로고침"}</button>
        </div>
        <div className="legend">
          <span><i style={{ background: "var(--terra)" }} />체험</span>
          <span><i style={{ background: "var(--brown)" }} />회원·일정</span>
          <span>★ 홈페이지 예약</span>
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="stats">
        <div className="stat"><small>{label(date)} 전체</small><b>{timed.length}</b></div>
        <div className="stat"><small>체험</small><b>{trial}</b></div>
        <div className="stat"><small>회원·기타 일정</small><b>{timed.length - trial}</b></div>
        <div className="stat"><small>베드 가동률</small><b>{cap ? Math.round((timed.length / cap) * 100) : 0}%</b></div>
      </div>
      <Remind staffKey={key} trial={false} />
      <Remind staffKey={key} trial />
      <AfterTrial staffKey={key} />
      <AlimTest staffKey={key} />
      {shown.map((b) => {
        const hours = Array.from({ length: b.lastHour - b.firstHour + 1 }, (_, i) => b.firstHour + i);
        return (
          <div className="branch" key={b.id}>
            <h3>{b.name} <small>베드 {b.beds} · {b.trainers.map((t) => t.name).join(", ")}</small></h3>
            {b.trainers.map((t) =>
              t.events.filter((e) => e.allDay).map((e, i) => (
                <div className="dayoff" key={`${t.id}-${i}`}>{t.name}: {e.title} (종일)</div>
              ))
            )}
            {b.trainers.filter((t) => !t.connected).map((t) => (
              <div className="dayoff" key={`nc-${t.id}`}>{t.name} 선생님 캘린더가 아직 연결되지 않았어요.{(t as { why?: string }).why ? ` · ${(t as { why?: string }).why}` : ""}</div>
            ))}
            <div className="gridwrap">
              <table className="grid">
                <thead><tr><th />{b.trainers.map((t) => <th key={t.id}>{t.name}</th>)}</tr></thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h}>
                      <td className="t">{h}:00</td>
                      {b.trainers.map((t) => {
                        const evs = t.events.filter((e) => !e.allDay && Math.floor(e.startHour) === h);
                        if (!evs.length) return <td key={t.id} className="cell" />;
                        return (
                          <td key={t.id} className={`cell ${evs[0].kind}`}>
                            {evs.map((e, i) => (
                              <span key={i}>
                                <span className="who">{e.fromWeb ? "★ " : ""}{e.title}</span>
                                <span className="meta">{e.start}–{e.end}</span>
                              </span>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      </>
      )}
    </>
  );
}

function Visits({ v }: { v: V | null }) {
  if (!v) return null;
  if (!v.ready || !v.days) {
    return <div className="dayoff">방문자 수: 아직 저장소가 연결되지 않았어요. (Vercel → Storage → Upstash Redis 연결 필요)</div>;
  }
  const sum = (n: number) => v.days!.slice(0, n).reduce((s, d) => s + d.visitors, 0);
  const week = v.days.slice(0, 7);
  const max = Math.max(1, ...week.map((d) => d.visitors));
  return (
    <div className="branch visits">
      <h3>홈페이지 방문자 <small>{v.since ? `${v.since.slice(2).replace(/-/g, ".")}부터 집계 · ` : ""}같은 기기는 하루 1명으로 셈</small></h3>
      <div className="stats">
        <div className="stat"><small>오늘</small><b>{v.days[0].visitors}</b></div>
        <div className="stat"><small>어제</small><b>{v.days[1]?.visitors ?? 0}</b></div>
        <div className="stat"><small>최근 7일</small><b>{sum(7)}</b></div>
        <div className="stat"><small>누적 방문자</small><b>{v.total ?? 0}</b></div>
      </div>
      <div className="vbars">
        {[...week].reverse().map((d) => (
          <div key={d.date} className="vbar">
            <span className="vn">{d.visitors}</span>
            <i style={{ height: `${Math.round((d.visitors / max) * 100)}%` }} />
            <small>{label(d.date).replace(/^\d+월 /, "")}</small>
          </div>
        ))}
      </div>
      <p className="vnote">최근 30일 {sum(30)}명 · 누적 페이지 조회 {v.totalViews ?? 0}회</p>
      {v.clicks && (
        <>
          <h3 style={{ marginTop: 18 }}>예약 버튼 누름 <small>네이버 예약으로 넘어간 횟수 (실제 예약 완료 수와는 다를 수 있어요)</small></h3>
          {([["trial", "체험 예약"], ["pt", "PT 상담"]] as const).map(([k, name]) => {
            const c = v.clicks![k];
            const s7 = c.days.slice(0, 7).reduce((a, b) => a + b, 0);
            const by = Object.entries(c.todayByBranch).map(([id, n]) => `${v.branchNames?.[id] ?? id} ${n}`).join(" · ");
            return (
              <div key={k}>
                <div className="stats">
                  <div className="stat"><small>{name} 오늘</small><b>{c.days[0] ?? 0}</b></div>
                  <div className="stat"><small>어제</small><b>{c.days[1] ?? 0}</b></div>
                  <div className="stat"><small>최근 7일</small><b>{s7}</b></div>
                  <div className="stat"><small>누적</small><b>{c.total}</b></div>
                </div>
                {k === "trial" && by && <p className="vnote">오늘 지점별: {by}</p>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

type RItem = { name: string; when: string; branch: string; trainer: string; status: string; reason?: string };
function Remind({ staffKey, trial }: { staffKey: string; trial: boolean }) {
  const [d, setD] = useState<{ preview: { date: string; items: RItem[] }; last: { at: string; date: string; items: RItem[] } | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/cron/remind", { method: "POST", headers: { "x-staff-key": staffKey } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setD(j);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const isT = (i: RItem) => i.name.endsWith("(체험)");
  const groups = (items: RItem[]) => {
    const g = items.filter((i) => isT(i) === trial).map((i) => ({ ...i, name: i.name.replace(/\s*\(체험\)$/, "") }));
    const ok = g.filter((i) => i.status === "send" || i.status === "sent").length;
    return (
      <>
        <p className="vnote">{ok}명 · 못 보냄 {g.length - ok}건</p>
        {g.length ? list(g) : <p className="vnote">없음</p>}
      </>
    );
  };
  const list = (items: RItem[]) => (
    <ul className="rm-list">
      {items.map((i, k) => (
        <li key={k} className={i.status}>
          <b>{i.name}</b> {i.when} · {i.branch} {i.trainer}
          {i.status === "skip" || i.status === "fail" ? <em> — {i.reason}</em> : i.status === "sent" ? <em> — 보냄</em> : null}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="branch visits">
      <h3>{trial ? "체험자 1일전 안내" : "회원 1일전 리마인드"} <small>{trial ? "매일 12시 자동 발송 · 담당 선생님 지점 체험 템플릿" : "매일 12시 자동 발송 · 체험자 제외"}</small></h3>
      {!d && <button className="ghost" onClick={load} disabled={busy}>{busy ? "불러오는 중…" : "내일 발송 대상 미리보기"}</button>}
      {err && <div className="err">{err}</div>}
      {d && (
        <>
          <p className="vnote">다음 12시 발송 대상 ({d.preview.date} 일정)</p>
          {groups(d.preview.items)}
          {d.last && (
            <>
              <p className="vnote">마지막 발송: {new Date(d.last.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} ({d.last.date} 예약분)</p>
              {groups(d.last.items)}
            </>
          )}
        </>
      )}
    </div>
  );
}

function AlimTest({ staffKey }: { staffKey: string }) {
  const [to, setTo] = useState("");
  const [type, setType] = useState("new");
  const [res, setRes] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setRes("");
    try {
      const r = await fetch("/api/staff/alimtest", { method: "POST", headers: { "x-staff-key": staffKey, "Content-Type": "application/json" }, body: JSON.stringify({ to, type }) });
      const j = await r.json();
      setRes(j.error ?? (j.ok ? "✓ " : "✕ ") + j.detail);
    } catch (e) { setRes((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="branch visits">
      <h3>알림톡 테스트 <small>입력한 번호로 예시 내용을 보내요</small></h3>
      <div className="left" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input inputMode="numeric" placeholder="01012345678" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="new">예약 확정</option>
          <option value="change">예약 변경</option>
          <option value="cancel">예약 취소</option>
          <option value="remind">1일전 리마인드</option>
          <option value="staff-new">내부용 · 예약 확정</option>
          <option value="staff-change">내부용 · 예약 변경</option>
          <option value="staff-cancel">내부용 · 예약 취소</option>
        </select>
        <button className="ghost" onClick={send} disabled={busy || to.replace(/\D/g, "").length < 10}>{busy ? "보내는 중…" : "보내기"}</button>
      </div>
      {res && <p className="vnote" style={{ wordBreak: "break-all" }}>{res}</p>}
    </div>
  );
}

function AfterTrial({ staffKey }: { staffKey: string }) {
  const [items, setItems] = useState<(RItem & { from?: string })[] | null>(null);
  const [dbs, setDbs] = useState<{ name: string; status: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tmr, setTmr] = useState(true);
  const load = async (t = tmr) => {
    setBusy(true); setErr(""); setTmr(t);
    try {
      const r = await fetch("/api/cron/after-trial", { method: "POST", headers: { "x-staff-key": staffKey, "content-type": "application/json" }, body: JSON.stringify({ tomorrow: t }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setItems(j.items);
      setDbs(j.dbs ?? null);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const label: Record<string, string> = { wait: "대기", sent: "보냄", skip: "못 보냄", fail: "실패" };
  return (
    <div className="branch visits">
      <h3>체험 후 안내 <small>체험 일정 끝나는 시각에 자동 발송</small></h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={tmr && items ? "" : "ghost"} onClick={() => load(true)} disabled={busy}>내일 체험자 (번호 확인)</button>
        <button className={!tmr && items ? "" : "ghost"} onClick={() => load(false)} disabled={busy}>오늘 체험자 (발송 현황)</button>
      </div>
      {busy && <p className="vnote">불러오는 중…</p>}
      {err && <div className="err">{err}</div>}
      {dbs && <p className="vnote">노션 {dbs.map((d) => `${d.name}: ${d.status}`).join(" · ")}</p>}
      {items && (items.length ? (
        <ul className="rm-list">
          {items.map((i, k) => (
            <li key={k} className={i.status}>
              <b>{i.name}</b> {i.when} 종료 · {i.branch} {i.trainer} — <em>{label[i.status]}{i.reason ? ` · ${i.reason}` : ""}{i.from ? ` · 번호: ${i.from}` : ""}</em>
            </li>
          ))}
        </ul>
      ) : <p className="vnote">{tmr ? "내일" : "오늘"} 체험 일정이 없어요.</p>)}
    </div>
  );
}

type Ins = {
  ready: boolean; days?: number; sessions?: number; homeViews?: number;
  refs?: { name: string; n: number }[];
  pages?: { path: string; views: number; avgSec: number }[];
  clicks?: { path: string; label: string; n: number }[];
  videos?: { name: string; plays: number; ends: number }[];
  sections?: { id: string; label: string; reach: number; avgSec: number }[];
};
const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);
const PAGE_NAME: Record<string, string> = { "/": "홈", "/member": "회원 페이지", "/회원": "회원 페이지", "/price": "서비스 금액", "/금액": "서비스 금액", "/privacy": "개인정보처리방침" };
function Bars({ rows }: { rows: { label: string; n: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="ins-bars">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="ins-l">{r.label}</span>
          <span className="ins-b"><i style={{ width: `${Math.max(3, Math.round((r.n / max) * 100))}%` }} /></span>
          <b>{r.sub ?? r.n}</b>
        </li>
      ))}
    </ul>
  );
}
function Insight({ staffKey }: { staffKey: string }) {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Ins | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setErr("");
    fetch(`/api/staff/insight?days=${days}`, { headers: { "x-staff-key": staffKey } })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr("인사이트를 불러오지 못했어요."));
  }, [days, staffKey]);
  if (d && !d.ready) return null;
  const home = d?.pages?.find((p) => p.path === "/");
  const homeClicks = (d?.clicks ?? []).filter((c) => c.path === "/");
  const otherClicks = (d?.clicks ?? []).filter((c) => c.path !== "/");
  const reachBase = Math.max(1, d?.sessions ?? 0);
  return (
    <div className="branch visits">
      <h3>방문자 인사이트 <small>어디서 왔고, 어디를 오래 봤고, 무엇을 눌렀는지 · 2026-11-10부터 집계</small></h3>
      <div className="ins-tabs">
        {[[1, "오늘"], [7, "최근 7일"], [30, "최근 30일"]].map(([n, l]) => (
          <button key={n} className={days === n ? "" : "ghost"} onClick={() => setDays(n as number)}>{l}</button>
        ))}
      </div>
      {err && <div className="err">{err}</div>}
      {!d && !err && <p className="vnote">불러오는 중…</p>}
      {d && (
        <>
          <div className="stats">
            <div className="stat"><small>홈 방문</small><b>{d.sessions ?? 0}</b></div>
            <div className="stat"><small>홈 평균 머문 시간</small><b>{mmss(home?.avgSec ?? 0)}</b></div>
            <div className="stat"><small>예약 구간까지 본 비율</small><b>{Math.round(((d.sections?.find((s) => s.id === "book")?.reach ?? 0) / reachBase) * 100)}%</b></div>
            <div className="stat"><small>클릭 수</small><b>{(d.clicks ?? []).reduce((a, c) => a + c.n, 0)}</b></div>
          </div>

          <h4 className="ins-h">홈에서 구간별로 머문 시간 <small>평균 · 본 사람 비율</small></h4>
          {d.sections?.length ? (
            <Bars rows={d.sections.map((s) => ({ label: s.label, n: s.avgSec, sub: `${mmss(s.avgSec)} · ${Math.round((s.reach / reachBase) * 100)}%` }))} />
          ) : <p className="vnote">아직 기록이 없어요.</p>}

          <h4 className="ins-h">영상 시청 <small>재생 · 끝까지 본 수 (2026-11-11부터)</small></h4>
          <Bars rows={(d.videos ?? []).map((v) => ({ label: v.name, n: v.plays, sub: `재생 ${v.plays} · 끝까지 ${v.ends}` }))} />

          <h4 className="ins-h">홈에서 많이 누른 것</h4>
          {homeClicks.length ? <Bars rows={homeClicks.slice(0, 15).map((c) => ({ label: c.label, n: c.n }))} /> : <p className="vnote">아직 기록이 없어요.</p>}

          {otherClicks.length > 0 && (
            <>
              <h4 className="ins-h">다른 페이지에서 누른 것</h4>
              <Bars rows={otherClicks.slice(0, 10).map((c) => ({ label: `${PAGE_NAME[c.path] ?? c.path} · ${c.label}`, n: c.n }))} />
            </>
          )}

          <h4 className="ins-h">어디서 왔는지</h4>
          {d.refs?.length ? <Bars rows={d.refs.filter((r) => r.name !== "사이트 안 이동").map((r) => ({ label: r.name, n: r.n }))} /> : <p className="vnote">아직 기록이 없어요.</p>}

          <h4 className="ins-h">페이지별 <small>열람 수 · 평균 머문 시간</small></h4>
          {d.pages?.length ? <Bars rows={d.pages.map((p) => ({ label: PAGE_NAME[p.path] ?? p.path, n: p.views, sub: `${p.views}회 · ${mmss(p.avgSec)}` }))} /> : <p className="vnote">아직 기록이 없어요.</p>}
        </>
      )}
    </div>
  );
}

type VocItem = { id: string; url: string; title: string; content: string; type: string; branch: string; priority: string; created: string };
const VOC_BRANCH: Record<string, string> = {
  "온기PT&근막이완": "온기PT&근막이완",
  "온기 근막이완 더프라이빗": "온기 근막이완",
  "신반포스퀘어점": "신반포스퀘어점",
  "선릉점": "선릉점",
};
const vocDate = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${String(d.getUTCFullYear()).slice(2)}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")} (${DOW[d.getUTCDay()]})`;
};
function VocBoard({ staffKey }: { staffKey: string }) {
  const [items, setItems] = useState<VocItem[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [br, setBr] = useState("all");
  const [ty, setTy] = useState("all");
  const load = useCallback((fresh = false) => {
    setBusy(true); setErr("");
    fetch(`/api/staff/voc${fresh ? "?fresh=1" : ""}`, { headers: { "x-staff-key": staffKey } })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setItems(j.items)))
      .catch(() => setErr("고객의 소리를 불러오지 못했어요."))
      .finally(() => setBusy(false));
  }, [staffKey]);
  useEffect(() => { load(); }, [load]);
  const all = items ?? [];
  const branches = Object.keys(VOC_BRANCH).filter((b) => all.some((x) => x.branch === b));
  const list = all.filter((x) => (br === "all" || x.branch === br) && (ty === "all" || x.type === ty));
  const good = all.filter((x) => x.type === "좋았어요").length;
  const bad = all.filter((x) => x.type === "아쉬웠어요").length;
  const month = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 7);
  const thisMonth = all.filter((x) => new Date(new Date(x.created).getTime() + 9 * 3_600_000).toISOString().startsWith(month)).length;
  return (
    <>
      {err && <div className="err">{err}</div>}
      {!items && !err && <p className="vnote">불러오는 중…</p>}
      {items && (
        <>
          <div className="stats">
            <div className="stat"><small>전체</small><b>{all.length}</b></div>
            <div className="stat"><small>좋았어요</small><b style={{ color: "var(--ok)" }}>{good}</b></div>
            <div className="stat"><small>아쉬웠어요</small><b style={{ color: "#9e0a0a" }}>{bad}</b></div>
            <div className="stat"><small>이번 달</small><b>{thisMonth}</b></div>
          </div>
          <div className="branch visits">
            <h3>지점별 <small>좋았어요 · 아쉬웠어요</small></h3>
            <ul className="voc-br">
              {branches.map((b) => {
                const g = all.filter((x) => x.branch === b && x.type === "좋았어요").length;
                const n = all.filter((x) => x.branch === b && x.type === "아쉬웠어요").length;
                const t = Math.max(1, g + n);
                return (
                  <li key={b}>
                    <span className="ins-l">{VOC_BRANCH[b] ?? b}</span>
                    <span className="voc-bar"><i className="g" style={{ width: `${(g / t) * 100}%` }} /><i className="n" style={{ width: `${(n / t) * 100}%` }} /></span>
                    <b><span style={{ color: "var(--ok)" }}>{g}</span> · <span style={{ color: "#9e0a0a" }}>{n}</span></b>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="voc-filter">
            <div className="chips">
              <button className="chip" aria-pressed={br === "all"} onClick={() => setBr("all")}>전 지점</button>
              {branches.map((b) => <button key={b} className="chip" aria-pressed={br === b} onClick={() => setBr(b)}>{VOC_BRANCH[b] ?? b}</button>)}
            </div>
            <div className="chips">
              {[["all", "전체"], ["좋았어요", "좋았어요"], ["아쉬웠어요", "아쉬웠어요"]].map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={ty === v} onClick={() => setTy(v)}>{l}</button>
              ))}
              <button className="ghost" onClick={() => load(true)} disabled={busy}>{busy ? "불러오는 중…" : "새로고침"}</button>
            </div>
          </div>
          <ul className="voc-list">
            {list.map((x) => (
              <li key={x.id} className={x.type === "아쉬웠어요" ? "bad" : "good"}>
                <div className="voc-meta">
                  <span className={`voc-type ${x.type === "아쉬웠어요" ? "bad" : "good"}`}>{x.type || "미분류"}</span>
                  <span>{vocDate(x.created)}</span>
                  {x.priority && <span className={`voc-pri p-${x.priority}`}>{x.priority}</span>}
                </div>
                <b className="voc-title">{VOC_BRANCH[x.branch] ?? (x.branch || "지점 미선택")}</b>
                <p>{x.content || "(내용 없음)"}</p>
                <a href={x.url} target="_blank" rel="noopener noreferrer">노션에서 열기 ›</a>
              </li>
            ))}
            {!list.length && <p className="vnote">해당하는 의견이 없어요.</p>}
          </ul>
        </>
      )}
    </>
  );
}
