"use client";

import { useCallback, useEffect, useState } from "react";

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
      <div className="brand"><small>Conditioning Studio</small><h1>지점 스케줄</h1></div>
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
      <Visits v={visits} />
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
              <div className="dayoff" key={`nc-${t.id}`}>{t.name} 선생님 캘린더가 아직 연결되지 않았어요.</div>
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
