// 네이버 지도 키가 있으면 네이버 지도, 없으면 구글 지도.
// 네이버는 한글 도메인을 등록할 수 없어서 지도 화면만 vercel 주소에서 불러온다.
const NAVER_MAP_ID = process.env.NEXT_PUBLIC_NAVER_MAP_ID || "a120cplv6t"; // 공개용 Client ID (등록된 주소에서만 작동)
const NAVER_MAP_HOST = "https://ongi-gray.vercel.app";

export function mapSrc(lat: number | undefined, lng: number | undefined, query: string) {
  if (NAVER_MAP_ID && lat && lng) return `${NAVER_MAP_HOST}/naver-map.html?lat=${lat}&lng=${lng}&id=${NAVER_MAP_ID}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}
