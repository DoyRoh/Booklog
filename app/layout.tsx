import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Gamja_Flower } from "next/font/google";
import BottomNav from "@/components/bottom-nav";
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

export const metadata: Metadata = {
  title: "책숲",
  description: "아이의 독서를 부모·교사와 함께 기록하고 넓혀가는 독서 플랫폼",
  manifest: "/manifest.webmanifest",
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
      className={`${gowunDodum.variable} ${gamjaFlower.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1 pb-[64px]">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
