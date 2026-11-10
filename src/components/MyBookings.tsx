"use client";
import { useCallback, useEffect, useState } from "react";

type Item = { date: string; hour: number; minute: number; branchName: string; trainerName: string; web: boolean };
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const when = (i: Item) => {
  const [y, m, d] = i.date.split("-").map(Number);
  const w = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${w}) ${String(i.hour).padStart(2, "0")}:${String(i.minute).padStart(2, "0")}`;
};

/** 회원 페이지: 다가오는 내 예약 (홈페이지 예약 + 선생님이 잡은 일정) */
export default function MyBookings({ token, last4 }: { token: string; last4?: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    if (!last4) return;
    fetch("/api/members/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, last4 }) })
      .then((r) => r.json())
      .then((j) => (j.items ? (setItems(j.items), setErr("")) : setErr(j.error && j.error !== "invalid" ? j.error : "")))
      .catch(() => setErr("예약을 불러오지 못했어요."));
  }, [token, last4]);
  useEffect(() => {
    load();
    const on = () => setTimeout(load, 800);
    window.addEventListener("ongi-booked", on);
    return () => window.removeEventListener("ongi-booked", on);
  }, [load]);
  if (!last4) return null;
  return (
    <div className="mp-upcoming">
      <h3>내 예약</h3>
      {err && <p className="mp-note">{err}</p>}
      {!items && !err && <p className="mp-note">불러오는 중…</p>}
      {items && (items.length ? (
        <ul>
          {items.map((i, k) => (
            <li key={k}><b>{when(i)}</b><span>{i.branchName} · {i.trainerName} 선생님</span></li>
          ))}
        </ul>
      ) : <p className="mp-note">다가오는 예약이 없어요.</p>)}
    </div>
  );
}
