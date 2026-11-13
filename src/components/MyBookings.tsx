"use client";
import { useCallback, useEffect, useState } from "react";

/** 처음에 보여줄 예약 수 (스케줄 고정 회원은 일정이 많아서) */
const SHOW = 3;
import { KAKAO_CHAT_URL, MonthCalendar, api, type Slot } from "./BookingFlow";

type Hist = { t: "book" | "change" | "cancel"; date: string; hour: number; minute: number; to?: { date: string; hour: number; minute: number }; sameDay?: boolean };
const ymd = (date: string, hour: number, minute: number) => `${date.slice(2).replace(/-/g, ".")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
type Act = { token: string; who: string; kind: string; branchId: string; trainerId: string; changeable: boolean; cancelable: boolean; changedToday: boolean; sameDay?: boolean };
type Item = { date: string; hour: number; minute: number; branchName: string; trainerName: string; web: boolean; act?: Act };
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const day = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
};
const when = (i: { date: string; hour: number; minute?: number }) => `${day(i.date)} ${String(i.hour).padStart(2, "0")}:${String(i.minute ?? 0).padStart(2, "0")}`;

/** 회원 페이지: 다가오는 내 예약 + 바로 변경·취소 (본인 확인된 폰이라 4자리를 다시 묻지 않음) */
export default function MyBookings({ token, last4 }: { token: string; last4?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [askCancel, setAskCancel] = useState<Item | null>(null);
  const [contact, setContact] = useState("");
  const [changing, setChanging] = useState<Item | null>(null);
  const [days, setDays] = useState<Record<string, Slot[]> | null>(null);
  const [pickDay, setPickDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);
  const [showHist, setShowHist] = useState(false);

  const load = useCallback(() => {
    if (!last4) return;
    fetch("/api/members/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, last4 }) })
      .then((r) => r.json())
      .then((j) => (j.items ? (setItems(j.items), setHistory(j.history ?? []), setErr("")) : setErr(j.error && j.error !== "invalid" ? j.error : "")))
      .catch(() => setErr("예약을 불러오지 못했어요."));
  }, [token, last4]);
  useEffect(() => {
    load();
    const on = () => setTimeout(load, 800);
    window.addEventListener("ongi-booked", on);
    return () => window.removeEventListener("ongi-booked", on);
  }, [load]);

  async function cancel(i: Item) {
    if (!i.act) return;
    setBusy(true); setErr("");
    try {
      await api("/api/my/cancel", { method: "POST", body: JSON.stringify({ token: i.act.token, who: i.act.who, last4 }) });
      setMsg(`${when(i)} 예약을 취소했어요.`);
      setAskCancel(null);
      load();
    } catch (e) {
      setAskCancel(null);
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  async function startChange(i: Item) {
    if (!i.act) return;
    setMsg(""); setErr("");
    if (changing === i) { setChanging(null); return; }
    if (!i.act.changeable || i.act.changedToday) {
      setContact(i.act.kind === "member" ? "기존 회원 예약은 예약 2시간 전까지, 같은 날 한 번만 직접 변경할 수 있어요." : "예약 당일에는 직접 변경이 어려워요(전날 자정까지 가능).");
      return;
    }
    setChanging(i); setDays(null); setPickDay(null); setHour(null);
    const q = new URLSearchParams({ branch: i.act.branchId });
    if (i.act.kind === "member") { q.set("trainer", i.act.trainerId); q.set("change", "1"); }
    try {
      const r = await api<{ days: Record<string, Slot[]> }>(`/api/availability?${q}`);
      // 당일 예약은 오늘 다른 시간으로만 변경 (2026-11-13)
      const d = i.act.kind === "member" && i.act.sameDay ? Object.fromEntries(Object.entries(r.days).filter(([k]) => k === i.date)) : r.days;
      if (i.act.kind === "member" && i.act.sameDay && !(d[i.date] ?? []).some((x) => x.available)) {
        setChanging(null);
        setContact("당일 예약은 오늘 다른 시간으로만 변경할 수 있어요. 지금은 오늘 변경 가능한 시간이 없어요.");
        return;
      }
      r.days = d;
      setDays(r.days);
      const first = Object.entries(r.days).find(([, s]) => s.some((x) => x.available));
      setPickDay(first ? first[0] : null);
      setTimeout(() => document.getElementById("mb-change")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e) { setErr((e as Error).message); setChanging(null); }
  }

  async function change() {
    if (!changing?.act || !pickDay || hour == null) return;
    setBusy(true); setErr("");
    try {
      await api("/api/my/change", { method: "POST", body: JSON.stringify({ token: changing.act.token, who: changing.act.who, last4, date: pickDay, hour }) });
      setMsg(`${when({ date: pickDay, hour })}으로 변경했어요.`);
      setChanging(null);
      load();
    } catch (e) {
      const c = e as Error & { contact?: boolean };
      if (c.contact) { setChanging(null); setContact(c.message); } else setErr(c.message);
    } finally { setBusy(false); }
  }

  if (!last4) return <AskLast4 token={token} />;
  const slots = pickDay && days ? days[pickDay] ?? [] : [];
  return (
    <div className="mp-upcoming">
      <h3>내 예약</h3>
      {msg && <p className="okmsg">{msg}</p>}
      {err && <p className="err">{err}</p>}
      {!items && !err && <p className="mp-note">불러오는 중…</p>}
      {items && (items.length ? (
        <>
        <ul>
          {(showAll ? items : items.slice(0, SHOW)).map((i, k) => (
            <li key={k}>
              <div className="mb-row">
                <b>{when(i)}</b>
                <span>{i.branchName} · {i.trainerName} 선생님</span>
              </div>
              {i.act ? (
                <div className="mb-btns">
                  <button className="ghost" disabled={busy} aria-pressed={changing === i} onClick={() => startChange(i)}>{changing === i ? "변경 닫기" : "변경"}</button>
                  <button
                    className="ghost danger"
                    disabled={busy}
                    onClick={() => (i.act!.cancelable ? setAskCancel(i) : setContact(i.act!.kind === "member" ? "이미 시작했거나 지난 예약은 직접 취소할 수 없어요." : "취소는 예약 전날 자정까지만 직접 할 수 있어요."))}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <p className="mp-note mb-hint">선생님이 잡은 일정이에요. 변경·취소는 담당 선생님께 문의해 주세요.</p>
              )}
              {changing === i && (
                <div id="mb-change" className="mychange">
                  {!days && <p className="mp-note">예약 가능한 시간을 불러오는 중이에요…</p>}
                  {days && <MonthCalendar days={days} selected={pickDay} onPick={(d) => { setPickDay(d); setHour(null); }} />}
                  {days && pickDay && (
                    <div className="times">
                      {slots.map((s) => (
                        <button key={s.hour} className="chip" disabled={!s.available} aria-pressed={hour === s.hour} onClick={() => setHour(s.hour)}>{s.hour}:00</button>
                      ))}
                    </div>
                  )}
                  <button className="primary" disabled={busy || !pickDay || hour == null} onClick={change}>
                    {busy ? "변경 중…" : pickDay && hour != null ? `${when({ date: pickDay, hour })}으로 변경` : "새 시간을 골라주세요"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {items.length > SHOW && (
          <button className="mb-more" onClick={() => setShowAll(!showAll)}>{showAll ? "접기" : `예약 ${items.length - SHOW}건 더 보기`}</button>
        )}
        </>
      ) : <p className="mp-note">다가오는 예약이 없어요.</p>)}

      <button className="mb-hist-btn" aria-expanded={showHist} onClick={() => setShowHist(!showHist)}>예약 내역 {showHist ? "▴" : "▾"}</button>
      {showHist && (
        history.length ? (
          <ul className="mb-hist">
            {history.map((h, k) => (
              <li key={k}>
                <span>{ymd(h.date, h.hour, h.minute)}</span>
                {h.t === "change" && h.to ? <span>→ {ymd(h.to.date, h.to.hour, h.to.minute)}</span> : null}
                <b className={`h-${h.t}${h.sameDay ? " h-same" : ""}`}>{h.t === "book" ? "예약" : h.t === "change" ? "변경" : h.sameDay ? "당일 취소(차감)" : "취소"}</b>
              </li>
            ))}
          </ul>
        ) : <p className="mp-note">홈페이지에서 한 예약·변경·취소가 여기에 쌓여요. (2026.11.13부터)</p>
      )}

      {askCancel && (
        <div className="pop-bg" onClick={() => !busy && setAskCancel(null)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="예약 취소" onClick={(e) => e.stopPropagation()}>
            <h3>예약을 취소하시겠습니까?</h3>
            <p>{when(askCancel)} · {askCancel.branchName} {askCancel.trainerName} 선생님</p>
            {askCancel.act?.sameDay && askCancel.act.kind === "member" && <p className="same-day-warn">당일 취소는 차감됩니다.</p>}
            <button className="primary danger-fill" disabled={busy} onClick={() => cancel(askCancel)}>{busy ? "취소 중…" : "예약 취소"}</button>
            <button className="mp-forget" disabled={busy} onClick={() => setAskCancel(null)}>닫기</button>
          </div>
        </div>
      )}
      {contact && (
        <div className="pop-bg" onClick={() => setContact("")}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="문의 안내" onClick={(e) => e.stopPropagation()}>
            <h3>담당 선생님께 문의해 주세요</h3>
            <p>{contact}</p>
            <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
            <button className="mp-forget" onClick={() => setContact("")}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 예전에 로그인해 뒷번호가 저장 안 된 폰: 한 번만 입력받아 저장 (이후엔 다시 묻지 않음) */
function AskLast4({ token }: { token: string }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/members/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, last4: v, check: true }) });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error && j.error !== "invalid" ? j.error : "번호가 맞지 않아요.");
      try {
        const saved = JSON.parse(localStorage.getItem("ongi-member") || "null");
        if (saved) localStorage.setItem("ongi-member", JSON.stringify({ ...saved, last4: v }));
      } catch {}
      window.dispatchEvent(new CustomEvent("ongi-last4", { detail: v }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="mp-upcoming">
      <h3>내 예약</h3>
      <p className="mp-note">이 폰에서 처음 한 번만 연락처 뒷 4자리를 확인할게요. 이후에는 다시 묻지 않아요.</p>
      <div className="bd-reply">
        <input inputMode="numeric" maxLength={4} placeholder="뒷 4자리" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        <button className="ghost" disabled={busy || v.length !== 4} onClick={submit}>{busy ? "확인 중…" : "확인"}</button>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
