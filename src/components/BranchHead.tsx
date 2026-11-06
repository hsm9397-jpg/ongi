"use client";
import { useState } from "react";

/** 지점 카드 제목 + 오른쪽 '위치 보기' (누르면 주소와 지도 펼침) */
export default function BranchHead({ title, address, src }: { title: string; address?: string; src?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bhead">
        <h3>{title}</h3>
        {address && src && (
          <button className="loc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            위치 보기 <span aria-hidden>{open ? "▴" : "▾"}</span>
          </button>
        )}
      </div>
      {open && src && (
        <div className="loc">
          <p className="addr">{address}</p>
          <iframe title={`${title} 지도`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      )}
    </>
  );
}
