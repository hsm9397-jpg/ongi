"use client";
import { mapSrc } from "@/lib/map";

import { useEffect, useState } from "react";

type PubBranch = { id: string; name: string; short: string; womenOnly: boolean; hidden: boolean; only?: "pt"; bookable: boolean; trialClosed: boolean; desc: string; notice: string; address: string; mapQuery: string; naverTrial: string; naverPt: string; photos: string[]; waitlist: boolean; lat: number; lng: number; trainers: { id: string; name: string }[] };
export type Slot = { hour: number; available: boolean };
type Membership = { branch: string; branchName: string; trainerId?: string; trainers: { id: string; name: string; selfBook?: boolean }[] };
type Done = { kind: "trial" | "member" | "pt"; branchName: string; date: string; hour: number; minutes: number; trainerName: string; name: string };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const CONTRA_ABS: [string, string][] = [
  ["피부 결손", "열린 상처, 감염성 피부 질환, 급성 발진이 있는 부위"],
  ["혈관 문제", "심부정맥 혈전증(DVT), 혈전 관련 문제"],
  ["출혈성 질환", "혈우병, 중증 혈소판 감소증"],
  ["급성 염증", "급성 염좌로 인해 심하게 붓고 열감이 있는 상태"],
  ["골절", "골절 미유합 부위"],
  ["림프 부종 환자", ""],
  ["기타", "암 환자의 종양 부위 직접 적용 금지, 감각 저하 부위 주의"],
];
const CONTRA_REL = ["임산부 / 고령자", "하지정맥류 (심하면 절대 금기 대상)", "항응고제 복용 환자", "골다공증 (심하면 절대 금기 대상)"];
export const KAKAO_CHAT_URL = "https://pf.kakao.com/_eYctn/chat";
/** 기존 회원 예약을 열지 여부. 세팅(선생님 캘린더 공유 등)이 끝나면 true로 바꾸면 됨 */
const MEMBER_BOOKING_READY = true;
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

type MyBooking = { token: string; branchId: string; branchName: string; trainerId: string; trainerName: string; kind: "trial" | "member" | "pt"; date: string; hour: number; minute: number; changeable: boolean; cancelable: boolean; changedToday: boolean; who: string; label: string };

/** 다음 단계가 화면 가운데(또는 위)에 오도록 부드럽게 이동 (렌더 뒤에) */
function focusOn(id: string, block: ScrollLogicalPosition = "center") {
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block }), 120);
}

// 회원 페이지(MemberPortal)가 이 폰에 기억해 둔 회원 정보 (같은 키)
const MEMBER_KEY = "ongi-member";
function rememberedMember(): { token: string; last4?: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(MEMBER_KEY) || "null");
    return v && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
/** 회원 페이지로 확인한 폰이면 예약 때 넣은 뒷번호도 기억해 둔다 (다음부터 바로 예약) */
function rememberLast4(last4: string) {
  try {
    const v = rememberedMember();
    if (v && !(v as { last4?: string }).last4) localStorage.setItem(MEMBER_KEY, JSON.stringify({ ...v, last4 }));
  } catch {}
}

/** 내 예약 확인·변경·취소 */
function ManageBookings() {
  const [pick, setPick] = useState<string | null>(null);
  const [last4, setLast4] = useState("");
  const [list, setList] = useState<MyBooking[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [changing, setChanging] = useState<MyBooking | null>(null);
  const [days, setDays] = useState<Record<string, Slot[]> | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [contactPop, setContactPop] = useState(false);

  async function lookup() {
    setErr(""); setMsg(""); setBusy(true); setChanging(null); setConfirmCancel(null);
    try {
      const r = await api<{ bookings: MyBooking[] }>("/api/my/lookup", { method: "POST", body: JSON.stringify({ last4 }) });
      setList(r.bookings);
      const labels = [...new Set(r.bookings.map((b) => b.label))];
      setPick((p) => (labels.length === 1 ? labels[0] : p && labels.includes(p) ? p : null));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(b: MyBooking) {
    setErr(""); setBusy(true);
    try {
      await api("/api/my/cancel", { method: "POST", body: JSON.stringify({ token: b.token, who: b.who, last4 }) });
      setMsg(`${fmtDay(b.date)} ${b.hour}:00 예약을 취소했어요.`);
      setConfirmCancel(null);
      await lookup();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startChange(b: MyBooking) {
    setErr(""); setMsg(""); setConfirmCancel(null);
    // 기존 회원은 같은 날 한 번만 직접 변경 가능
    if (b.changedToday) { setContactPop(true); return; }
    setChanging(b); setDays(null); setDay(null); setHour(null);
    const q = new URLSearchParams({ branch: b.branchId });
    if (b.kind === "member") { q.set("trainer", b.trainerId); q.set("change", "1"); }
    try {
      const r = await api<{ days: Record<string, Slot[]> }>(`/api/availability?${q}`);
      setDays(r.days);
      const first = Object.entries(r.days).find(([, s]) => s.some((x) => x.available));
      setDay(first ? first[0] : null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function change() {
    if (!changing || !day || hour == null) return;
    setErr(""); setBusy(true);
    try {
      await api("/api/my/change", { method: "POST", body: JSON.stringify({ token: changing.token, who: changing.who, last4, date: day, hour }) });
      setMsg(`${fmtDay(day)} ${hour}:00으로 변경했어요.`);
      setChanging(null);
      await lookup();
    } catch (e) {
      if ((e as Error & { contact?: boolean }).contact) { setChanging(null); setContactPop(true); }
      else setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const slots = day && days ? days[day] ?? [] : [];

  return (
    <div className="step">
      {contactPop && (
        <div className="pop-bg" onClick={() => setContactPop(false)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="변경 안내" onClick={(e) => e.stopPropagation()}>
            <h3>담당 선생님께 문의해 주세요</h3>
            <p>기존 회원 예약은 예약 2시간 전까지, 같은 날 한 번만 직접 변경할 수 있어요.</p>
            <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
            <button className="mp-forget" onClick={() => setContactPop(false)}>닫기</button>
          </div>
        </div>
      )}
      <h3>예약 조회</h3>
      <div className="field">
        <label htmlFor="myp">연락처 뒷 4자리</label>
        <input id="myp" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => { setLast4(e.target.value.replace(/\D/g, "")); setList(null); setPick(null); }} />
      </div>
      <button className="ghost" disabled={busy || last4.length !== 4} onClick={lookup}>
        {busy && !list ? "조회 중…" : "내 예약 조회"}
      </button>
      {msg && <p className="okmsg">{msg}</p>}
      {err && <p className="err">{err}</p>}

      {list && list.length === 0 && (
        <p className="note">홈페이지로 예약하신 내역이 없어요. 다른 방법으로 예약하셨다면 카카오톡으로 문의해 주세요.</p>
      )}

      {list && new Set(list.map((b) => b.label)).size > 1 && (
        <div className="field">
          <label>예약자를 골라주세요</label>
          <div className="chips">
            {[...new Set(list.map((b) => b.label))].map((l) => (
              <button key={l} type="button" className="chip" aria-pressed={pick === l} onClick={() => setPick(l)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {list && list.length > 0 && pick && (
        <ul className="mylist">
          {list.filter((b) => b.label === pick).map((b) => (
            <li key={b.token} className="mybook">
              <div className="mybook-main">
                <b>{fmtDay(b.date)} {b.hour}:{String(b.minute).padStart(2, "0")}</b>
                <span>{b.branchName} · {b.trainerName} 선생님 · {b.kind === "trial" ? "체험" : b.kind === "pt" ? "PT 상담·평가" : "회원"}</span>
              </div>
              {b.changeable || b.cancelable ? (
                confirmCancel === b.token ? (
                  <div className="mybook-actions">
                    <span className="err">이 예약을 취소할까요?</span>
                    <button className="ghost danger" disabled={busy} onClick={() => cancel(b)}>네, 취소</button>
                    <button className="ghost" onClick={() => setConfirmCancel(null)}>아니요</button>
                  </div>
                ) : (
                  <div className="mybook-actions">
                    {b.changeable ? (
                      <button className="ghost" disabled={busy} onClick={() => startChange(b)}>시간 변경</button>
                    ) : (
                      <button className="ghost" onClick={() => setContactPop(true)}>시간 변경</button>
                    )}
                    {b.cancelable && <button className="ghost danger" disabled={busy} onClick={() => setConfirmCancel(b.token)}>취소</button>}
                    {!b.cancelable && <span className="mybook-hint">취소는 예약 전날 자정까지만 직접 할 수 있어요. 지금은 담당 선생님께 문의해 주세요.</span>}
                  </div>
                )
              ) : (
                <p className="note">
                  {b.kind === "member" ? "예약 2시간 전부터는 직접 변경이 어려워요. 담당 선생님께 문의해 주세요." : "예약 당일에는 직접 변경·취소가 어려워요(전날 자정까지 가능). 카카오톡으로 문의해 주세요."}
                </p>
              )}
              {changing?.token === b.token && (
                <div className="mychange">
                  {!days && <p className="loading">예약 가능한 시간을 불러오는 중이에요…</p>}
                  {days && <MonthCalendar days={days} selected={day} onPick={(d) => { setDay(d); setHour(null); }} />}
                  {days && day && (
                    <div className="times">
                      {slots.map((s) => (
                        <button key={s.hour} className="chip" disabled={!s.available} aria-pressed={hour === s.hour} onClick={() => setHour(s.hour)}>
                          {s.hour}:00
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mybook-actions">
                    <button className="primary" disabled={busy || !day || hour == null} onClick={change}>
                      {busy ? "변경 중…" : day && hour != null ? `${fmtDay(day)} ${hour}:00으로 변경` : "새 시간을 골라주세요"}
                    </button>
                    <button className="ghost" onClick={() => setChanging(null)}>닫기</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 지점 소개 + 위치(펼치기) */
function BranchInfo({ b }: { b: PubBranch }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="binfo">
      <p className="bdesc">{b.desc}</p>
      {b.notice && <p className="bnotice">{b.notice}</p>}
      {b.address && (
        <>
          <button className="loc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            위치 보기 <span aria-hidden>{open ? "▴" : "▾"}</span>
          </button>
          {open && (
            <div className="loc">
              <p className="addr">{b.address}</p>
              <iframe title={`${b.short} 지도`} src={mapSrc(b.lat, b.lng, b.mapQuery || b.address)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
        </>
      )}
      {!b.bookable && (
        <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
      )}
    </div>
  );
}

/** 한 달 달력: 예약 가능한 날만 누를 수 있음 */
export function MonthCalendar({ days, selected, onPick }: { days: Record<string, Slot[]>; selected: string | null; onPick: (d: string) => void }) {
  const keys = Object.keys(days).sort();
  const months = Array.from(new Set(keys.map((k) => k.slice(0, 7))));
  const [idx, setIdx] = useState(() => Math.max(0, months.indexOf((selected ?? keys[0] ?? "").slice(0, 7))));
  const ym = months[Math.min(idx, months.length - 1)];
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const last = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" aria-label="이전 달" disabled={idx <= 0} onClick={() => setIdx(idx - 1)}>‹</button>
        <b>{y}년 {m}월</b>
        <button className="cal-nav" aria-label="다음 달" disabled={idx >= months.length - 1} onClick={() => setIdx(idx + 1)}>›</button>
      </div>
      <div className="cal-grid">
        {DOW.map((d, i) => <span key={d} className={`cal-dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>{d}</span>)}
        {cells.map((d, i) => {
          if (d == null) return <span key={`e${i}`} />;
          const key = ymd(y, m - 1, d);
          const slots = days[key];
          const n = slots ? slots.filter((x) => x.available).length : 0;
          const state = !slots ? "out" : n ? "open" : "full";
          return (
            <button key={key} className={`cal-day ${state}`} disabled={state !== "open"} aria-pressed={selected === key} onClick={() => onPick(key)}
              aria-label={`${m}월 ${d}일 ${state === "open" ? `${n}자리` : state === "full" ? "마감" : "예약 불가"}`}>
              <b>{d}</b>
              <small>{state === "open" ? `${n}자리` : state === "full" ? "마감" : ""}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const dateObj = (d: string) => new Date(`${d}T00:00:00`);
const fmtDay = (d: string) => {
  const x = dateObj(d);
  return `${x.getMonth() + 1}월 ${x.getDate()}일 (${DOW[x.getDay()]})`;
};

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "문제가 생겼어요. 잠시 후 다시 시도해 주세요."), { contact: !!data.contact });
  return data as T;
}

export default function BookingFlow(props: { branches: PubBranch[]; trialPrice: string; sessionMinutes: number; comingSoon: string[]; memberOnly?: boolean }) {
  const { branches, trialPrice, sessionMinutes, comingSoon, memberOnly } = props;
  const [kind, setKind] = useState<"trial" | "member" | "pt">(memberOnly ? "member" : "trial");
  const [manage, setManage] = useState(false);
  const [branch, setBranch] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, Slot[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [expiredPop, setExpiredPop] = useState(false);
  const [waitPop, setWaitPop] = useState<PubBranch | null>(null);
  const [closedPop, setClosedPop] = useState(false);

  // 체험
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  // 회원
  const [who, setWho] = useState("");
  const [label, setLabel] = useState("");
  const [left, setLeft] = useState<{ remaining: number; total: number } | null>(null);
  const [choices, setChoices] = useState<{ label: string; who: string }[] | null>(null);
  const [last4, setLast4] = useState("");
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [trainer, setTrainer] = useState<string | null>(null);

  const ptBranch = branches.find((b) => b.only === "pt");
  const activeBranch = kind === "member" ? membership?.branch ?? null : null;
  const needTrainer = kind === "member";
  // 직접 일정을 잡는 선생님이면 날짜를 불러오지 않고 '직접 문의' 안내를 띄운다
  const selfBook = needTrainer && !!membership?.trainers.find((t) => t.id === trainer)?.selfBook;
  const [selfPop, setSelfPop] = useState(false);
  const [prepPop, setPrepPop] = useState(false);
  useEffect(() => setSelfPop(selfBook), [selfBook, trainer]);

  function resetSlots() {
    setDay(null);
    setHour(null);
    setErr("");
  }

  const activeInfo = branches.find((b) => b.id === activeBranch);
  const activeBookable = activeInfo ? activeInfo.bookable : true;

  useEffect(() => {
    if (!activeBranch || (needTrainer && !trainer) || selfBook) {
      setDays(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDays(null);
    const q = new URLSearchParams({ branch: activeBranch });
    if (needTrainer && trainer) q.set("trainer", trainer);
    api<{ days: Record<string, Slot[]> }>(`/api/availability?${q}`)
      .then((r) => {
        if (cancelled) return;
        setDays(r.days);
        const first = Object.entries(r.days).find(([, s]) => s.some((x) => x.available));
        setDay(first ? first[0] : null);
        // 회원 확인·선생님 선택 뒤 날짜 고르는 곳이 화면 가운데 오도록
        focusOn("bk-date");
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeBranch, trainer, needTrainer, selfBook]);

  // 회원 페이지 안에서 열린 예약 창: 이 폰에 기억된 회원이면 바로 확인
  useEffect(() => {
    if (!memberOnly) return;
    const saved = rememberedMember();
    if (saved?.last4) autoVerify(saved);
    else setTimeout(() => (document.getElementById("mp") as HTMLInputElement | null)?.focus({ preventScroll: true }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 홈페이지의 버튼(#trial, #member, #pt, #my)으로 예약 종류를 바로 열기
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.replace("#", ""));
      if (h === "my") setManage(true);
      else if (h === "trial" || h === "member" || h === "pt") switchKind(h);
      else return;
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
      // 기존 회원 예약: 회원 페이지에서 이미 확인한 폰이면 바로 담당 선생님 단계로, 아니면 뒷 4자리 칸에 커서
      if (h === "member" && MEMBER_BOOKING_READY) {
        const saved = rememberedMember();
        if (saved?.last4) autoVerify(saved);
        else setTimeout(() => (document.getElementById("mp") as HTMLInputElement | null)?.focus({ preventScroll: true }), 400);
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    // 주소에 #이 남으면 새로고침할 때마다 그 위치로 튀므로, 페이지 안 이동은 주소를 바꾸지 않고 직접 스크롤한다
    const clearHash = () => {
      if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null;
      const h = a?.getAttribute("href");
      if (!h || h === "#") return;
      e.preventDefault();
      if (h === "#trial" || h === "#member" || h === "#pt" || h === "#my") {
        history.replaceState(null, "", h);
        apply();
      } else {
        const el = document.getElementById(h.slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }
      clearHash();
    };
    apply();
    clearHash();
    window.addEventListener("hashchange", apply);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", apply);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchKind(k: "trial" | "member" | "pt") {
    if (k === "member" && !MEMBER_BOOKING_READY) {
      setPrepPop(true);
      return;
    }
    setKind(k);
    setManage(false);
    setBranch(null);
    setMembership(null);
    setMemberships(null);
    setTrainer(null);
    resetSlots();
  }

  function chooseMembership(m: Membership) {
    setMembership(m);
    setTrainer(m.trainerId ?? (m.trainers.length === 1 ? m.trainers[0].id : null));
    resetSlots();
  }

  async function autoVerify(saved: { token: string; last4?: string }) {
    if (!saved.last4) return;
    setLast4(saved.last4);
    let pick: string | undefined;
    try {
      const r = await fetch("/api/members/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: saved.token }) });
      pick = (await r.json()).who;
    } catch {}
    await verify(saved.last4, pick, true);
  }

  async function verify(code = last4, pick?: string, auto = false) {
    if (busy || code.length !== 4) return;
    setErr("");
    setBusy(true);
    setChoices(null);
    setMemberships(null);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last4: code, who: pick }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.expired) {
        setExpiredPop(true);
        return;
      }
      if (!res.ok) {
        if (auto && pick) return verify(code, undefined, false);
        throw new Error(data.error || "문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      }
      if (data.choices) {
        setChoices(data.choices);
        return;
      }
      const r = data as { who: string; label: string; memberships: Membership[] };
      rememberLast4(code);
      setWho(r.who);
      setLabel(r.label);
      setLeft(null);
      // 잔여 회차는 예약 진행을 막지 않도록 뒤에서 따로 불러온다
      fetch("/api/member/remaining", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ who: r.who }) })
        .then((x) => x.json())
        .then((x) => x.remaining != null && setLeft({ remaining: x.remaining, total: x.total }))
        .catch(() => {});
      setMemberships(r.memberships);
      if (r.memberships.length === 1) chooseMembership(r.memberships[0]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!activeBranch || !day || hour == null) return;
    setErr("");
    if (kind !== "member" && (name.trim().length < 2 || phone.replace(/\D/g, "").length < 10)) {
      setErr("이름과 연락처를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ booking: Done }>("/api/book", {
        method: "POST",
        body: JSON.stringify(
          kind !== "member"
            ? { kind, branch: activeBranch, date: day, hour, name, phone, memo }
            : { kind, branch: activeBranch, date: day, hour, who, last4, trainer }
        ),
      });
      setDone(r.booking);
      try { window.dispatchEvent(new Event("ongi-booked")); } catch {}
    } catch (e) {
      setErr((e as Error).message);
      setHour(null);
      // 자리가 바뀌었을 수 있으니 다시 불러오기
      const q = new URLSearchParams({ branch: activeBranch });
      if (trainer && needTrainer) q.set("trainer", trainer);
      api<{ days: Record<string, Slot[]> }>(`/api/availability?${q}`).then((x) => setDays(x.days)).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="book done">
        <h2>예약이 확정됐어요</h2>
        <dl className="summary">
          <dt>구분</dt>
          <dd>{done.kind === "trial" ? "첫 방문 체험" : done.kind === "pt" ? "PT 상담·평가 (무료)" : "기존 회원 예약"}</dd>
          <dt>지점</dt>
          <dd>{done.branchName}</dd>
          <dt>일시</dt>
          <dd>
            {fmtDay(done.date)} {done.hour}:00 ({done.minutes}분)
          </dd>
          <dt>담당</dt>
          <dd>{done.trainerName} 선생님</dd>
          <dt>예약자</dt>
          <dd>{done.name}</dd>
        </dl>
        <p className="note">예약 전날 안내 메시지를 보내드려요. 변경·취소는 첫 화면의 &quot;내 예약 확인 · 변경 · 취소&quot;에서 예약 전날 자정까지 직접 할 수 있어요.</p>
        <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
        <button className="ghost" onClick={() => { setDone(null); switchKind(kind); }}>
          처음으로
        </button>
      </div>
    );
  }

  const slots = day && days ? days[day] ?? [] : [];
  const trainerName = membership?.trainers.find((t) => t.id === trainer)?.name;

  return (
    <div className="book">
      {prepPop && (
        <div className="pop-bg" onClick={() => setPrepPop(false)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="기존 회원 예약 안내" onClick={(e) => e.stopPropagation()}>
            <h3>준비중입니다.</h3>
            <p>기존 회원 예약은 지금처럼 담당 선생님 또는 카카오톡으로 문의해 주세요.</p>
            <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
            <button className="mp-forget" onClick={() => setPrepPop(false)}>닫기</button>
          </div>
        </div>
      )}
      {selfPop && (
        <div className="pop-bg" onClick={() => setSelfPop(false)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="예약 안내" onClick={(e) => e.stopPropagation()}>
            <h3>담당 선생님께 직접 문의해 주세요</h3>
            <p>{trainerName ? `${trainerName} 선생님은 ` : ""}회원님과 직접 일정을 잡고 있어요.</p>
            <button className="mp-forget" onClick={() => setSelfPop(false)}>닫기</button>
          </div>
        </div>
      )}
      {closedPop && (
        <div className="pop-bg" onClick={() => setClosedPop(false)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="예약 안내" onClick={(e) => e.stopPropagation()}>
            <h3>현재 예약이 어렵습니다</h3>
            <p>현재 가장 빠른 선릉점을 이용해 주세요.</p>
            {(() => {
              const f = branches.find((x) => !x.hidden && x.bookable && !x.trialClosed && !x.waitlist && x.naverTrial);
              return f ? (
                <a className="primary" href={f.naverTrial} target="_blank" rel="noopener noreferrer" onClick={() => setClosedPop(false)}>
                  {f.short} 예약하러 가기
                </a>
              ) : null;
            })()}
            <button className="mp-forget" onClick={() => setClosedPop(false)}>닫기</button>
          </div>
        </div>
      )}
      {waitPop && (
        <div className="pop-bg" onClick={() => setWaitPop(null)}>
          <div className="pop wait" role="dialog" aria-modal="true" aria-label="대기 예약 안내" onClick={(e) => e.stopPropagation()}>
            <h3>{waitPop.short}은 대기 예약만 가능합니다</h3>
            <ul>
              <li>해당 지점 아무 날짜나 예약합니다.</li>
              <li className="wait-key">해당 예약 날짜와 시간은 확정이 아닙니다.</li>
              <li>순번이 되면 담당자가 개별 연락을 드려 일정을 조율합니다. 이때 예약 확정입니다.</li>
              <li>예약자 정보에 가능한 시간대를 구체적으로 적어주실수록 일정을 앞당겨 연락드릴 수 있습니다.</li>
              <li>현재 가장 빠른 일정은 선릉점입니다.</li>
            </ul>
            <a className="primary" href={waitPop.naverTrial} target="_blank" rel="noopener noreferrer" onClick={() => setWaitPop(null)}>
              예약하러 가기
            </a>
            {(() => {
              const f = branches.find((x) => !x.hidden && x.bookable && !x.trialClosed && !x.waitlist && x.naverTrial);
              return f ? (
                <a className="ghost" href={f.naverTrial} target="_blank" rel="noopener noreferrer" onClick={() => setWaitPop(null)}>
                  {f.short} 예약하러 가기
                </a>
              ) : null;
            })()}
            <button className="mp-forget" onClick={() => setWaitPop(null)}>닫기</button>
          </div>
        </div>
      )}
      {expiredPop && (
        <div className="pop-bg" role="dialog" aria-modal="true" aria-labelledby="exp-title" onClick={() => setExpiredPop(false)}>
          <div className="pop" onClick={(e) => e.stopPropagation()}>
            <h3 id="exp-title">회원권이 만료되었어요</h3>
            <p>회원님의 이용권 기간이 끝나 예약할 수 없어요. 재등록이나 문의는 카카오톡으로 바로 남겨 주세요.</p>
            <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기</a>
            <button className="ghost" onClick={() => setExpiredPop(false)}>닫기</button>
          </div>
        </div>
      )}
      {!memberOnly && (
      <div className="kind kind3" role="tablist" aria-label="예약 종류">
        <button role="tab" aria-pressed={!manage && kind === "trial"} aria-selected={!manage && kind === "trial"} onClick={() => switchKind("trial")}>
          <b>근막이완<br />체험 신청</b>
        </button>
        {ptBranch && (
          <button role="tab" aria-pressed={!manage && kind === "pt"} aria-selected={!manage && kind === "pt"} onClick={() => switchKind("pt")}>
            <b>PT<br />상담·평가</b>
          </button>
        )}
        <button role="tab" aria-pressed={!manage && kind === "member"} aria-selected={!manage && kind === "member"} onClick={() => switchKind("member")}>
          <b>기존 회원<br />예약</b>
        </button>
      </div>
      )}
      {memberOnly ? (
        <button className="my-link" aria-pressed={manage} onClick={() => setManage(!manage)}>
          {manage ? "‹ 예약하기로 돌아가기" : <>내 예약 확인 · 변경 · 취소 <span aria-hidden>›</span></>}
        </button>
      ) : (
      <button className="my-link" aria-pressed={manage} onClick={() => setManage(true)}>
        내 예약 확인 · 변경 · 취소 <span aria-hidden>›</span>
      </button>
      )}

      {!manage && kind === "trial" && (
        <div className="contra">
          <h3>근막이완 금기 대상자 <span className="must">필수 확인</span></h3>
          <p className="contra-sub">해당되시면 예약 전에 카카오톡으로 먼저 문의해 주세요.</p>
          <h4>절대 금기</h4>
          <ul>
            {CONTRA_ABS.map(([k, v]) => (
              <li key={k}><b>{k}</b>{v ? `: ${v}` : ""}</li>
            ))}
          </ul>
          <h4>상대적 금기</h4>
          <ul>
            {CONTRA_REL.map((v) => <li key={v}>{v}</li>)}
          </ul>
          <p className="contra-note">※ 정도에 따라 금기되거나 정상적·제한적 적용이 가능해요.</p>
        </div>
      )}

      {manage ? (
        <ManageBookings />
      ) : (
      <>

      {kind === "trial" && (
        <div className="step">
          <h3>1 · 지점 <small className="h3-note">온기의 모든 지점은 직영으로 운영됩니다.</small></h3>
          <div className="chips trial-chips">
            {branches.filter((b) => !b.hidden).map((b) =>
              b.bookable && !b.trialClosed && b.naverTrial ? (
                <a
                  key={b.id}
                  className="chip"
                  href={b.naverTrial}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!b.waitlist) return;
                    e.preventDefault();
                    setWaitPop(b);
                  }}
                >
                  <span className="nl">{b.short.replace(" (잠원동", "\n(잠원동")}</span>
                  {b.womenOnly && <small>여성전용</small>}
                </a>
              ) : (
                <button key={b.id} type="button" className="chip" onClick={() => setClosedPop(true)}>
                  <span className="nl">{b.short.replace(" (잠원동", "\n(잠원동")}</span> <small>예약 불가</small>
                </button>
              )
            )}
            {comingSoon.map((s) => (
              <span key={s} className="chip chip-soon" aria-disabled="true">
                {s} <small>오픈 예정</small>
              </span>
            ))}
          </div>
          <p className="kind-desc naver-once">최초 1회만 네이버 예약을 이용합니다.</p>
        </div>
      )}

      {kind === "pt" && ptBranch && (
        <div className="step">
          <h3>장소</h3>
          {ptBranch.photos.length > 0 && (
            <div className="pt-photos">
              {ptBranch.photos.map((src, i) => (
                <img key={src} src={src} alt={`PT 공간 사진 ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} />
              ))}
            </div>
          )}
          <BranchInfo key={ptBranch.id} b={ptBranch} />
          {ptBranch.naverPt && (
            <a className="primary pt-book" href={ptBranch.naverPt} target="_blank" rel="noopener noreferrer">
              예약하기
            </a>
          )}
          <p className="kind-desc">네이버 예약 화면으로 이동해요.</p>
        </div>
      )}

      {kind === "member" && !membership && (
        <div className="step">
          <h3>1 · 회원 확인</h3>
          <div className="field">
            <label htmlFor="mp">연락처 뒷 4자리</label>
            <input
              id="mp"
              className="mp-pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={last4}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setLast4(v);
                setChoices(null);
                setMemberships(null);
                if (v.length === 4) verify(v);
              }}
            />
          </div>
          {busy && <p className="loading" style={{ textAlign: "center" }}>확인 중…</p>}
          {choices && (
            <>
              <p className="kind-desc">같은 번호의 회원이 여러 명이에요. 본인 이름을 눌러 주세요.</p>
              <div className="chips">
                {choices.map((c) => (
                  <button key={c.who} className="chip" onClick={() => verify(last4, c.who)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {memberships && memberships.length > 1 && (
            <div className="chips">
              {memberships.map((m) => (
                <button key={m.branch} className="chip" onClick={() => chooseMembership(m)}>
                  {m.branchName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {kind === "member" && membership && (
        <>
          <div className="member-card">
            <div>
              <b>{label} 회원님</b>
              {left && <em className="left">잔여 {left.remaining}회</em>}
              <br />
              <span>
                {membership.branchName}
                {trainerName ? ` · 담당 ${trainerName} 선생님` : ""}
              </span>
            </div>
            {memberOnly ? (
              <button className="ghost" onClick={() => { try { localStorage.removeItem(MEMBER_KEY); } catch {} window.location.reload(); }}>
                로그아웃
              </button>
            ) : (
              <button className="ghost" onClick={() => switchKind("member")}>
                다른 회원
              </button>
            )}
          </div>
          {activeInfo && <BranchInfo key={activeInfo.id} b={activeInfo} />}
          {(!trainer || membership.trainers.length > 1) && (
            <div className="step">
              <h3>담당 선생님</h3>
              <div className="chips">
                {membership.trainers.map((t) => (
                  <button key={t.id} className="chip" aria-pressed={trainer === t.id} onClick={() => { setTrainer(t.id); resetSlots(); }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selfBook && <p className="bnotice" style={{ textAlign: "center" }}>{trainerName} 선생님 일정은 담당 선생님께 직접 문의해 주세요.</p>}
      {loading && <p className="loading">예약 가능한 시간을 불러오는 중이에요…</p>}

      {days && (
        <div className="step" id="bk-date">
          <h3>2 · 날짜</h3>
          <MonthCalendar days={days} selected={day} onPick={(d) => { setDay(d); setHour(null); focusOn("bk-time"); }} />
        </div>
      )}

      {days && day && (
        <div className="step" id="bk-time">
          <h3>
            3 · 시간 <span style={{ fontWeight: 400 }}>({sessionMinutes}분 진행)</span>
          </h3>
          <div className="times">
            {slots.map((s) => (
              <button key={s.hour} className="chip" disabled={!s.available} aria-pressed={hour === s.hour} onClick={() => { setHour(s.hour); setErr(""); focusOn(kind === "member" ? "bk-go" : "bk-info", kind === "member" ? "center" : "start"); }}>
                {s.hour}:00
              </button>
            ))}
          </div>
          {!slots.some((s) => s.available) && <div className="note">이 날은 예약이 모두 찼어요. 다른 날짜를 골라주세요.</div>}
        </div>
      )}

      {days && day && hour != null && kind !== "member" && (
        <div className="step" id="bk-info">
          <h3>4 · 예약자 정보</h3>
          <div className="row2">
            <div className="field">
              <label htmlFor="tn">이름</label>
              <input id="tn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tp">연락처</label>
              <input id="tp" inputMode="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="tm">불편한 부위나 요청사항 (선택)</label>
            <textarea id="tm" rows={2} maxLength={300} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          {kind === "trial" ? (
            <div className="note">
              체험가 <b>{trialPrice}</b>은 방문 당일 결제해요. 관리 후 붉은 자국이 생길 수 있고 보통 3~4일 이내 옅어져요.
            </div>
          ) : (
            <div className="note">PT 상담·평가는 무료예요. 운동복은 준비되어 있어요.</div>
          )}
        </div>
      )}

      {err && <div className="err">{err}</div>}

      {days && day && hour != null && (
        <button id="bk-go" className="primary" disabled={busy} onClick={confirm}>
          {busy ? "예약하는 중…" : `${fmtDay(day)} ${hour}:00 예약하기`}
        </button>
      )}
      </>
      )}
    </div>
  );
}
