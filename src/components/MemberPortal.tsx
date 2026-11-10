"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import MemberInfo from "./MemberInfo";
import MyBookings from "./MyBookings";
import { TermsDialog, TermsPopup } from "./Terms";

type Group = { name: string; photo: string };
type Found = { name: string; url: string; token: string };
const KEY = "ongi-member";

type Saved = { token: string; name: string; last4?: string };
function load(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
function save(v: Saved | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {}
}

export default function MemberPortal({ groups, kakao, booking, notices }: { groups: Group[]; kakao: string; booking?: ReactNode; notices?: ReactNode }) {
  const [showBook, setShowBook] = useState(false);
  const [terms, setTerms] = useState(false);
  const [land, setLand] = useState(false);
  const [me, setMe] = useState<{ token: string; name: string; url?: string; remaining?: number | null; last4?: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [last4, setLast4] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // 이 폰에서 확인한 적이 있으면 바로 내 페이지 버튼만 보여준다
  useEffect(() => {
    const saved = load();
    if (!saved) return;
    setMe(saved);
    fetch("/api/members/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: saved.token }) })
      .then((r) => r.json())
      .then((d) => {
        if (d.expired) setExpired(true);
        else if (d.url) setMe({ ...saved, name: d.name, url: d.url });
        else if (d.error === "invalid") { save(null); setMe(null); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (group) pinRef.current?.focus();
  }, [group]);

  function go(f: Found, code = last4) {
    // 뒷번호도 이 폰에만 기억해 두고, 예약하기를 누르면 다시 묻지 않는다
    save({ token: f.token, name: f.name, last4: code });
    setMe({ token: f.token, name: f.name, url: f.url, last4: code });
    // 처음 확인해도 노션으로 바로 넘어가지 않고 회원 화면(내 예약·약관·내 페이지 열기)을 보여준다 (2026-11-10 대표)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function find(code: string) {
    if (!group || code.length !== 4) return;
    setBusy(true);
    setErr("");
    setFound(null);
    try {
      const r = await fetch("/api/members/find", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group, last4: code }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "다시 시도해 주세요.");
      const items = d.items as Found[];
      if (items.length === 1) return go(items[0], code);
      setFound(items);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    save(null);
    setMe(null);
    setExpired(false);
    setGroup(null);
    setFound(null);
    setLast4("");
  }

  // 약관 팝업은 본인 확인 뒤 회원 화면에서 처음 한 번만 (만료 회원 제외)
  const termsUi = (
    <>
      {!expired && <TermsPopup onClosed={() => setLand(true)} />}
      {terms && <TermsDialog onClose={() => setTerms(false)} />}
    </>
  );

  if (me) {
    return (
      <>
      {termsUi}
      <section className="mp-card mp-me">
        {expired ? (
          <>
            <p className="mp-big">{me.name}님</p>
            <p>회원권이 만료되어 페이지를 볼 수 없어요. 재등록은 카카오톡으로 문의해 주세요.</p>
            <a className="kakao" href={kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
          </>
        ) : (
          <>
            <p className="mp-big">{me.name}님, 안녕하세요</p>
            <MyBookings token={me.token} last4={me.last4} />
            <button className={`mp-terms${land ? " land" : ""}`} onClick={() => setTerms(true)} onAnimationEnd={() => setLand(false)}>📋 이용 약관 (필독)</button>
            <a className="primary mp-open" href={me.url ?? "#"} aria-disabled={!me.url}>
              {me.url ? "내 페이지 열기" : "불러오는 중…"}
            </a>
            {booking ? (
              <button
                className="ghost mp-book"
                aria-pressed={showBook}
                onClick={() => {
                  setShowBook((v) => !v);
                  setTimeout(() => document.getElementById("mp-booking")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
              >
                {showBook ? "예약 창 닫기" : "예약하기"}
              </button>
            ) : (
              <a className="ghost mp-book" href="/#member">예약하기</a>
            )}
            {showBook && booking && <div id="mp-booking" className="mp-booking">{booking}</div>}
            <MemberInfo token={me.token} />
          </>
        )}
        <button className="mp-forget" onClick={forget}>로그아웃</button>
      </section>
      {/* 회원 혜택·공지는 본인 확인 뒤에만 보여준다 (2026-11-10 대표) */}
      {!expired && notices}
      </>
    );
  }

  return (
    <section className="mp-card">
      {!group && (
        <>
          <h2>담당 선생님을 눌러 주세요</h2>
          <div className="mp-groups">
            {groups.map((g) => (
              <button key={g.name} onClick={() => setGroup(g.name)}>
                {g.photo ? <img src={g.photo} alt="" loading="lazy" /> : <span className="mp-ph" />}
                <b>{g.name}</b>
              </button>
            ))}
            <button className="mp-cash" onClick={() => setGroup("금액권")}>
              <span className="mp-ph">₩</span>
              <b>금액권 회원</b>
            </button>
          </div>
        </>
      )}

      {group && (
        <>
          <button className="mp-back" onClick={() => { setGroup(null); setFound(null); setLast4(""); setErr(""); }}>‹ 선생님 다시 고르기</button>
          <h2>{group === "금액권" ? "금액권 회원" : `${group} 선생님 회원`}</h2>
          <label className="mp-pinlabel" htmlFor="pin">휴대폰 번호 뒷 4자리</label>
          <input
            id="pin"
            ref={pinRef}
            className="mp-pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={last4}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setLast4(v);
              setFound(null);
              if (v.length === 4) find(v);
            }}
          />
          {busy && <p className="loading" style={{ textAlign: "center" }}>찾는 중…</p>}
          {found && found.length > 1 && (
            <div className="mp-names">
              {found.map((f) => (
                <button key={f.token} onClick={() => go(f)}>{f.name}</button>
              ))}
            </div>
          )}
          {found && found.length === 0 && (
            <>
              <p className="note">이 번호로 등록된 회원이 없어요. 담당 선생님이 맞는지 확인하시거나, 회원권이 만료되었을 수 있어요.</p>
              <a className="kakao" href={kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
            </>
          )}
          <p className="mp-hint">한 번 확인하면 이 폰에서는 다음부터 바로 열려요.</p>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </section>
  );
}
