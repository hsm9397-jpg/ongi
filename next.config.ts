import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // www.온기.com/회원 으로도 회원 페이지가 열리게
  async rewrites() {
    return [
      { source: "/%ED%9A%8C%EC%9B%90", destination: "/member" },
      // www.온기.com/금액 → 서비스 금액
      { source: "/%EA%B8%88%EC%95%A1", destination: "/price" },
    ];
  },
};

export default nextConfig;
