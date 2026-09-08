import SceneBanner from "@/components/scene-banner";

// 밤 숲길 배경 배너 -- 로그인·온보딩 첫 화면. (scene-banner의 얇은 별칭)
export default function ForestBanner({ height = 160 }: { height?: number }) {
  return <SceneBanner scene="forest" height={height} />;
}
