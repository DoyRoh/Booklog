import type { CapacitorConfig } from "@capacitor/cli";

// 책숲 네이티브 껍데기(Capacitor) 설정.
//
// 앱은 정적 번들이 아니라 Vercel에 배포된 Next.js 서버를 그대로 띄우는
// "원격 URL" 방식이다 -- 웹과 앱이 항상 같은 코드를 보고, 배포도 한 번이면
// 된다. webDir(native/www)에는 서버에 못 닿을 때 보여줄 오프라인 안내
// 페이지(error.html)만 들어 있다.
//
// 배포 도메인이 바뀌면 CAP_SERVER_URL 환경변수 또는 아래 기본값을 고친 뒤
// `npx cap sync`를 다시 돌린다.
const SERVER_URL = process.env.CAP_SERVER_URL ?? "https://booklog-13xh.vercel.app";

const config: CapacitorConfig = {
  // 번들 ID -- 스토어에 한 번 올리면 못 바꾸니 첫 업로드 전에 확정할 것.
  appId: "com.chaeksup.app",
  appName: "책숲",
  webDir: "native/www",
  server: {
    url: SERVER_URL,
    // 서버 응답이 없을 때(비행기 모드 등) 흰 화면 대신 보여줄 페이지.
    errorPath: "error.html",
    cleartext: false,
  },
  // 웹 쪽(proxy.ts, 클라이언트)이 "앱 안에서 열렸다"를 알아볼 수 있게 UA에 표식을 남긴다.
  appendUserAgent: "ChaeksupApp",
  backgroundColor: "#EAF0E5",
  ios: {
    contentInset: "automatic",
    // 상단 노치·하단 홈바 영역까지 웹뷰가 차지하고, 여백은 웹의
    // env(safe-area-inset-*)로 처리한다(이미 viewportFit=cover).
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
    // 뒤로 가기 버튼은 Capacitor 기본 동작(웹뷰 히스토리 뒤로, 더 없으면 앱 종료).
  },
  plugins: {
    SplashScreen: {
      // 네이티브 스플래시는 웹뷰가 뜰 때까지만. 웹 쪽 스플래시(밤 숲 그림 +
      // 문구, components/splash-screen.tsx)가 마운트되는 순간 직접 hide()를
      // 불러 그림에서 그림으로 이어지게 한다.
      launchAutoHide: false,
      backgroundColor: "#1B3A2A",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      // 세이지 배경 위 진한 글자(iOS/Android 공통). 스플래시 동안엔 웹에서 잠시 바꾼다.
      style: "LIGHT",
      backgroundColor: "#EAF0E5",
    },
  },
};

export default config;
