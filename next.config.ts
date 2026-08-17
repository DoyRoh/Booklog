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
};

export default nextConfig;
