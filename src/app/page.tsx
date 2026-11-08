import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import TeamGrid from "@/components/TeamGrid";
import FaqAnswer from "@/components/FaqAnswer";
import MethodVideo from "@/components/MethodVideo";
import { BRANCH_CARDS, FAQ, FOOTER, GUIDE, HERO, LINKS, METHOD, PRICING, SITE_URL, STORY, TEAM, TEAM_PROMISE } from "@/config/site";
import BookingFlow from "@/components/BookingFlow";
import BranchHead from "@/components/BranchHead";
import { mapSrc } from "@/lib/map";

const NAV = [
  ["about", "소개"],
  ["method", "근막이완"],
  ["branches", "지점"],
  ["team", "팀"],
  ["info", "이용 안내"],
  ["book", "예약"],
  ["faq", "FAQ"],
];

function Logo({ width }: { width: number }) {
  return (
    <picture>
      <img src="/logo-solid.png" alt="온기 (편안할 온 · 몸 기)" width={880} height={669} style={{ width: Math.round(width * 1.1), height: "auto", borderRadius: 12 }} />
    </picture>
  );
}

export default function Home() {
  const branches = publicBranches();
  const branchById = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
  // 검색엔진이 읽는 업체 정보 (이름·지점·주소·연락 채널)
  const seo = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "온기",
    alternateName: ["온기 근막이완", "온기 PT&근막이완", "ONGI", "Conditioning Studio 온기"],
    url: SITE_URL,
    logo: `${SITE_URL}/logo-solid.png`,
    sameAs: [LINKS.instagram, LINKS.naverPlace],
    department: BRANCHES.filter((b) => b.open && !b.hidden && b.address).map((b) => ({
      "@type": "HealthClub",
      name: b.name.startsWith("온기") ? b.name : `온기 근막이완 ${b.name}`,
      url: SITE_URL,
      address: { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "KR" },
      ...(b.lat ? { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } } : {}),
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo).replace(/</g, "\\u003c") }} />
      <nav className="topnav" aria-label="바로가기">
        <a href="#top" className="topnav-logo" aria-label="맨 위로">
          <Logo width={52} />
        </a>
        <div className="topnav-links">
          <a href="/member" className="nav-member">회원 페이지</a>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </div>
      </nav>

      <main id="top">
        {/* 첫 화면 */}
        <header className="hero">
          <h1><Logo width={220} /></h1>
          <svg className="eyebrow" viewBox="0 0 1000 64" role="img" aria-label={HERO.eyebrow}>
            <text x="0" y="50" textLength="1000" lengthAdjust="spacing">{HERO.eyebrow.toUpperCase()}</text>
          </svg>
          <p className="slogan">{HERO.slogan}</p>
          <p className="lead">{HERO.lead}</p>
          <div className="hero-cta">
            <a className="btn-primary" href="#trial">체험 예약하기</a>
            <a className="btn-ghost" href="/member">회원 페이지</a>
          </div>
          <p className="badge">100% 예약제 · 50분 1:1 · 개인 맞춤 컨디셔닝</p>
        </header>

        {/* 온기 이야기 */}
        <section id="about" className="sec">
          <h2>{STORY.title}</h2>
          {STORY.paragraphs.map((p) => <p key={p} className={p.startsWith("'") ? "story-quote" : undefined}>{p}</p>)}
          <div className="stats3">
            {STORY.stats.map((s) => (
              <div key={s.big}><b>{s.big}</b><span>{s.small}</span></div>
            ))}
          </div>
          <p className="closing">{STORY.closing}</p>
          <p className="disclaimer">{STORY.disclaimer}</p>
        </section>

        {/* 근막이완 */}
        <section id="method" className="sec">
          <h2>{METHOD.title}</h2>
          <div className="method">
            <MethodVideo src="/video/ongi-method.mp4" poster="/video/ongi-method.jpg" />
            <div className="method-body">
              <p>{METHOD.intro}</p>
              <ol className="steps">
                {METHOD.steps.map((s, i) => (
                  <li key={s.t}><b><em>{String(i + 1).padStart(2, "0")}</em> {s.t}</b><span>{s.d}</span></li>
                ))}
              </ol>
              <p className="note">{METHOD.note}</p>
            </div>
          </div>
        </section>

        {/* 지점 */}
        <section id="branches" className="sec">
          <h2>지점 안내</h2>
          <div className="bcards">
            {BRANCH_CARDS.map((c) => {
              const b = branchById[c.id];
              return (
                <article key={c.id} className="bcard">
                  <img src={c.photo} alt={c.title} loading="lazy" />
                  {c.more && c.more.length > 0 && (
                    <details className="bmore">
                      <summary>사진 더 보기 <small>{c.more.length}장</small></summary>
                      <div className="bmore-grid">
                        {c.more.map((src, i) => (
                          <a key={src} href={src} target="_blank" rel="noopener noreferrer" className={src.includes("-w.") ? "wide" : undefined}>
                            <img src={src} alt={`${c.title} 사진 ${i + 2}`} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="bcard-body">
                    <BranchHead title={c.title} address={b?.address} src={b?.address ? mapSrc(b.lat, b.lng, b.mapQuery || b.address) : undefined} />
                    <div className="tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</div>
                    <ul>{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
                    {b?.address && (
                      <a className="addr-link" href={`https://map.naver.com/p/search/${encodeURIComponent(b.mapQuery || b.address)}`} target="_blank" rel="noopener noreferrer">
                        {b.address}
                      </a>
                    )}
                    {b?.bookable === false ? <p className="bnotice">현재 예약 불가</p> : b?.trialClosed ? <p className="bnotice">신규 체험 예약 불가 · 기존 회원 예약 가능</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="guide">
            <h3>어느 지점으로 갈까요?</h3>
            <ul>
              {GUIDE.map((g) => <li key={g.q}><span>{g.q}</span><b>{g.a}</b></li>)}
            </ul>
          </div>
        </section>

        {/* 팀 */}
        <section id="team" className="sec">
          <h2>온기 컨디셔닝 팀</h2>
          <TeamGrid team={TEAM} />
          <div className="promise">
            <p>{TEAM_PROMISE.lead}</p>
            <ul>{TEAM_PROMISE.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </section>

        {/* 이용 안내 */}
        <section id="info" className="sec">
          <h2>이용 안내</h2>
          <div className="pricing">
            {PRICING.map((p) => (
              <div key={p.title} className="price">
                <h3>{p.title}</h3>
                <dl>{p.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                {p.note && <p className="small">{p.note}</p>}
                <a className="btn-ghost" href={p.cta.href}>{p.cta.label}</a>
              </div>
            ))}
          </div>
        </section>

        {/* 예약 */}
        <section id="book" className="sec">
          <h2>예약하기</h2>
          <BookingFlow
            branches={branches}
            trialPrice={BOOKING.trialPriceText}
            sessionMinutes={BOOKING.sessionMinutes}
            comingSoon={BRANCHES.filter((b) => !b.open).map((b) => b.short)}
          />
        </section>

        {/* FAQ */}
        <section id="faq" className="sec">
          <h2>자주 묻는 질문</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <FaqAnswer a={f.a} />
              </details>
            ))}
          </div>
          <div className="contact">
            <a href={LINKS.kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
            <a href={LINKS.naverTalk} target="_blank" rel="noopener noreferrer">네이버 톡톡 문의</a>
            <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">인스타그램</a>
            <a href={LINKS.naverPlace} target="_blank" rel="noopener noreferrer">네이버 플레이스</a>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <b>{FOOTER.name}</b>
        <span>{FOOTER.ceo}</span>
        {FOOTER.bizLines.map((l) => <span key={l}>{l}</span>)}
        <a href="/privacy">개인정보처리방침</a>
      </footer>

      <div className="dock">
        <a className="dock-book" href="#trial">예약하기</a>
        <a className="dock-kakao" href={LINKS.kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
      </div>
    </>
  );
}
