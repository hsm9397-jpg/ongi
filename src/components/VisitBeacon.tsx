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
  return null;
}
