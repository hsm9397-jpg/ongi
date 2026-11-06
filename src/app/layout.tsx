import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "온기 | Conditioning Studio 온기 근막이완 컨디셔닝",
  description: "몸을 편안하게, 움직임을 자유롭게. 온기 근막이완 컨디셔닝 소개, 지점 안내, 체험·회원·PT 상담 예약을 한곳에서.",
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
      </body>
    </html>
  );
}
