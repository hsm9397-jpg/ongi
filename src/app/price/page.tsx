import type { Metadata } from "next";
import { LINKS, PRICES } from "@/config/site";

export const metadata: Metadata = {
  title: "서비스 금액 | 온기",
  description: "온기 근막이완 컨디셔닝·퍼스널 트레이닝 패키지권(횟수권)과 금액권 안내",
  alternates: { canonical: "/price" },
};

export default function PricePage() {
  const w = PRICES.wallet;
  return (
    <main className="pr">
      <header className="pr-head">
        <a href="/" className="pr-back">← 홈으로</a>
        <a href="/" aria-label="온기 홈">
          <img src="/logo-solid.png" alt="온기" width={880} height={669} style={{ width: 96, height: "auto", borderRadius: 10 }} />
        </a>
        <h1>서비스 금액</h1>
      </header>

      <section className="pr-sec">
        <h2>패키지권 <small>횟수 방식</small></h2>
        <div className="pr-cards">
          {PRICES.packages.map((p) => (
            <div key={p.title} className="pr-card">
              <h3>{p.title}</h3>
              <ul>
                {p.items.map((it) => (
                  <li key={it.name}>
                    <span className="pr-name">{it.name}</span>
                    {it.note && <small>{it.note}</small>}
                    <b>{it.price}</b>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pr-note">
          <b>온기의 회원권은</b>
          <ul>{PRICES.packageNote.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      </section>

      <section className="pr-sec">
        <h2>{w.title} <small>{w.sub}</small></h2>
        <div className="pr-wallet">
          <div className="pr-wallet-top">
            <span>{w.pay} 결제</span>
            <em>{w.bonus}</em>
            <b>총 {w.total} 사용</b>
          </div>
          <dl>
            {w.deduct.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <ul className="pr-perks">{w.perks.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </section>

      <p className="pr-vat">{PRICES.vat}</p>

      <div className="pr-cta">
        <a className="btn-primary" href="/#trial">체험 예약하기</a>
        <a className="btn-ghost" href={LINKS.kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
      </div>
    </main>
  );
}
