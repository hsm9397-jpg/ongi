"use client";
import { useEffect, useRef } from "react";

/** 첫 화면 브랜드 영상: 소리 없이 자동 반복.
 *  - React가 muted를 HTML 속성으로 안 넣어서 iOS가 자동재생을 막는 경우가 있어 직접 넣음
 *  - 저전력 모드 등으로 자동재생이 막히면 첫 터치·스크롤 때 재생
 *  - 데이터 절약 모드면 첫 장면 사진만 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) {
      v.pause();
      return;
    }
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => v.play().catch(() => {});
    const evs = ["touchstart", "pointerdown", "scroll", "keydown"] as const;
    const onUser = () => {
      tryPlay();
      if (!v.paused) evs.forEach((e) => window.removeEventListener(e, onUser));
    };
    evs.forEach((e) => window.addEventListener(e, onUser, { passive: true }));
    const onVis = () => document.visibilityState === "visible" && tryPlay();
    document.addEventListener("visibilitychange", onVis);
    v.addEventListener("canplay", tryPlay);
    tryPlay();
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onUser));
      document.removeEventListener("visibilitychange", onVis);
      v.removeEventListener("canplay", tryPlay);
    };
  }, []);
  return (
    <div className="hero-video" dangerouslySetInnerHTML={{
      __html: '<video src="/hero/brand.mp4" poster="/hero/poster.jpg" autoplay muted loop playsinline webkit-playsinline preload="auto" disablepictureinpicture aria-label="온기 근막이완 컨디셔닝 영상"></video>',
    }} ref={(el) => { (ref as React.MutableRefObject<HTMLVideoElement | null>).current = (el?.querySelector("video") as HTMLVideoElement) ?? null; }} />
  );
}
