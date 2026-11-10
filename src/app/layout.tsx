import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import VisitBeacon from "@/components/VisitBeacon";
import InsightTracker from "@/components/InsightTracker";
import { GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION, SITE_URL } from "@/config/site";

const TITLE = "온기 | Conditioning Studio 온기 근막이완 컨디셔닝";
const DESC = "몸을 편안하게, 움직임을 자유롭게. 온기 근막이완 컨디셔닝 소개, 지점 안내(잠원동 1·2호점·신반포스퀘어점·선릉점), 체험·회원·PT 상담 예약을 한곳에서.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  keywords: ["온기", "온기 근막이완", "온기PT", "근막이완", "IASTM", "스포츠 컨디셔닝", "잠원 근막이완", "신반포 근막이완", "선릉 근막이완"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ko_KR", url: "/", siteName: "온기", title: TITLE, description: DESC, images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "온기" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.jpg"] },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(NAVER_SITE_VERIFICATION ? { other: { "naver-site-verification": NAVER_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "only light", themeColor: "#faf6ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="color-scheme" content="only light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&family=Noto+Sans+KR:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <div className="wrap">{children}</div>
        {/* 방문자 통계: vercel.com/ongi4/ongi/analytics 에서 대표만 확인 */}
        <Analytics />
        <VisitBeacon />
        <InsightTracker />
      </body>
    </html>
  );
}
