import type { Metadata } from "next";
import StaffBoard from "@/components/StaffBoard";

export const metadata: Metadata = { title: "지점 스케줄 | 온기", robots: { index: false } };

export default function StaffPage() {
  return <StaffBoard />;
}
