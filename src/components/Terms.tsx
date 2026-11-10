"use client";
import { useEffect, useRef, useState } from "react";

// 이용 약관 (출처: 노션 '📋 이용 약관(필독사항)' 31846121f7658038baf3c3b9c130fe35, 2026-11-10 옮김)
// 노션을 고쳐도 자동 반영되지 않음 → 바뀌면 이 파일을 고칠 것
const O = ({ children }: { children: React.ReactNode }) => <strong className="t-o">{children}</strong>;
const R = ({ children }: { children: React.ReactNode }) => <span className="t-r">{children}</span>;

export function TermsBody() {
  return (
    <div className="terms-body">
      <h4>[회원권의 사용에 관한 사항]</h4>
      <p><b>1. <O>패키지권</O> 환불 가능 기간</b> <R>(패키지권의 사용 기한은 없습니다.)</R></p>
      <p>① PT, 가동성: 1회당 1주 (10회 10주)<br />② 근막이완: 1회당 1주 (10회 10주)</p>
      <p><R>※</R> 패키지권은 회원권 <u>양도는 가능</u>하지만 <u>공유는 불가능</u>합니다.</p>

      <p><b>2. <O>멤버쉽권</O> 사용 기한</b> <R>(혜택 소멸 기한 / 금액은 소멸되지 않습니다.)</R></p>
      <p>본 멤버십의 유효 기간은 결제일로부터 <u>15개월</u>입니다.</p>
      <p><O><u>기간 만료 시 결제금액은 소멸되지 않으며 추가 적립금(5%)은 자동 소멸됩니다.</u></O></p>
      <p>이후 잔액은 일반 <u>정가 기준으로 차감</u>됩니다.</p>
      <p><u>유효기간 내 재결제 시 기존 잔액의 기간은 새 멤버십 기한으로 자동 연장</u>됩니다.</p>
      <p>멤버쉽권의 잔액이 남을 경우, 차액결제를 통해 멤버쉽권 혹은 패키지권을 이용할 수 있습니다.</p>
      <p>환불 시에는 위약금의 10%를 차감 후 이용하신 회차를 일반 정가 기준으로 역산하여 반환합니다. <u>(공정위 기준 준수)</u></p>
      <p>＊ 연장 가능 조건<br />입원 / 수술 등 의료적 사유 / 해외 출장 / 장기 체류 (항공권 등 증빙) / 임신 / 출산<br />기타 센터가 인정하는 불가피한 사유</p>

      <p><b>3. 스케쥴 변경</b>은 자유롭게 가능합니다. 당일 스케쥴도 당일 스케쥴 상황에 따라 얼마든지 조정 가능하지만 <O><u>당일 취소는 사유 불문 차감</u></O>됩니다.</p>
      <p><O><u>반대의 경우에도 담당자가 당일 취소 시 사유 불문 횟수 1회를 추가</u></O>합니다.</p>

      <p><b>4. 온기 회원권은 정찰제로 모든 회원들에 예외 없이 동일한 약관이 적용됩니다.</b></p>

      <h4>[환불에 관한 사항]</h4>
      <p>1. <R><u>사용기한 내</u></R> 환불 요청을 할 수 있으며, 환불 위약금은 등록 금액의 10%입니다. (공정위 기준)</p>
      <p>2. 환불 시 사용횟수만큼 차감되며, 차감 금액 기준은 정가(1회권)입니다.</p>
      <p>3. 환불이 불가한 경우<br />① 상기된 <R>사용 기한의 초과</R><br />② 전체 세션의 <R>50% 이상 사용</R>된 회원권</p>
      <p>※ 사용 기한이 초과되면 <R>환불은 불가하지만 잔여 세션 사용 가능</R>합니다.</p>

      <h4>[신발 보관에 관한 사항]</h4>
      <p>1. 계약이 종료된 시점으로부터 <b>6개월 이후</b>에도 수거되지 않은 신발은 상법 제154조 1항과 2항에 의거하여 폐기될 수 있습니다.</p>

      <h4>[기타 사항]</h4>
      <p>1. 물가상승, 주변환경, 상황의 변화 등에 따라 사전 고지를 통해 회원권 가격, 운영 시간의 변화가 있을 수 있습니다.</p>
    </div>
  );
}

const SEEN = "ongi-terms-seen";

/** 회원 페이지: 처음 한 번 약관 팝업 → 닫으면 '이용 약관' 버튼으로 날아가 앉는 효과 */
export function TermsPopup({ onClosed }: { onClosed: () => void }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN)) setOpen(true);
    } catch {}
  }, []);
  function close() {
    try { localStorage.setItem(SEEN, "1"); } catch {}
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); onClosed(); }, 450);
  }
  if (!open) return null;
  return <TermsDialog closing={closing} onClose={close} first />;
}

export function TermsDialog({ onClose, closing, first }: { onClose: () => void; closing?: boolean; first?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo(0, 0); }, []);
  return (
    <div className={`pop-bg terms-bg${closing ? " out" : ""}`} onClick={onClose}>
      <div className={`terms-pop${closing ? " out" : ""}`} role="dialog" aria-modal="true" aria-label="이용 약관" onClick={(e) => e.stopPropagation()}>
        <h3>📋 이용 약관 <small>(필독사항)</small></h3>
        <div className="terms-scroll" ref={ref}><TermsBody /></div>
        <button className="primary" onClick={onClose}>{first ? "확인했어요" : "닫기"}</button>
        {first && <p className="terms-hint">약관은 언제든 회원 페이지의 &lsquo;이용 약관&rsquo; 버튼에서 다시 볼 수 있어요.</p>}
      </div>
    </div>
  );
}
