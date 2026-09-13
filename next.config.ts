import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the project root explicitly so Turbopack doesn't get confused by
  // an unrelated package-lock.json higher up the filesystem (e.g. in a
  // user's home directory on Windows) and silently misresolve things like
  // which .env.local to load into the client bundle.
  turbopack: {
    root: path.join(__dirname),
  },
  // 실사용 배포 전 최소 보안 헤더. 아이 사진·음성이 오가는 서비스라
  // clickjacking(다른 사이트가 iframe으로 감싸 클릭을 가로채는 공격)과
  // MIME 스니핑을 기본으로 막아 둔다. CSP는 카카오 CDN 표지 이미지·구글
  // 폰트 등 외부 출처가 여러 곳이라 지금 범위에서는 넣지 않았다(잘못
  // 좁히면 화면이 깨질 위험이 이득보다 큼 — 필요해지면 별도로 검토).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
