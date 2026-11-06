"use client";
import { mapSrc } from "@/lib/map";

import { useEffect, useState } from "react";

type PubBranch = { id: string; name: string; short: string; womenOnly: boolean; hidden: boolean; only?: "pt"; bookable: boolean; desc: string; notice: string; address: string; mapQuery: string; naverTrial: string; lat: number; lng: number; trainers: { id: string; name: string }[] };
type Slot = { hour: number; available: boolean };
type Membership = { branch: string; branchName: string; trainerId?: string; trainers: { id: string; name: string }[] };
type Done = { kind: "trial" | "member" | "pt"; branchName: string; date: string; hour: number; minutes: number; trainerName: string; name: string };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export const KAKAO_CHAT_URL = "https://pf.kakao.com/_eYctn/chat";
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

type MyBooking = { token: string; branchId: string; branchName: string; trainerId: string; trainerName: string; kind: "trial" | "member" | "pt"; date: string; hour: number; minute: number; changeable: boolean };

/** 내 예약 확인·변경·취소 */
function ManageBookings() {
  const [name, setName] = useState("");
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

  async function lookup() {
    setErr(""); setMsg(""); setBusy(true); setChanging(null); setConfirmCancel(null);
    try {
      const r = await api<{ bookings: MyBooking[] }>("/api/my/lookup", { method: "POST", body: JSON.stringify({ name, last4 }) });
      setList(r.bookings);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(b: MyBooking) {
    setErr(""); setBusy(true);
    try {
      await api("/api/my/cancel", { method: "POST", body: JSON.stringify({ token: b.token, name, last4 }) });
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
    setErr(""); setMsg(""); setChanging(b); setDays(null); setDay(null); setHour(null); setConfirmCancel(null);
    const q = new URLSearchParams({ branch: b.branchId });
    if (b.kind === "member") q.set("trainer", b.trainerId);
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
      await api("/api/my/change", { method: "POST", body: JSON.stringify({ token: changing.token, name, last4, date: day, hour }) });
      setMsg(`${fmtDay(day)} ${hour}:00으로 변경했어요.`);
      setChanging(null);
      await lookup();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const slots = day && days ? days[day] ?? [] : [];

  return (
    <div className="step">
      <h3>예약 조회</h3>
      <div className="row2">
        <div className="field">
          <label htmlFor="myn">예약자 이름</label>
          <input id="myn" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="myp">연락처 뒷 4자리</label>
          <input id="myp" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <button className="ghost" disabled={busy || name.trim().length < 2 || last4.length !== 4} onClick={lookup}>
        {busy && !list ? "조회 중…" : "내 예약 조회"}
      </button>
      {msg && <p className="okmsg">{msg}</p>}
      {err && <p className="err">{err}</p>}

      {list && list.length === 0 && (
        <p className="note">홈페이지로 예약하신 내역이 없어요. 다른 방법으로 예약하셨다면 카카오톡으로 문의해 주세요.</p>
      )}

      {list && list.length > 0 && (
        <ul className="mylist">
          {list.map((b) => (
            <li key={b.token} className="mybook">
              <div className="mybook-main">
                <b>{fmtDay(b.date)} {b.hour}:{String(b.minute).padStart(2, "0")}</b>
                <span>{b.branchName} · {b.trainerName} 선생님 · {b.kind === "trial" ? "체험" : b.kind === "pt" ? "PT 상담·평가" : "회원"}</span>
              </div>
              {b.changeable ? (
                confirmCancel === b.token ? (
                  <div className="mybook-actions">
                    <span className="err">이 예약을 취소할까요?</span>
                    <button className="ghost danger" disabled={busy} onClick={() => cancel(b)}>네, 취소</button>
                    <button className="ghost" onClick={() => setConfirmCancel(null)}>아니요</button>
                  </div>
                ) : (
                  <div className="mybook-actions">
                    <button className="ghost" disabled={busy} onClick={() => startChange(b)}>시간 변경</button>
                    <button className="ghost danger" disabled={busy} onClick={() => setConfirmCancel(b.token)}>취소</button>
                  </div>
                )
              ) : (
                <p className="note">예약 하루 전부터는 직접 변경·취소가 어려워요. 카카오톡으로 문의해 주세요.</p>
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
function MonthCalendar({ days, selected, onPick }: { days: Record<string, Slot[]>; selected: string | null; onPick: (d: string) => void }) {
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

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
  return data as T;
}

export default function BookingFlow(props: { branches: PubBranch[]; trialPrice: string; sessionMinutes: number; comingSoon: string[] }) {
  const { branches, trialPrice, sessionMinutes, comingSoon } = props;
  const [kind, setKind] = useState<"trial" | "member" | "pt">("trial");
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

  // 체험
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  // 회원
  const [who, setWho] = useState("");
  const [label, setLabel] = useState("");
  const [choices, setChoices] = useState<{ label: string; who: string }[] | null>(null);
  const [last4, setLast4] = useState("");
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [trainer, setTrainer] = useState<string | null>(null);

  const ptBranch = branches.find((b) => b.only === "pt");
  const activeBranch = kind === "member" ? membership?.branch ?? null : kind === "pt" ? ptBranch?.id ?? null : null;
  const needTrainer = kind === "member";

  function resetSlots() {
    setDay(null);
    setHour(null);
    setErr("");
  }

  const activeInfo = branches.find((b) => b.id === activeBranch);
  const activeBookable = activeInfo ? activeInfo.bookable : true;

  useEffect(() => {
    if (!activeBranch || (needTrainer && !trainer)) {
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
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeBranch, trainer, needTrainer]);

  // 홈페이지의 버튼(#trial, #member, #pt, #my)으로 예약 종류를 바로 열기
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if (h === "my") setManage(true);
      else if (h === "trial" || h === "member" || h === "pt") switchKind(h);
      else return;
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
    };
    // 같은 버튼을 두 번 눌러 주소(#trial)가 그대로면 hashchange가 안 생기므로 클릭도 직접 처리
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null;
      const h = a?.getAttribute("href");
      if (h !== "#trial" && h !== "#member" && h !== "#pt" && h !== "#my") return;
      e.preventDefault();
      history.replaceState(null, "", h);
      apply();
    };
    apply();
    window.addEventListener("hashchange", apply);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", apply);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchKind(k: "trial" | "member" | "pt") {
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

  async function verify(code = last4, pick?: string) {
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
      if (!res.ok) throw new Error(data.error || "문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
      if (data.choices) {
        setChoices(data.choices);
        return;
      }
      const r = data as { who: string; label: string; memberships: Membership[] };
      setWho(r.who);
      setLabel(r.label);
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
        <p className="note">예약 전날 안내 메시지를 보내드려요. 변경·취소는 첫 화면의 &quot;내 예약 확인 · 변경 · 취소&quot;에서 예약 하루 전까지 직접 할 수 있어요.</p>
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
      <button className="my-link" aria-pressed={manage} onClick={() => setManage(true)}>
        내 예약 확인 · 변경 · 취소 <span aria-hidden>›</span>
      </button>

      {manage ? (
        <ManageBookings />
      ) : (
      <>

      {kind === "trial" && (
        <div className="step">
          <h3>1 · 지점</h3>
          <div className="chips trial-chips">
            {branches.filter((b) => !b.hidden).map((b) =>
              b.bookable && b.naverTrial ? (
                <a key={b.id} className="chip" href={b.naverTrial} target="_blank" rel="noopener noreferrer">
                  {b.short}
                  {b.womenOnly && <small>여성전용</small>}
                </a>
              ) : (
                <button key={b.id} className="chip" disabled>
                  {b.short} <small>예약 불가</small>
                </button>
              )
            )}
            {comingSoon.map((s) => (
              <button key={s} className="chip" disabled>
                {s} <small>오픈 예정</small>
              </button>
            ))}
          </div>
          <p className="kind-desc">지점을 누르면 네이버 예약 화면으로 바로 이동해요.</p>
        </div>
      )}

      {kind === "pt" && ptBranch && (
        <div className="step">
          <h3>1 · 장소</h3>
          <BranchInfo key={ptBranch.id} b={ptBranch} />
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
              <br />
              <span>
                {membership.branchName}
                {trainerName ? ` · 담당 ${trainerName} 선생님` : ""}
              </span>
            </div>
            <button className="ghost" onClick={() => switchKind("member")}>
              다른 회원
            </button>
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

      {loading && <p className="loading">예약 가능한 시간을 불러오는 중이에요…</p>}

      {days && (
        <div className="step">
          <h3>2 · 날짜</h3>
          <MonthCalendar days={days} selected={day} onPick={(d) => { setDay(d); setHour(null); }} />
        </div>
      )}

      {days && day && (
        <div className="step">
          <h3>
            3 · 시간 <span style={{ fontWeight: 400 }}>({sessionMinutes}분 진행)</span>
          </h3>
          <div className="times">
            {slots.map((s) => (
              <button key={s.hour} className="chip" disabled={!s.available} aria-pressed={hour === s.hour} onClick={() => { setHour(s.hour); setErr(""); }}>
                {s.hour}:00
              </button>
            ))}
          </div>
          {!slots.some((s) => s.available) && <div className="note">이 날은 예약이 모두 찼어요. 다른 날짜를 골라주세요.</div>}
        </div>
      )}

      {days && day && hour != null && kind !== "member" && (
        <div className="step">
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
        <button className="primary" disabled={busy} onClick={confirm}>
          {busy ? "예약하는 중…" : `${fmtDay(day)} ${hour}:00 예약하기`}
        </button>
      )}
      </>
      )}
    </div>
  );
}
