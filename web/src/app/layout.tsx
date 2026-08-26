import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zemen PayLink — Merchant Portal",
  description:
    "Create secure Pay-by-Link payments backed by the Mastercard Payment Gateway.",
  icons: { icon: "/zemen-logo-dark.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// With scripting off there is no secure channel, so nothing the portal shows
// could be trusted anyway. The page is hidden outright rather than left as a
// dead shell that looks like it is working.
const NOSCRIPT_CSS = `
  .paylink-app { display: none; }
  .paylink-noscript { display: flex; }
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: NOSCRIPT_CSS }} />
        </noscript>
      </head>
      <body>
        <div
          className="paylink-noscript"
          style={{
            display: "none",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            background: "#141519",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          <div style={{ maxWidth: "440px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 600, marginBottom: "10px" }}>
              JavaScript is required
            </div>
            <p style={{ color: "#A7A9B2", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>
              Zemen PayLink encrypts every request in your browser before it is sent. That cannot
              happen with scripting turned off, so the portal will not load. Enable JavaScript for
              this site and reload the page.
            </p>
          </div>
        </div>
        <div className="paylink-app">{children}</div>
      </body>
    </html>
  );
}
