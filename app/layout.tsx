import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Gowun_Dodum, Gamja_Flower, Gowun_Batang } from "next/font/google";
import BottomNav from "@/components/bottom-nav";
import TopBar from "@/components/top-bar";
import OperatorGroupBar from "@/components/operator-group-bar";
import ChildGroupBar from "@/components/child-group-bar";
import ProfileProvider from "@/components/profile-context";
import SplashScreen from "@/components/splash-screen";
import ScrollToTop from "@/components/scroll-to-top";
import "./globals.css";

const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun-dodum",
  weight: "400",
  subsets: ["latin"],
});

const gamjaFlower = Gamja_Flower({
  variable: "--font-gamja-flower",
  weight: "400",
  subsets: ["latin"],
});

// 책 본문 느낌의 명조 -- 스플래시 문구처럼 "책의 한 구절"로 읽혀야 하는
// 자리에만 쓴다(Gowun Dodum과 같은 집안이라 제목 서체와도 어울림).
const gowunBatang = Gowun_Batang({
  variable: "--font-gowun-batang",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "책숲",
  description: "아이의 독서를 부모·교사와 함께 기록하고 넓혀가는 독서 플랫폼",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "책숲",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#EAF0E5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${gowunDodum.variable} ${gamjaFlower.variable} ${gowunBatang.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        <ScrollToTop />
        <ProfileProvider>
          <TopBar />
          {/* 숲지기 아이들/추천도서/숙제, 부모 숲길/숙제 -- 그룹 전환 바를
              TopBar처럼 루트에 한 번만 마운트해서 탭을 오가도 사라졌다
              다시 나타나지 않는다(사용자 지적: "제목처럼 그 자리에 계속
              있어야지"). 부모/숲지기 역할에 따라 둘 중 하나만 켜진다. */}
          <Suspense fallback={null}>
            <OperatorGroupBar />
            <ChildGroupBar />
          </Suspense>
          <main className="flex-1 pt-[52px] pb-[96px]">{children}</main>
          <BottomNav />
        </ProfileProvider>
      </body>
    </html>
  );
}
