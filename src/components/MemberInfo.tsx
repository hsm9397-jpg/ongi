"use client";
import { useEffect, useRef, useState } from "react";

type Hist = { date: string; program: string; branch: string; total: number | null };
type Wallet = { user: string; total: number | null; balance: string | number | null; days: string | number | null; registered: string | null; expires: string | number | null };
type Info =
  | { kind: "sessions"; trainer: string; history: Hist[]; remaining: number | null; total: number | null }
  | { kind: "wallet"; wallets: Wallet[] };

const d = (s: string | null | undefined) => (s ? s.slice(2).replace(/-/g, ".") : "");
const won = (v: string | number | null) => (typeof v === "number" ? `${v.toLocaleString("ko-KR")}원` : v ?? "-");

export default function MemberInfo({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // 마지막 1회 알림: 팝업 → 닫으면 버튼 자리로 날아가 앉고 버튼이 버건디로 바뀜
  const [lastPop, setLastPop] = useState(false);
  const [lastOn, setLastOn] = useState(false);
  const [land, setLand] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  async function fetchInfo(): Promise<Info | null> {
    const r = await fetch("/api/members/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || "다시 시도해 주세요.");
    if (j.expired) throw new Error("회원권이 만료되었어요.");
    return j as Info;
  }

  // 들어오자마자 조용히 잔여 회차를 읽어 둔다 (마지막 1회 확인용)
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    fetchInfo()
      .then((j) => {
        if (!alive || !j) return;
        setInfo(j);
        if (j.kind !== "sessions" || j.remaining !== 1) return;
        setLastOn(true);
        // 오늘 이미 봤으면 팝업 없이 버건디 버튼만
        const key = `ongi-last1-${new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)}`;
        let seen = false;
        try { seen = !!localStorage.getItem(key); } catch {}
        if (seen) return;
        // 약관 첫 팝업이 떠 있으면 그게 닫힌 다음에 띄운다
        const ready = () => { try { return !!localStorage.getItem("ongi-terms-seen"); } catch { return true; } };
        const show = () => { try { localStorage.setItem(key, "1"); } catch {} setLastPop(true); };
        if (ready()) show();
        else timer = setInterval(() => { if (ready()) { clearInterval(timer); setTimeout(show, 900); } }, 400);
      })
      .catch(() => {});
    return () => { alive = false; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function closeLast() {
    const el = pop.current, to = btn.current;
    const done = () => { setLastPop(false); setLand(true); };
    if (!el || !to || typeof el.animate !== "function") return done();
    to.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => {
      const a = el.getBoundingClientRect(), b = to.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const sc = Math.max(0.12, b.width / a.width);
      el.parentElement?.classList.add("out");
      const anim = el.animate(
        [{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${sc}, ${Math.max(0.08, b.height / a.height)})`, opacity: 0.4 }],
        { duration: 550, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }
      );
      anim.onfinish = done;
    }, 250);
  }

  async function load() {
    setOpen((o) => !o);
    if (info || busy) return;
    setBusy(true);
    setErr("");
    try {
      setInfo(await fetchInfo());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {lastPop && (
        <div className="pop-bg last1-bg" onClick={closeLast}>
          <div className="last1-pop" ref={pop} role="dialog" aria-modal="true" aria-label="마지막 1회 안내" onClick={(e) => e.stopPropagation()}>
            <h3>마지막 1회 남았어요</h3>
            <p>현재 회원권의 잔여 회차가 <b>1회</b>예요.<br />다음 회원권은 담당 선생님께 편하게 말씀해 주세요.</p>
            <button className="primary" onClick={closeLast}>확인했어요</button>
          </div>
        </div>
      )}
      <button
        ref={btn}
        type="button"
        className={`ghost mp-book mp-c-info${lastOn && !lastPop ? " last1" : ""}${land ? " land" : ""}`}
        aria-expanded={open}
        onClick={load}
        onAnimationEnd={() => setLand(false)}
      >
        잔여 회차 · 회원권 확인{lastOn && !lastPop && <span className="last1-tag">마지막 1회</span>}
      </button>
      {open && (
        <div className="mp-info">
          {busy && <p className="loading">불러오는 중…</p>}
          {err && <p className="err">{err}</p>}
          {info?.kind === "sessions" && (
            <>
              <dl>
                <dt>담당 선생님</dt>
                <dd>{info.trainer || "-"}</dd>
                <dt>잔여 회차</dt>
                <dd>{info.remaining != null ? <b>{info.remaining}회</b> : "확인 중이에요"}</dd>
              </dl>
              <h4>등록 이력</h4>
              {info.history.length ? (
                <ul>
                  {[...info.history].reverse().map((h, i) => (
                    <li key={i}>
                      <span>{d(h.date)}</span>
                      <b>{h.program}</b>
                      <small>{h.branch}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note">등록 이력을 찾지 못했어요.</p>
              )}
            </>
          )}
          {info?.kind === "wallet" &&
            (info.wallets.length ? (
              info.wallets.map((w, i) => (
                <dl key={i}>
                  <dt>금액권</dt>
                  <dd>{won(w.total)}</dd>
                  <dt>잔액</dt>
                  <dd><b>{won(w.balance)}</b></dd>
                  <dt>잔여 기간</dt>
                  <dd>{typeof w.days === "number" ? `${w.days}일` : w.days ?? "-"}</dd>
                  <dt>등록일</dt>
                  <dd>{d(w.registered) || "-"}</dd>
                  {w.expires && (<><dt>만료일</dt><dd>{typeof w.expires === "string" ? d(w.expires) : w.expires}</dd></>)}
                </dl>
              ))
            ) : (
              <p className="note">금액권 정보를 찾지 못했어요.</p>
            ))}
          <p className="mp-hint">정확한 내역은 담당 선생님께 확인해 주세요.</p>
        </div>
      )}
    </>
  );
}
