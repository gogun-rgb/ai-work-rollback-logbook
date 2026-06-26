import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI 작업 되돌리기 로그북",
  description:
    "AI 코딩 도구가 변경한 파일을 확인하고 유지하거나 안전하게 되돌릴 수 있도록 돕는 로컬 우선 웹 앱입니다."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
