"use client";
import { useEffect, useState } from "react";
import { PROFILES } from "@/config/team-profiles";

type Member = { name: string; role: string; photo: string };

export default function TeamGrid({ team }: { team: Member[] }) {
  const [open, setOpen] = useState<Member | null>(null);
  const p = open ? PROFILES[open.name] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="team">
        {team.map((m) => (
          <button key={m.name} type="button" className="member" onClick={() => setOpen(m)}>
            <img src={m.photo} alt={m.name} loading="lazy" />
            <b>{m.name}</b>
            <span>{m.role}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="pop-bg" onClick={() => setOpen(null)}>
          <div className="pop prof" role="dialog" aria-modal="true" aria-label={`${open.name} 프로필`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="prof-x" aria-label="닫기" onClick={() => setOpen(null)}>×</button>
            <div className="prof-head">
              <img src={open.photo} alt="" />
              <div>
                <h3>{open.name}</h3>
                <span>{open.role}</span>
              </div>
            </div>
            <div className="prof-body">
              {p?.intro.map((t) => <p key={t}>{t}</p>)}
              {p?.sections.map((s) => (
                <section key={s.title}>
                  <h4>{s.title}</h4>
                  <ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
