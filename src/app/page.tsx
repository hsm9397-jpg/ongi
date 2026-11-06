import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import BookingFlow, { KAKAO_CHAT_URL } from "@/components/BookingFlow";

export default function Home() {
  return (
    <>
      <header className="brand">
        <h1>
          <picture>
            <source srcSet="/logo-dark.png" media="(prefers-color-scheme: dark)" />
            <img src="/logo.png" alt="온기 (편안할 온 · 몸 기)" width={800} height={589} />
          </picture>
        </h1>
        <small>Conditioning Studio</small>
        <p>몸을 편안하게, 움직임을 자유롭게.</p>
      </header>
      <BookingFlow
        branches={publicBranches()}
        trialPrice={BOOKING.trialPriceText}
        sessionMinutes={BOOKING.sessionMinutes}
        comingSoon={BRANCHES.filter((b) => !b.open).map((b) => b.short)}
      />
      <div className="foot">
        <a className="kakao" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">카카오톡 문의</a>
      </div>
    </>
  );
}
