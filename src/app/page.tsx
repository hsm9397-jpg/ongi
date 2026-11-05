import { BOOKING, BRANCHES, publicBranches } from "@/config/branches";
import BookingFlow from "@/components/BookingFlow";

export default function Home() {
  return (
    <>
      <header className="brand">
        <small>Conditioning Studio</small>
        <h1>온기</h1>
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
