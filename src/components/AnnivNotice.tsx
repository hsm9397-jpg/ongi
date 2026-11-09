"use client";
import { useEffect, useState } from "react";

/** 회원 페이지: 1주년 감사제 안내(11/30까지) + 2027 이용금액 조정 사전 안내(11/30까지, 대표 요청). 내용은 대표 노션 '온기 1주년 감사제 및 공지 사항 안내'에서 옮김 */
const KAKAO = "http://pf.kakao.com/_eYctn";
const past = (d: string) => Date.now() > new Date(`${d}T23:59:59+09:00`).getTime();

export default function AnnivNotice() {
  const [now, setNow] = useState({ event: true, price: true });
  useEffect(() => setNow({ event: !past("2026-11-30"), price: !past("2026-11-30") }), []);
  if (!now.event && !now.price) return null;
  return (
    <div className="an">
      {now.event && (
        <>
          <section className="mp-card an-card">
            <h2>온기의 성장 ✨</h2>
            <p><b>숨 가쁘게 달려온 온기의 1년, 그 중심에는 언제나 회원님이 있었습니다.</b></p>
            <p>쉼 없이 채워진 예약과 깊은 신뢰 속에 온기는 지난 1년간 놀라운 속도로 공간을 넓혀왔습니다.</p>
            <p>본점의 성장을 시작으로 전문 케어를 위한 ‘온기 근막이완 더 프라이빗’ 론칭, 론칭 2개월만에 온기 근막이완 신반포스퀘어점 오픈, 그리고 12월 오픈을 앞둔 선릉점, 27년 청담점까지.</p>
            <p>방송과 미디어가 먼저 주목하는 브랜드가 된 지금, 온기는 이제 2027년 더 넓은 곳에서 새로운 기준을 만들어가려 합니다.</p>
            <p>하지만 온기가 이룬 그 어떤 숫자와 타이틀보다 소중한 것은, 온기의 손길을 믿고 찾아와 주신 회원님 한 분 한 분입니다.</p>
            <p>그 마음에 보답하고자, 작지만 온 마음을 담은 1주년 감사 혜택을 전합니다. 🎀</p>
          </section>

          <section className="mp-card an-card">
            <h2>온기 1주년 감사제</h2>
            <dl className="an-dl">
              <div><dt>대상</dt><dd>온기의 ‘모든 회원님’<small>단 한 번이라도 온기를 이용해주셨다면 모두 감사제 대상입니다.</small></dd></div>
              <div><dt>기간</dt><dd>2026년 11월 1일 ~ 11월 30일</dd></div>
            </dl>
            <h3>감사 혜택</h3>
            <ol className="an-list">
              <li><b>감사 사은품 증정</b><small>재고가 조기 소진될 수 있습니다.</small></li>
              <li><b>모든 프로그램 10% 할인</b><small>금액권 제외 · 감사제 기간 내 ‘한 건’</small></li>
              <li><b>근막이완 컨디셔닝 1회 추가 증정</b><small>네이버 리뷰 1건 작성 시 제공 (할인 등록 여부와 상관 없이 제공)<br />근막이완이 아닌 PT를 원하시는 경우 동일 혜택을 PT 1회로 변경하여 이용하실 수 있습니다.</small></li>
            </ol>
            <div className="an-box">
              <b>네이버 리뷰 작성 방법</b>
              <p>① 네이버 예약 → ② 이용완료 처리 → ③ 후기 작성</p>
              <p>리뷰 작성을 원하시는 회원님께서는 말씀해주시면 네이버 예약 링크를 보내드리겠습니다.</p>
            </div>
          </section>

          <section className="mp-card an-card">
            <h2>신청 방법</h2>
            <p>카카오 채널 채팅으로 말씀해주세요.</p>
            <ol className="an-list">
              <li>할인된 금액으로 프로그램을 등록하고자 한다면 그렇게 말씀해주세요.</li>
              <li>리뷰 작성 후 근막이완 1회를 받고자 하신다면, 담당 선생님을 배정하여 담당 선생님을 통해 리뷰를 위한 예약 링크를 보내드리겠습니다.</li>
              <li>오셔서 사은품만 가져가셔도 괜찮습니다.</li>
            </ol>
            <p className="an-warn">카카오채널은 본명이 보이지 않습니다. 카카오톡에 설정된 이름이 본명이 아니라면, 성함을 말씀해주셔야 수월하게 응대 가능합니다.</p>
            <a className="kakao" href={KAKAO} target="_blank" rel="noopener noreferrer">카카오 채널 바로가기</a>
          </section>

          <section className="mp-card an-card">
            <h2>금액권 회원 전용 혜택</h2>
            <p>기존 금액권에 <b>100만원 추가 충전</b> 시 → 10% 할인된 <b>90만원</b>에 충전하실 수 있습니다.</p>
            <p>즉, 90만원 결제 후 금액권에는 100만원이 그대로 추가됩니다.</p>
            <p>본 혜택은 기존 금액권을 이용 중인 회원님께만 제공됩니다. 추가 충전을 원하시는 회원님께서는 <b>‘금액권 추가 충전’</b>이라고 말씀해주세요.</p>
            <p>지난 시간 동안 온기를 꾸준히 이용해주신 금액권 회원님들께 감사드립니다.</p>
          </section>

          <section className="mp-card an-card an-letter">
            <p>온기가 걸어온 1년보다 앞으로 만들어갈 27년의 온기가 더 기대하고 있습니다.</p>
            <p>더 넓은 지역에서, 더 좋은 공간과 더 나은 프로그램으로 회원님들을 만나겠습니다.</p>
            <p>지난 1년간 온기를 찾아주신 모든 회원님들께 진심으로 감사드립니다.</p>
          </section>
        </>
      )}

      {now.price && (
        <section className="mp-card an-card">
          <h2>2027년 이용금액 조정 사전 안내</h2>
          <p><b>온기는 2027년 1월 1일부터 근막이완 컨디셔닝 이용금액을 조정합니다.</b> <span className="an-hl">PT는 금액 동결</span></p>
          <p>지난 1년간 예상보다 훨씬 많은 분들이 온기를 찾아주셨고, 현재는 여러 지점에서 예약 수요가 공급 가능한 범위를 넘어서는 상황이 반복되고 있습니다.</p>
          <p>이에 온기는 단순히 더 많은 예약을 받기 위해 운영 밀도를 높이기보다, 한 분 한 분에게 제공되는 시간과 서비스의 품질을 유지하는 것을 우선하기로 결정했습니다.</p>
          <p>이러한 변화와 함께 2027년 1월 1일부터 이용금액이 아래와 같이 조정됩니다.</p>
          <div className="an-price">
            <div>
              <span>현재 <small>부가세 별도</small></span>
              <ul><li>1회 <b>10만원</b></li><li>5회 <b>45만원</b></li><li>10회 <b>80만원</b></li></ul>
            </div>
            <div className="an-new">
              <span>2027년부터 <small>부가세 포함</small></span>
              <ul><li>1회 <b>12만원</b></li><li>5회 <b>55만원</b></li><li>10회 <b>100만원</b></li></ul>
            </div>
          </div>
          <p className="an-warn">여신금융법 기준에 따라 부가세가 포함된 금액으로 변경됩니다. 카드, 계좌이체, 현금 모두 동일하며 현금 결제 시 현금 영수증을 발행해드립니다.</p>
          <h3>조정 금액 요약</h3>
          <ul className="an-dots">
            <li>기존 공급가 기준 회당 1만원씩 인상</li>
            <li>최저 단가인 8만원은 20회권으로 유지</li>
            <li>2027년부터는 보다 명확하고 투명한 이용금액 안내를 위해 모든 금액을 부가세가 포함된 실제 결제금액으로 안내합니다.</li>
            <li>PT와 가동성회복프로그램의 단가는 동일하며, 부가세 포함 금액으로 표기되는 것 또한 동일합니다.</li>
          </ul>
          <p>기존 이용금액은 2026년 12월 31일까지 적용되며, <span className="an-hl">1주년 감사제 기간에는 기존 이용금액을 기준으로 10% 할인된 감사제 혜택이 적용됩니다.</span></p>
          <p>가격이 달라지는 만큼 그 이상의 가치를 느끼실 수 있도록, 서비스의 품질과 공간, 그리고 온기만의 컨디셔닝 경험을 더욱 발전시켜 나가겠습니다.</p>
          <p>모든 분들께 감사드립니다.</p>
          <p className="an-sign">온기穩己 대표 현승민 올림</p>
        </section>
      )}
    </div>
  );
}
