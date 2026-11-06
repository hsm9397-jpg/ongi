import MemberPortal from "@/components/MemberPortal";
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
            <img src="/logo.png" alt="온기" width={800} height={589} style={{ width: 96, height: "auto" }} />
          </picture>
        </a>
        <h1>회원 페이지</h1>
      </header>
      <MemberPortal groups={groups} kakao={LINKS.kakao} />
    </main>
  );
}
