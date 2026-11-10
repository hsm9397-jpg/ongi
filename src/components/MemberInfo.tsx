"use client";
import { useState } from "react";

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

  async function load() {
    setOpen((o) => !o);
    if (info || busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/members/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || "다시 시도해 주세요.");
      if (j.expired) throw new Error("회원권이 만료되었어요.");
      setInfo(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="ghost mp-book mp-c-info" aria-expanded={open} onClick={load}>
        잔여 회차 · 회원권 확인
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
