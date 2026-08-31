"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import type { StatPoint } from "@/lib/api";
import { useApp } from "@/store/AppProvider";
import { useSession } from "@/store/SessionProvider";

const RANGE_LABEL: Record<string, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  ytd: "year to date",
};

function greeting(at: Date) {
  const h = at.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The collection trend, drawn from the figures the server actually returned.
 *
 * Scaled to the largest bucket in the window rather than a fixed ceiling, so a
 * quiet week and a busy one are both legible. A single bucket is drawn flat —
 * one point is not a trend, and a line to nowhere reads as a crash.
 */
function trendPaths(points: StatPoint[], w = 680, h = 200) {
  if (points.length === 0) return null;
  const peak = Math.max(...points.map((p) => p.minor), 1);
  const y = (minor: number) => Math.round(h - 12 - (minor / peak) * (h - 42));
  const coords =
    points.length === 1
      ? [`0,${y(points[0].minor)}`, `${w},${y(points[0].minor)}`]
      : points.map((p, i) => `${Math.round((i * w) / (points.length - 1))},${y(p.minor)}`);
  return {
    line: `M${coords.join(" L")}`,
    area: `M${coords.join(" L")} L${w},${h} L0,${h} Z`,
  };
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>
        no earlier period to compare
      </div>
    );
  }
  const up = value >= 0;
  return (
    <div
      style={s(
        `font-size:12.5px;font-weight:600;margin-top:5px;color:${up ? "#12905A" : "#B0141C"}`,
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </div>
  );
}

function Kpi({
  label,
  value,
  children,
  muted,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
      <div style={s("font-size:13px;color:#6B6D76;font-weight:500")}>{label}</div>
      <div
        style={s(
          `font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px;color:${muted ? "#C6C7CD" : "#141519"}`,
        )}
      >
        {value}
      </div>
      {children}
    </div>
  );
}

export function SalesDashboard() {
  const { linksList, on, txns, analytics, analyticsLoading } = useApp();
  const { session } = useSession();

  const firstName = (session?.user.fullName ?? "").trim().split(/\s+/)[0] || "there";
  // The registered trading name, which is what a payer sees on their receipt.
  const merchantName = session?.user.mpgsMerchantName ?? session?.user.merchant ?? "";

  const activeLinks = linksList.filter((l) => l.lActive).length;
  const rangeLabel = RANGE_LABEL[analytics?.range ?? "30d"] ?? "30d";
  const isLive = analytics?.environment === "live";
  const trend = analytics ? trendPaths(analytics.daily) : null;

  // Nothing has been collected yet. Showing zeros beside "▲ 11.0%" would be
  // inventing a trend out of an empty table, so the tiles say so instead.
  const empty = !analyticsLoading && analytics ? !analytics.hasData : false;
  const dash = analyticsLoading ? "…" : "—";

  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:20px;background:linear-gradient(100deg,#141519,#301316 78%);border-radius:16px;padding:22px 26px;margin-bottom:16px;position:relative;overflow:hidden")}>
        <div style={s("position:absolute;right:-40px;top:-70px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0,rgba(218,30,40,0) 70%);opacity:.45")} />
        <div style={s("flex:1;position:relative;min-width:0")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em")}>
            {greeting(new Date())}, {firstName}
          </div>
          <div style={s("color:#A7A9B2;font-size:13.5px;margin-top:5px")}>
            {merchantName ? `${merchantName} · ` : ""}
            create a link and share it with your customer to collect in seconds.
          </div>
        </div>
        {analytics && (
          <span
            style={s(
              `position:relative;padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;white-space:nowrap;${
                isLive
                  ? "background:rgba(18,144,90,.16);color:#5FD3A0"
                  : "background:rgba(183,116,0,.22);color:#F0B429"
              }`,
            )}
          >
            {isLive ? "Live" : "Test mode"}
          </span>
        )}
        <button
          className="zx1vagk4"
          onClick={on.salesCreate}
          style={s("position:relative;display:flex;align-items:center;gap:9px;padding:13px 20px;border:none;background:#DA1E28;color:#fff;font-size:14.5px;font-weight:600;border-radius:12px;cursor:pointer;box-shadow:0 10px 26px rgba(218,30,40,.4);white-space:nowrap")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Pay-by-Link
        </button>
      </div>

      <div data-grid-kpi="" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px")}>
        <Kpi
          label={`My collected · ${rangeLabel}`}
          value={analytics?.collectedDisplay ?? dash}
          muted={empty}
        >
          {analytics && !empty && <Delta value={analytics.collectedChange} />}
        </Kpi>
        <Kpi
          label="Payments"
          value={analytics ? String(analytics.successfulCount) : dash}
          muted={empty}
        >
          <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>
            {analytics ? `of ${analytics.attempts} attempted` : "this period"}
          </div>
        </Kpi>
        <Kpi label="Active links" value={String(activeLinks)} muted={activeLinks === 0}>
          <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>
            {linksList.length} in total
          </div>
        </Kpi>
        <Kpi
          label="Success rate"
          value={analytics && analytics.attempts > 0 ? `${analytics.successRate.toFixed(1)}%` : dash}
          muted={empty}
        >
          {analytics && analytics.attempts > 0 && (
            <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>
              {analytics.failedCount} failed · {analytics.refundedCount} refunded
            </div>
          )}
        </Kpi>
      </div>

      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.9fr 1fr;gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:2px")}>
            My collection trend
          </div>
          <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:8px")}>
            {analytics ? `${analytics.currency} · last ${rangeLabel}` : "loading…"}
          </div>
          <div style={s("height:190px")}>
            {trend && !empty ? (
              <svg viewBox="0 0 680 200" preserveAspectRatio="none" style={s("width:100%;height:100%;display:block")}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#DA1E28" stopOpacity=".2" />
                    <stop offset="1" stopColor="#DA1E28" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="680" y2="50" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="100" x2="680" y2="100" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="150" x2="680" y2="150" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
                <path d={trend.area} fill="url(#gSales)" />
                <path
                  d={trend.line}
                  fill="none"
                  stroke="#DA1E28"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div style={s("height:100%;display:flex;align-items:center;justify-content:center;text-align:center;color:#9A9CA5;font-size:13px;padding:0 20px")}>
                {analyticsLoading
                  ? "Loading your collections…"
                  : "No payments collected yet. Create a link and share it — this chart fills in as customers pay."}
              </div>
            )}
          </div>
        </div>

        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
          <div style={s("padding:16px 18px;border-bottom:1px solid #F0F0F2;display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:14.5px")}>My links</span>
            <button
              onClick={on.salesLinks}
              style={s("border:none;background:transparent;color:#DA1E28;font-size:12.5px;font-weight:600;cursor:pointer")}
            >
              All
            </button>
          </div>
          {linksList.length === 0 && (
            <div style={s("padding:26px 18px;text-align:center;color:#9A9CA5;font-size:13px")}>
              No links yet.
            </div>
          )}
          {linksList.slice(0, 6).map((l, i) => (
            <Fragment key={i}>
              <div
                className="zxxbkkbw"
                onClick={l.open}
                style={s("display:flex;align-items:center;gap:11px;padding:13px 18px;border-bottom:1px solid #F5F5F6;cursor:pointer")}
              >
                <span style={s("width:32px;height:32px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <div style={s("flex:1;min-width:0")}>
                  <div style={s("font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {l.title}
                  </div>
                  <div style={s("font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                    {l.paid}{" collected"}
                  </div>
                </div>
                <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{l.amount}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #F0F0F2")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>My recent payments</div>
          <button
            className="zxoy0gmr"
            onClick={on.salesTxns}
            style={s("padding:8px 14px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:12.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
          >
            View all
          </button>
        </div>
        <div style={s("display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr;padding:11px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Customer & link</span>
          <span>Method</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        {txns.length === 0 && (
          <div style={s("padding:30px 22px;text-align:center;color:#9A9CA5;font-size:13px")}>
            No payments yet.
          </div>
        )}
        {txns.slice(0, 8).map((t, i) => (
          <Fragment key={i}>
            <div style={s("display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr;align-items:center;padding:13px 22px;border-bottom:1px solid #F5F5F6")}>
              <div style={s("min-width:0")}>
                <span style={s("display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.customer}
                </span>
                <span style={s("display:block;font-size:11.5px;color:#9A9CA5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.title}
                </span>
              </div>
              <div style={s("display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5B5D66")}>
                {t.mc && (
                  <span style={s("display:inline-flex;align-items:center;flex-shrink:0")}>
                    <span style={s("width:15px;height:15px;border-radius:50%;background:#EB001B")} />
                    <span style={s("width:15px;height:15px;border-radius:50%;background:#F79E1B;margin-left:-6px")} />
                  </span>
                )}
                {t.visa && (
                  <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:11px;color:#1A1F71;flex-shrink:0")}>
                    VISA
                  </span>
                )}
                <span style={s("font-family:'IBM Plex Mono';color:#9A9CA5;font-size:11.5px")}>{"••"}{t.last4}</span>
              </div>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
              <span>
                {t.sPaid && (
                  <span style={s("display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                    <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                    Paid
                  </span>
                )}
                {t.sPending && (
                  <span style={s("padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                    Pending
                  </span>
                )}
                {t.sFailed && (
                  <span style={s("padding:4px 10px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11.5px;font-weight:600")}>
                    Failed
                  </span>
                )}
                {t.sRefunded && (
                  <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                    Refunded
                  </span>
                )}
                {t.sExpired && (
                  <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                    Expired
                  </span>
                )}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
