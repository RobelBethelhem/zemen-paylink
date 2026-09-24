// URLs for files served from public/ — the logos, the QR placeholder.
//
// Next rewrites /_next/* with assetPrefix, but files in public/ are not its
// assets: a plain src="/zemen-logo-dark.png" is emitted exactly as written.
// Published beneath a reverse-proxy path that URL points at the proxy's root,
// which is not routed here, and the image comes back 403 while the rest of the
// page loads normally — so the portal looks subtly broken rather than broken.
//
// The prefix is empty on a deployment that is not published under a path, and
// this returns the argument unchanged.
export function asset(path: string): string {
  const prefix = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${prefix}${path}`;
}
