"use client";

import { useCallback, useEffect, useState } from "react";

type Ev = { title: string; allDay: boolean; start: string; end: string; startHour: number; kind: "trial" | "member" | "other"; fromWeb: boolean };
type T = { id: string; name: string; connected: boolean; events: Ev[] };
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
