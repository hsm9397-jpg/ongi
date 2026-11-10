"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 방문자 인사이트: 어디서 왔는지, 무엇을 눌렀는지, 어느 구간을 얼마나 봤는지 (개인정보 없이 합계만)
function send(events: unknown[]) {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  try {
    if (navigator.sendBeacon?.("/api/insight", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/insight", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body }).catch(() => {});
}

function source(): string {
  try {
    const u = new URL(location.href).searchParams.get("utm_source");
    const r = u || (document.referrer ? new URL(document.referrer).hostname : "");
    if (!r) return "직접";
    if (r === location.hostname) return "";
    if (/naver/i.test(r)) return "네이버";
    if (/instagram|ig\b/i.test(r)) return "인스타그램";
    if (/kakao/i.test(r)) return "카카오톡";
    if (/daangn|karrot/i.test(r)) return "당근";
    if (/google/i.test(r)) return "구글";
    if (/facebook|fb/i.test(r)) return "페이스북";
    if (/daum/i.test(r)) return "다음";
    return r.replace(/^www\./, "").slice(0, 20);
  } catch {
    return "직접";
  }
}

/** 누른 것의 이름: 버튼·링크 글자 (전화번호·숫자만 있는 건 빼고) */
function labelOf(el: HTMLElement): string {
  const t = (el.getAttribute("data-track") || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
  if (!t || /\d{3,4}[- ]?\d{4}/.test(t)) return "";
  const a = el.closest("a") as HTMLAnchorElement | null;
  const naver = a?.href.includes("booking.naver.com") ? " (네이버 예약)" : a?.href.includes("pf.kakao.com") ? " (카카오)" : "";
  return (t.slice(0, 30) + naver).trim();
}

export default function InsightTracker() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/staff")) return;
    const p = decodeURIComponent(path);
    const ref = source();
    send([{ t: "view", path: p, ref: ref || "사이트 안 이동" }]);

    // 클릭
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a,button,[role=button],summary") as HTMLElement | null;
      if (!el || el.closest("[data-noinsight]")) return;
      const label = labelOf(el);
      if (label) send([{ t: "click", path: p, label }]);
    };
    document.addEventListener("click", onClick, true);

    // 머문 시간: 화면이 보이는 동안만 세고, 구간은 화면 가운데에 걸쳐 있는 것
    let total = 0;
    const secs: Record<string, number> = {};
    let last = Date.now();
    const els = () => [
      ...Array.from(document.querySelectorAll<HTMLElement>(".hero")).map((x) => ["top", x] as const),
      ...Array.from(document.querySelectorAll<HTMLElement>("section[id]")).map((x) => [x.id, x] as const),
    ];
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(5, (now - last) / 1000);
      last = now;
      if (document.visibilityState !== "visible") return;
      total += dt;
      const mid = innerHeight / 2;
      for (const [id, el] of els()) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) { secs[id] = (secs[id] ?? 0) + dt; break; }
      }
    };
    const iv = setInterval(tick, 1000);
    // 화면을 나갔다 돌아와도 이어서 센다: 보낼 때마다 그 사이 늘어난 만큼만 보내고, 방문·구간 수는 처음 한 번만 센다
    let first = true;
    const seen = new Set<string>();
    const flush = () => {
      tick();
      if (total < 2 && first) return;
      const sec = Object.fromEntries(Object.entries(secs).filter(([, v]) => v >= 1).map(([k, v]) => [k, Math.round(v)]));
      const fresh = Object.keys(sec).filter((k) => !seen.has(k));
      fresh.forEach((k) => seen.add(k));
      if (Math.round(total) < 1 && !fresh.length) return;
      send([{ t: "dwell", path: p, total: Math.round(total), sections: sec, first, fresh }]);
      first = false;
      total = 0;
      for (const k of Object.keys(secs)) delete secs[k];
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    addEventListener("pagehide", flush);
    return () => {
      flush();
      clearInterval(iv);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      removeEventListener("pagehide", flush);
    };
  }, [path]);
  return null;
}
