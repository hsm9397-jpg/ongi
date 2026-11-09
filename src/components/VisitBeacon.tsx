"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 방문자 수 세기 (직원 화면은 제외) */
export default function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/staff")) return;
    fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => {});
  }, [path]);
  // 네이버 예약(체험·PT 상담) 버튼 누름을 센다
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href*='booking.naver.com']") as HTMLAnchorElement | null;
      if (!a) return;
      const body = JSON.stringify({ href: a.href });
      if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" })))
        fetch("/api/visit", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body }).catch(() => {});
    };
    document.addEventListener("click", on, true);
    return () => document.removeEventListener("click", on, true);
  }, []);
  return null;
}
