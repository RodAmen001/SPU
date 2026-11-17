import type { NextConfig } from "next";

// v6.6 — en-têtes de sécurité standard (audit v6.5 §B4) : le SPU est un service
// public — CSP stricte sur les contenus, clicjacking interdit, référent limité,
// HSTS une fois en HTTPS. Le CSP autorise ce que l'application utilise réellement
// (styles inline de Tailwind/shadcn, blobs audio/vidéo du moteur de voix, images
// distantes des sources) sans ouvrir de script externe.
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              // v6.7 — https: pour media-src : les MP3 du catalogue (incompetech.com)
              // sont distants — sans lui, la musique de fond se replie sur la boucle
              // locale et ne change plus jamais (rétrogression v6.6 corrigée).
              "media-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
