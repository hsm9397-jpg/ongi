import MemberPortal from "@/components/MemberPortal";
import EventNotice from "@/components/EventNotice";
import AnnivNotice from "@/components/AnnivNotice";
import { TEAM, LINKS } from "@/config/site";

export const metadata = { title: "회원 페이지 | 온기", robots: { index: false } };

const ORDER = ["현승민", "황사라", "김나영", "송효재", "배태성", "이정민", "허재성"];

export default function MemberPage() {
  const groups = ORDER.map((n) => ({ name: n, photo: TEAM.find((t) => t.name === n)?.photo ?? "" }));
  return (
    <main className="mp">
      <header className="mp-head">
        <a href="/" aria-label="온기 홈">
          <picture>
            <img src="/logo-solid.png" alt="온기" width={880} height={669} style={{ width: 106, height: "auto", borderRadius: 10 }} />
          </picture>
        </a>
        <h1>회원 페이지</h1>
      </header>
      <MemberPortal groups={groups} kakao={LINKS.kakao} />
      <EventNotice img="/event/anniv-member.webp" alt="온기 1주년 감사제 회원 혜택: 근막이완 1회 추가 증정, 모든 프로그램 10% 할인(금액권은 5%), 감사 사은품 증정. 기간 2026년 11월 1일부터 11월 30일까지" until="2026-11-30" />
      <AnnivNotice />
    </main>
  );
}
