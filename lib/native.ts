// Capacitor 네이티브 껍데기(iOS/Android 앱) 안에서 열렸을 때만 동작하는
// 얇은 도우미. 앱은 Vercel의 웹을 그대로 띄우는 "원격 URL" 방식이라
// @capacitor/* 모듈을 웹 번들에 넣지 않고, 네이티브 쪽이 페이지에 주입하는
// window.Capacitor 브리지만 optional chaining으로 건드린다 -- 일반 브라우저
// 에서는 전부 no-op이다.

type PluginCall = (options?: Record<string, unknown>) => Promise<unknown>;

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
  Plugins?: Record<string, Record<string, PluginCall> | undefined>;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() ?? "web";
}

function plugin(name: string, method: string, options?: Record<string, unknown>) {
  if (!isNativeApp()) return;
  const fn = window.Capacitor?.Plugins?.[name]?.[method];
  if (!fn) return;
  fn(options).catch(() => {
    /* 플러그인이 없거나 실패해도 웹 동작에는 영향 없음 */
  });
}

/** 네이티브 스플래시(그림만)를 내린다 -- 웹 스플래시가 그려진 직후 부른다. */
export function hideNativeSplash() {
  plugin("SplashScreen", "hide", { fadeOutDuration: 200 });
}

/**
 * 상태바 글자색. "dark" = 어두운 배경 위 흰 글자(스플래시 동안),
 * "light" = 세이지 배경 위 진한 글자(평소). Capacitor StatusBar의 Style 값 이름과 같다.
 */
export function setNativeStatusBar(style: "dark" | "light") {
  plugin("StatusBar", "setStyle", { style: style === "dark" ? "DARK" : "LIGHT" });
}
