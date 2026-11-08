"use client";
import { useRef, useState } from "react";
import { REVIEWS } from "@/config/site";

const TABS = ["근막이완 컨디셔닝", "PT"] as const;

export default function Reviews() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const track = useRef<HTMLDivElement>(null);
  const list = REVIEWS.filter((r) => r.menu === tab);
  return (
    <>
      <div className="rv-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); track.current?.scrollTo({ left: 0 }); }}>
            {t}
          </button>
        ))}
      </div>
      <div className="rv-track" ref={track}>
        {list.map((r, i) => (
          <figure key={tab + i} className="rv-card">
            <span className="rv-q" aria-hidden="true">“</span>
            <blockquote>{r.text}</blockquote>
            <figcaption><b>{r.who}</b><span>{r.menu}</span></figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
