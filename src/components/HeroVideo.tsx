"use client";
import { useEffect, useRef } from "react";

/** 첫 화면 브랜드 영상: 소리 없이 자동 반복. 움직임 줄이기·데이터 절약 설정이면 첫 장면 사진만 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.removeAttribute("autoplay");
      return;
    }
    v.play().catch(() => {});
  }, []);
  return (
    <div className="hero-video">
      <video ref={ref} src="/hero/brand.mp4" poster="/hero/poster.jpg" autoPlay muted loop playsInline preload="auto" aria-label="온기 근막이완 컨디셔닝 영상" />
      <div className="hero-video-over">
        <p className="hv-slogan">몸을 편안하게,<br />움직임을 자유롭게.</p>
      </div>
    </div>
  );
}
