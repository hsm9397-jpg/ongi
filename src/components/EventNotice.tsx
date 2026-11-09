"use client";
import { useEffect, useState } from "react";

/** 기간 한정 안내 이미지. until(한국시간 그날 끝)이 지나면 자동으로 사라짐 */
export default function EventNotice({ img, alt, until, banner }: { img: string; alt: string; until: string; banner?: { title: string; sub: string; note?: string } }) {
  const [show, setShow] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Date.now() > new Date(`${until}T23:59:59+09:00`).getTime()) setShow(false);
  }, [until]);
  if (!show) return null;
  if (!banner) return <img className="ev-img" src={img} alt={alt} loading="lazy" />;
  return (
    <>
      <button type="button" className="ev-banner" onClick={() => setOpen(true)}>
        <span className="ev-tag">EVENT</span>
        <b>{banner.title}</b>
        <span className="ev-sub">{banner.sub} · 자세히 보기 ›</span>
        {banner.note && <span className="ev-note">{banner.note}</span>}
      </button>
      {open && (
        <div className="pop-bg" onClick={() => setOpen(false)}>
          <div className="ev-pop" role="dialog" aria-modal="true" aria-label={alt} onClick={(e) => e.stopPropagation()}>
            <img src={img} alt={alt} />
            {banner.note && <p className="ev-note">{banner.note}</p>}
            <button className="mp-forget" onClick={() => setOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
