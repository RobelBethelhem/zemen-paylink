import os from "node:os";
import type { NextConfig } from "next";

// `next dev` refuses cross-origin requests to its own /_next/* resources, which
// silently breaks hydration when the portal is opened from another machine on
// the LAN. Allowing this host's own addresses keeps that safety net for anything
// unexpected while making "open it on the other PC" work without editing a file
// every time DHCP hands out a new address.
//
// PAYLINK_DEV_ORIGINS adds extra hosts — a tunnel domain, for example.
// This affects `next dev` only; a production build has no such restriction.
function devOrigins(): string[] {
  const origins = new Set<string>(["localhost", "127.0.0.1"]);

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) origins.add(address.address);
    }
  }

  for (const extra of (process.env.PAYLINK_DEV_ORIGINS ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

// Where this server can reach the Go API. Server-side only — never shipped to
// the browser.
const apiUpstream = (process.env.PAYLINK_API_UPSTREAM ?? "http://localhost:8080").replace(/\/$/, "");

// Headers a browser needs on every page. The CSP is the one that earns its
// keep: it is what stops an injected script running at all, which is the only
// defence against XSS that does not depend on getting every escape right.
//
// 'unsafe-inline' for styles is unavoidable here — the whole UI is styled with
// inline style objects. Scripts get no such exemption.
// React's development build uses eval() for stack reconstruction. Production
// never does, and giving a live page 'unsafe-eval' would undo most of what a
// CSP is for — so the exemption exists only while developing.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://*.mastercard.com",
].join(" ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Mastercard's Hosted Checkout script is loaded by the pay page.
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.mastercard.com",
      "font-src 'self' data:",
      // The API is same-origin through the rewrite; the gateway is called by
      // its own script.
      "connect-src 'self' https://*.mastercard.com",
      "frame-src https://*.mastercard.com",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "object-src 'none'",
    ].join("; "),
  },
];

// The path a reverse proxy publishes this under, when it publishes it under
// one — "/paybylinkapi", say.
//
// Baked in at build time because Next needs it to emit asset URLs: without it
// the browser asks for /_next/... at the proxy's root, which is not routed
// here, and the page arrives with no styles and no JavaScript. That failure
// looks like a broken build rather than a path problem, which is why it is
// worth being deliberate about.
//
// Set PAYLINK_BASE_PATH at image build time, and only when the proxy keeps the
// prefix on the way through. A proxy that strips it wants this left empty.
const basePath = (process.env.PAYLINK_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Emits a self-contained server with only the modules it actually uses, so
  // the runtime image carries no node_modules tree and no build toolchain.
  output: "standalone",

  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

  // The same value, readable from browser code. Next applies basePath to its
  // own pages and assets automatically, but the API calls this app makes are
  // plain fetches to /api/v1/... and know nothing about it — so they need it
  // spelled out. See apiBase() in lib/api.ts.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },

  allowedDevOrigins: devOrigins(),

  // A production bundle ships no source maps: it does not stop anyone reading
  // the code, but it does stop handing them an annotated copy of it.
  productionBrowserSourceMaps: false,

  // Do not advertise the framework and version to a scanner.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // The browser calls /api/v1/* on whatever host it loaded the portal from, and
  // this proxies it to the API. That means one port to expose when sharing the
  // portal (LAN address, tunnel, anything) and no CORS to configure.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiUpstream}/api/v1/:path*` }];
  },
};

export default nextConfig;
