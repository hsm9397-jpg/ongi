import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import { BRANCH_CARDS, FAQ, FOOTER, GUIDE, HERO, LINKS, METHOD, PRICING, STORY, TEAM, TEAM_PROMISE } from "@/config/site";
import BookingFlow from "@/components/BookingFlow";

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
  return (
    <>
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
          <small>{HERO.eyebrow}</small>
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
          {STORY.paragraphs.map((p) => <p key={p}>{p}</p>)}
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
            <a className="method-media" href={LINKS.reel} target="_blank" rel="noopener noreferrer">
              <img src={METHOD.image} alt="온기 근막이완 영상" loading="lazy" />
              <span className="play">▶ 영상 보기</span>
            </a>
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
                  <div className="bcard-body">
                    <h3>{c.title}</h3>
                    <div className="tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</div>
                    <ul>{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
                    {b?.address && (
                      <a className="addr-link" href={`https://map.naver.com/p/search/${encodeURIComponent(b.mapQuery || b.address)}`} target="_blank" rel="noopener noreferrer">
                        {b.address}
                      </a>
                    )}
                    {b?.bookable === false && <p className="bnotice">현재 예약 불가</p>}
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
          <div className="team">
            {TEAM.map((m) => (
              <a key={m.name} className="member" href={m.link} target="_blank" rel="noopener noreferrer">
                <img src={m.photo} alt={m.name} loading="lazy" />
                <b>{m.name}</b>
                <span>{m.role}</span>
              </a>
            ))}
          </div>
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
                <p>{f.a}</p>
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
