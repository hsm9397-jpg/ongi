import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import BookingFlow from "@/components/BookingFlow";

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
      <p className="foot">예약 변경·취소는 카카오채널 [온기pt]로 문의해 주세요.</p>
    </>
  );
}
