"use client";
import { useEffect, useRef, useState } from "react";

type Group = { name: string; photo: string };
type Item = { id: string; label: string };
const KEY = "ongi-member";

function load(): { token: string; name: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.token === "string" ? v : null;
  } catch {
    return null;
  }
}
function save(v: { token: string; name: string } | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {}
}

export default function MemberPortal({ groups, kakao }: { groups: Group[]; kakao: string }) {
  const [me, setMe] = useState<{ token: string; name: string; url?: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [pick, setPick] = useState<Item | null>(null);
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
    if (!group) return;
    setItems(null);
    setErr("");
    fetch(`/api/members/list?group=${encodeURIComponent(group)}`)
      .then((r) => r.json())
      .then((d) => (d.items ? setItems(d.items) : setErr(d.error || "목록을 불러오지 못했어요.")))
      .catch(() => setErr("목록을 불러오지 못했어요."));
  }, [group]);

  useEffect(() => {
    if (pick) pinRef.current?.focus();
  }, [pick]);

  async function open(code: string) {
    if (!pick || code.length !== 4) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/members/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pick.id, last4: code }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "다시 시도해 주세요.");
      save({ token: d.token, name: d.name });
      setMe({ token: d.token, name: d.name, url: d.url });
      window.location.href = d.url;
    } catch (e) {
      setErr((e as Error).message);
      setLast4("");
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    save(null);
    setMe(null);
    setExpired(false);
    setGroup(null);
    setPick(null);
  }

  if (me) {
    return (
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
            <a className="primary mp-open" href={me.url ?? "#"} aria-disabled={!me.url}>
              {me.url ? "내 페이지 열기" : "불러오는 중…"}
            </a>
            <a className="ghost mp-book" href="/#member">예약하기</a>
          </>
        )}
        <button className="mp-forget" onClick={forget}>다른 회원으로 보기</button>
      </section>
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

      {group && !pick && (
        <>
          <button className="mp-back" onClick={() => setGroup(null)}>‹ 선생님 다시 고르기</button>
          <h2>{group === "금액권" ? "금액권 회원" : `${group} 선생님 회원`}</h2>
          {!items && !err && <p className="loading">불러오는 중…</p>}
          {items && items.length === 0 && <p className="note">등록된 회원이 없어요.</p>}
          {items && (
            <div className="mp-names">
              {items.map((it) => (
                <button key={it.id} onClick={() => { setPick(it); setLast4(""); setErr(""); }}>{it.label}</button>
              ))}
            </div>
          )}
          <p className="mp-hint">이름이 없으면 회원권이 만료되었을 수 있어요. 카카오톡으로 문의해 주세요.</p>
        </>
      )}

      {group && pick && (
        <>
          <button className="mp-back" onClick={() => setPick(null)}>‹ 이름 다시 고르기</button>
          <h2>{pick.label}님 확인</h2>
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
              if (v.length === 4) open(v);
            }}
          />
          <p className="mp-hint">한 번 확인하면 이 폰에서는 다음부터 바로 열려요.</p>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </section>
  );
}
