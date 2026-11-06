import { FOOTER } from "@/config/site";

export const metadata = { title: "개인정보처리방침 | 온기" };

export default function Privacy() {
  return (
    <article className="privacy">
      <a href="/">← 홈으로</a>
      <h1>개인정보처리방침</h1>
      <p>{FOOTER.name}(이하 &lsquo;온기&rsquo;)는 예약 서비스 제공을 위해 아래와 같이 개인정보를 처리합니다.</p>
      <h2>1. 수집 항목과 목적</h2>
      <ul>
        <li>수집 항목: 이름, 휴대폰 번호, 예약 일시·지점, 요청사항(선택)</li>
        <li>목적: 예약 접수·확인·변경·취소, 예약 관련 안내 연락</li>
      </ul>
      <h2>2. 보유 기간</h2>
      <p>예약일로부터 1년간 보관한 뒤 파기합니다. 관계 법령에 보관 의무가 있는 경우 그 기간 동안 보관합니다.</p>
      <h2>3. 처리 위탁</h2>
      <ul>
        <li>Google (예약 일정 저장)</li>
        <li>Vercel (웹사이트 운영)</li>
        <li>Notion (회원 정보 관리)</li>
        <li>문자 발송 업체 (예약 알림)</li>
      </ul>
      <h2>4. 제3자 제공</h2>
      <p>법령에 따른 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p>
      <h2>5. 이용자의 권리</h2>
      <p>언제든지 본인 정보의 열람·정정·삭제를 요청할 수 있습니다. 카카오톡 채널 [온기pt]로 문의해 주세요.</p>
      <h2>6. 개인정보 보호책임자</h2>
      <p>{FOOTER.ceo}</p>
      <p className="disclaimer">시행일: 2026년 11월 6일</p>
    </article>
  );
}
