import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import TeamGrid from "@/components/TeamGrid";
import FaqAnswer from "@/components/FaqAnswer";
import MethodVideo from "@/components/MethodVideo";
import { BRANCH_CARDS, FAQ, FOOTER, GUIDE, HERO, JOURNEY, LINKS, METHOD, PRICING, SITE_URL, STORY, TEAM, TEAM_PROMISE } from "@/config/site";
import BookingFlow from "@/components/BookingFlow";
import BranchHead from "@/components/BranchHead";
import { mapSrc } from "@/lib/map";
import Reviews from "@/components/Reviews";
import EventNotice from "@/components/EventNotice";

const NAV = [
  ["about", "소개"],
  ["method", "근막이완"],
  ["process", "진행 과정"],
  ["reviews", "후기"],
  ["branches", "지점"],
  ["team", "팀"],
  ["info", "이용 안내"],
  ["price", "서비스 금액"],
  ["book", "예약"],
  ["faq", "FAQ"],
];

function Logo({ width }: { width: number }) {
  return (
    <picture>
      {/* 다크모드 대비로 배경 칠한 로고 유지. 위 이벤트 배너 그림자에 겹치면 네모 경계가 보여 간격을 둠 (2026-11-10) */}
      <img src="/logo-solid.png" alt="온기 (편안할 온 · 몸 기)" width={880} height={669} style={{ width: Math.round(width * 1.1), height: "auto", borderRadius: 12, marginTop: 28 }} />
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
          <a href="/staff" className="nav-staff" rel="nofollow">Staff</a>
        </div>
      </nav>

      <main id="top">
        {/* 첫 화면 */}
        <header className="hero">
          <EventNotice img="/event/anniv-public.webp" alt="온기 1주년 감사제. 지금까지 온기를 찾아주신 모든 분들께 감사의 마음을 전합니다. 대상 온기의 모든 회원, 기간 2026년 11월 1일부터 11월 30일까지" until="2026-11-30" banner={{ title: "온기 1주년 감사제", sub: "2026. 11. 1 ~ 11. 30", note: "자세한 내용은 회원들께만 안내됩니다." }} />
          <h1><Logo width={220} /></h1>
          <svg className="eyebrow" viewBox="0 0 1000 64" role="img" aria-label={HERO.eyebrow}>
            <text x="0" y="50" textLength="1000" lengthAdjust="spacing">{HERO.eyebrow.toUpperCase()}</text>
          </svg>
          <p className="slogan">{HERO.slogan}</p>
          <p className="lead">{HERO.lead}</p>
          <div className="hero-cta">
            <a className="btn-primary" href="#trial">신규(체험) 예약하기</a>
            <a className="btn-primary btn-member" href="/member">온기 회원 전용 페이지</a>
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

        {/* 첫 방문부터 이후까지 */}
        <section id="process" className="sec journey">
          <h2>{JOURNEY.title}</h2>
          <img className="j-steps4" src="/journey/steps4.webp" width={1076} height={1461} alt="온기 근육 케어 4단계. 1. 몸 상태를 평가합니다. 2. 부드럽게 이완합니다. 3. 약화된 근육을 강화합니다. 4. 현재 상태 피드백 및 사후 관리를 진행합니다." loading="lazy" />
          <p className="j-lead">{JOURNEY.lead}</p>
          <div className="j-why">
            {JOURNEY.why.lines.map((l) => <p key={l}>{l}</p>)}
            <p className="j-why-a">{JOURNEY.why.answer}</p>
          </div>
          <ol className="j-steps">
            {JOURNEY.steps.map((s) => (
              <li key={s.t} className={/^\d/.test(s.n) ? undefined : "j-edge"}>
                <span className="j-n">{s.n}</span>
                <div>
                  {s.tag && <small className="j-tag">{s.tag}</small>}
                  <b>{s.t}</b>
                  <p>{s.d}</p>
                  {"img" in s && s.img && (
                    <div className={`j-imgs n${s.img.length}`}>
                      {s.img.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
                    </div>
                  )}
                  {"igNote" in s && s.igNote && (
                    <p className="j-ig">해당 과정은 <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">인스타그램</a>에서 영상으로 확인할 수 있습니다.</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <h3 className="j-sub">기대할 수 있는 변화</h3>
          <div className="j-expect">
            {JOURNEY.expect.map((e) => (
              <div key={e.t}><b>{e.t}</b><span>{e.d}</span></div>
            ))}
          </div>
          <p className="j-note">{JOURNEY.expectNote}</p>
          <h3 className="j-sub">이런 분께 추천해요</h3>
          <ul className="j-rec">
            {JOURNEY.recommend.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <a className="btn-primary j-cta" href="#trial">근막이완 체험 예약하기</a>
        </section>

        {/* 고객 후기 */}
        <section id="reviews" className="sec reviews">
          <h2>고객 후기</h2>
          <p className="rv-lead">네이버·당근에 고객님들이 남겨주신 후기 중 일부를 그대로 옮겼어요.</p>
          <Reviews />
          <p className="rv-hint">옆으로 넘겨서 더 보기 →</p>
          <a className="btn-ghost rv-more" href={LINKS.naverReview} target="_blank" rel="noopener noreferrer">네이버 리뷰 더 보기</a>
        </section>

        {/* 지점 */}
        <section id="branches" className="sec">
          <h2>지점 안내 <small className="h2-note">온기의 모든 지점은 직영으로 운영됩니다.</small></h2>
          <div className="bcards">
            {BRANCH_CARDS.map((c) => {
              const b = branchById[c.id];
              return (
                <article key={c.id} className="bcard">
                  <div className="bphoto">
                    <img src={c.photo} alt={c.title} loading="lazy" />
                    {c.badge && <span className="bbadge"><i aria-hidden>✦</i>{c.badge}</span>}
                  </div>
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

        {/* 서비스 금액: 버튼을 누르면 금액 페이지(/price)로 */}
        <section id="price" className="sec">
          <h2>서비스 금액</h2>
          <div className="pricing">
            <div className="price">
              <h3>근막이완 · PT 회원권</h3>
              <dl>
                <div><dt>패키지권</dt><dd>횟수 방식</dd></div>
                <div><dt>금액권</dt><dd>차감 방식</dd></div>
              </dl>
              <a className="btn-ghost" href="/price">서비스 금액 보기</a>
            </div>
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
            <a className="c-naver" href={LINKS.naverTalk} target="_blank" rel="noopener noreferrer">네이버 톡톡 문의</a>
            <a className="c-insta" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">인스타그램</a>
            <a className="c-naver" href={LINKS.naverPlace} target="_blank" rel="noopener noreferrer">네이버 플레이스</a>
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
        <a className="dock-book" href="#trial">신규(체험) 예약하기</a>
        <a className="dock-kakao" href={LINKS.kakao} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
      </div>
    </>
  );
}
