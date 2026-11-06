"use client";

import { useEffect, useState } from "react";

type PubBranch = { id: string; name: string; short: string; womenOnly: boolean; bookable: boolean; desc: string; notice: string; address: string; mapQuery: string; trainers: { id: string; name: string }[] };
type Slot = { hour: number; available: boolean };
type Membership = { branch: string; branchName: string; name: string; trainerId?: string; trainers: { id: string; name: string }[] };
type Done = { kind: "trial" | "member"; branchName: string; date: string; hour: number; minutes: number; trainerName: string; name: string };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export const KAKAO_CHAT_URL = "https://pf.kakao.com/_eYctn/chat";
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** 지점 소개 + 위치(펼치기) */
function BranchInfo({ b }: { b: PubBranch }) {
  const [open, setOpen] = useState(false);
  const q = encodeURIComponent(b.mapQuery || b.address);
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
              <iframe title={`${b.short} 지도`} src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <div className="maplinks">
                <a href={`https://map.naver.com/p/search/${q}`} target="_blank" rel="noopener noreferrer">네이버 지도</a>
                <a href={`https://map.kakao.com/link/search/${q}`} target="_blank" rel="noopener noreferrer">카카오맵</a>
              </div>
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
  const [kind, setKind] = useState<"trial" | "member">("trial");
  const [branch, setBranch] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, Slot[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  // 체험
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  // 회원
  const [mName, setMName] = useState("");
  const [last4, setLast4] = useState("");
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [trainer, setTrainer] = useState<string | null>(null);

  const activeBranch = kind === "member" ? membership?.branch ?? null : branch;
  const needTrainer = kind === "member";

  function resetSlots() {
    setDay(null);
    setHour(null);
    setErr("");
  }

  const activeInfo = branches.find((b) => b.id === activeBranch);
  const activeBookable = activeInfo ? activeInfo.bookable : true;

  useEffect(() => {
    if (!activeBranch || !activeBookable || (needTrainer && !trainer)) {
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
  }, [activeBranch, activeBookable, trainer, needTrainer]);

  function switchKind(k: "trial" | "member") {
    setKind(k);
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

  async function verify() {
    setErr("");
    setBusy(true);
    try {
      const r = await api<{ memberships: Membership[] }>("/api/member", {
        method: "POST",
        body: JSON.stringify({ name: mName, last4 }),
      });
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
    if (kind === "trial" && (name.trim().length < 2 || phone.replace(/\D/g, "").length < 10)) {
      setErr("이름과 연락처를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ booking: Done }>("/api/book", {
        method: "POST",
        body: JSON.stringify(
          kind === "trial"
            ? { kind, branch: activeBranch, date: day, hour, name, phone, memo }
            : { kind, branch: activeBranch, date: day, hour, name: mName, last4, trainer }
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
          <dd>{done.kind === "trial" ? "첫 방문 체험" : "기존 회원 예약"}</dd>
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
        <p className="note">예약 전날 안내 메시지를 보내드려요.</p>
        <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">예약 변경·취소 (카카오톡 문의)</a>
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
      <div className="kind" role="group" aria-label="예약 종류">
        <button aria-pressed={kind === "trial"} onClick={() => switchKind("trial")}>
          <b>처음이에요 <small>(체험 예약)</small></b>
          <span>근막이완 컨디셔닝 체험</span>
          <span>{sessionMinutes}분 1:1 {trialPrice}</span>
        </button>
        <button aria-pressed={kind === "member"} onClick={() => switchKind("member")}>
          <b>기존 회원 예약</b>
          <span>이용권이 있는 회원님</span>
          <span>담당 선생님 일정 확인</span>
        </button>
      </div>

      {kind === "trial" && (
        <div className="step">
          <h3>1 · 지점</h3>
          <div className="chips">
            {branches.map((b) => (
              <button key={b.id} className="chip" aria-pressed={branch === b.id} onClick={() => { setBranch(b.id); resetSlots(); }}>
                {b.short}
                {b.womenOnly && <small>여성전용</small>}
              </button>
            ))}
            {comingSoon.map((s) => (
              <button key={s} className="chip" disabled>
                {s} <small>오픈 예정</small>
              </button>
            ))}
          </div>
          {activeInfo && <BranchInfo key={activeInfo.id} b={activeInfo} />}
        </div>
      )}

      {kind === "member" && !membership && (
        <div className="step">
          <h3>1 · 회원 확인</h3>
          <div className="row2">
            <div className="field">
              <label htmlFor="mn">이름</label>
              <input id="mn" autoComplete="name" value={mName} onChange={(e) => setMName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="mp">연락처 뒷 4자리</label>
              <input id="mp" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          {memberships && memberships.length > 1 && (
            <div className="chips">
              {memberships.map((m) => (
                <button key={m.branch} className="chip" onClick={() => chooseMembership(m)}>
                  {m.branchName}
                </button>
              ))}
            </div>
          )}
          <button className="ghost" disabled={busy} onClick={verify}>
            {busy ? "확인 중…" : "회원 정보 확인"}
          </button>
        </div>
      )}

      {kind === "member" && membership && (
        <>
          <div className="member-card">
            <div>
              <b>{membership.name} 회원님</b>
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
          {activeBookable && (!trainer || membership.trainers.length > 1) && (
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

      {days && day && hour != null && kind === "trial" && (
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
          <div className="note">
            체험가 <b>{trialPrice}</b>은 방문 당일 결제해요. 관리 후 붉은 자국이 생길 수 있고 보통 3~4일 이내 옅어져요.
          </div>
        </div>
      )}

      {err && <div className="err">{err}</div>}

      {days && day && hour != null && (
        <button className="primary" disabled={busy} onClick={confirm}>
          {busy ? "예약하는 중…" : `${fmtDay(day)} ${hour}:00 예약하기`}
        </button>
      )}
    </div>
  );
}
