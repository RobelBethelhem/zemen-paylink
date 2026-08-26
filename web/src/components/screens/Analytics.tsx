"use client";

import { Fragment } from "react";
import type { Analytics as AnalyticsData } from "@/lib/api";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

type Bar = { key: string; label: string; display: string; height: number; muted: boolean };
type Row = { key: string; name: string; initials: string; display: string; percent: number };

// The prototype's figures. Kept as the demo dataset so the admin and merchant
// screens — which have no live source yet — render exactly as designed.
const DEMO_BARS: Bar[] = [
  44, 52, 38, 60, 49, 30, 34, 66, 58, 72, 64, 40, 46, 82, 76, 94,
].map((height, i) => ({
  key: `demo-${i}`,
  label: "",
  display: "",
  height,
  muted: [0, 5, 6, 11, 12].includes(i),
}));

const DEMO: AnalyticsData & { bars: Bar[] } = {
  range: "30d",
  currency: "USD",
  environment: "live",
  bucket: "day",
  collectedDisplay: "$52,480",
  collectedMinor: 5_248_000,
  collectedChange: 9.2,
  successfulCount: 642,
  successfulChange: 6,
  successRate: 95.1,
  failedCount: 33,
  refundedCount: 8,
  pendingCount: 0,
  abandonedCount: 0,
  attempts: 675,
  avgTicketDisplay: "$81.70",
  daily: [],
  bars: DEMO_BARS,
  topLinks: [
    { id: "d1", name: "Donation — Flood Relief", minor: 0, display: "Br 284,300", count: 0, percent: 100 },
    { id: "d2", name: "Event Ticket — Gala", minor: 0, display: "Br 500,000", count: 0, percent: 71 },
    { id: "d3", name: "Annual Membership 2026", minor: 0, display: "$4,560", count: 0, percent: 52 },
    { id: "d4", name: "Invoice INV-2044", minor: 0, display: "$2,480", count: 0, percent: 34 },
  ],
  topOperators: [
    { id: "o1", name: "Selam Bekele", initials: "SB", minor: 0, display: "$22,050", count: 0, percent: 100 },
    { id: "o2", name: "Meseret Abebe", initials: "MA", minor: 0, display: "$18,400", count: 0, percent: 83 },
    { id: "o3", name: "Dawit Alemu", initials: "DA", minor: 0, display: "$14,120", count: 0, percent: 64 },
    { id: "o4", name: "Yohannes Tadesse", initials: "YT", minor: 0, display: "$9,300", count: 0, percent: 42 },
  ],
  otherTotals: [],
  hasData: true,
};

// Ranks one and two carry the strong red, the rest the lighter tint.
const rankColor = (i: number) => (i < 2 ? "#DA1E28" : "#E86A72");

const RANGE_LABEL: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
};

/** Bars are scaled against the best day so the shape of the period is readable. */
function toBars(data: AnalyticsData): Bar[] {
  const peak = data.daily.reduce((max, d) => Math.max(max, d.minor), 0);
  return data.daily.map((d) => {
    const weekday = new Date(`${d.day}T00:00:00Z`).getUTCDay();
    return {
      key: d.day,
      label: d.label,
      display: `${d.label} · ${d.display} · ${d.count} payment${d.count === 1 ? "" : "s"}`,
      // A floor of 4% keeps a day with takings visible next to a big one; a day
      // with none stays flat rather than being nudged up to look like takings.
      height: peak > 0 && d.minor > 0 ? Math.max(4, Math.round((d.minor / peak) * 100)) : 0,
      muted: data.bucket === "day" && (weekday === 0 || weekday === 6),
    };
  });
}

function change(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return { text: "No earlier period to compare", color: "#9A9CA5" };
  }
  if (value > 0) return { text: `▲ ${value}%`, color: "#12905A" };
  if (value < 0) return { text: `▼ ${Math.abs(value)}%`, color: "#B0141C" };
  return { text: "Unchanged", color: "#9A9CA5" };
}

function Empty({ note }: { note: string }) {
  return (
    <div style={s("padding:22px 0;text-align:center;font-size:12.5px;color:#9A9CA5")}>{note}</div>
  );
}

export function Analytics() {
  const {
    analytics,
    dateChip,
    dateRange,
    isLive,
    on,
    role,
    search,
    set,
    statChip,
    txnCount,
    txnTotal,
    txns,
  } = useApp();

  const a = analytics ?? DEMO;
  const bars = analytics ? toBars(analytics) : DEMO.bars;
  const links: Row[] = a.topLinks.map((l) => ({
    key: l.id,
    name: l.name,
    initials: "",
    display: l.display,
    percent: l.percent,
  }));
  const reps: Row[] = a.topOperators.map((o) => ({
    key: o.id,
    name: o.name,
    initials: o.initials || o.name.slice(0, 2).toUpperCase(),
    display: o.display,
    percent: o.percent,
  }));
  const collected = change(a.collectedChange);
  const successful = change(a.successfulChange);
  const period = RANGE_LABEL[dateRange.toLowerCase()] ?? "This period";

  // Every attempt in the window, so the success rate above can be checked
  // against it rather than taken on trust.
  const outcomes = [
    { label: "successful", count: a.successfulCount, dot: "#12905A" },
    { label: "failed", count: a.failedCount, dot: "#B0141C" },
    { label: "not completed", count: a.abandonedCount, dot: "#C9CACF" },
    { label: "awaiting the payer", count: a.pendingCount, dot: "#E8A33D" },
    { label: "refunded", count: a.refundedCount, dot: "#8B8D96" },
  ].filter((o) => o.count > 0);

  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px")}>
        <div style={s("display:flex;gap:6px")}>
          <button onClick={on.date7} style={dateChip.d7}>7D</button>
          <button onClick={on.date30} style={dateChip.d30}>30D</button>
          <button onClick={on.date90} style={dateChip.d90}>90D</button>
          <button onClick={on.dateYtd} style={dateChip.ytd}>YTD</button>
        </div>
        <div style={s("flex:1")} />
        <div style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7E7EA;border-radius:10px;padding:9px 13px;width:230px;max-width:100%")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9CA5" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            onChange={set.search}
            placeholder="Search txns…"
            value={search}
            style={s("border:none;background:transparent;font-size:13px;width:100%")}
          />
        </div>
        <button
          className="zxoy0gmr"
          style={s("display:flex;align-items:center;gap:8px;padding:9px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Export CSV
        </button>
      </div>
      <div data-grid-kpi="" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:12.5px;color:#6B6D76")}>Collected</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-top:6px")}>{a.collectedDisplay}</div>
          <div style={{ ...s("font-size:12px;font-weight:600;margin-top:3px"), color: collected.color }}>
            {collected.text}
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:12.5px;color:#6B6D76")}>Successful payments</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-top:6px")}>{a.successfulCount}</div>
          <div style={{ ...s("font-size:12px;font-weight:600;margin-top:3px"), color: successful.color }}>
            {successful.text}
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:12.5px;color:#6B6D76")}>Success rate</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-top:6px")}>{a.successRate}%</div>
          <div style={s("font-size:12px;color:#9A9CA5;margin-top:3px")}>
            {analytics
              ? `${a.successfulCount} of ${a.attempts} attempts`
              : `${a.failedCount} failed · ${a.refundedCount} refunded`}
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:12.5px;color:#6B6D76")}>Avg. ticket</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:23px;margin-top:6px")}>{a.avgTicketDisplay}</div>
          <div style={s("font-size:12px;color:#9A9CA5;margin-top:3px")}>
            {analytics ? `per payment · ${a.currency}` : "USD equivalent"}
          </div>
        </div>
      </div>
      {analytics && (outcomes.length > 0 || a.otherTotals.length > 0) && (
        <div style={s("display:flex;align-items:center;gap:9px;flex-wrap:wrap;background:#fff;border:1px solid #ECECEE;border-radius:12px;padding:11px 16px;margin-bottom:16px;font-size:12.5px;color:#6B6D76")}>
          {outcomes.map((o) => (
            <span key={o.label} style={s("display:inline-flex;align-items:center;gap:6px")}>
              <span
                style={{ ...s("width:7px;height:7px;border-radius:50%"), background: o.dot }}
              />
              <span style={s("font-weight:600;color:#3A3B42")}>{o.count}</span> {o.label}
            </span>
          ))}
          {a.otherTotals.length > 0 && (
            <>
              <span style={s("width:1px;height:14px;background:#ECECEE")} />
              <span>Also taken in other currencies, not added in:</span>
              {a.otherTotals.map((t) => (
                <span
                  key={t.currency}
                  style={s("font-family:'IBM Plex Mono';font-weight:600;color:#3A3B42;background:#F7F7F8;border-radius:7px;padding:3px 9px")}
                >
                  {t.display} <span style={s("color:#9A9CA5;font-weight:500")}>· {t.count}</span>
                </span>
              ))}
            </>
          )}
        </div>
      )}
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04);margin-bottom:16px")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:16px")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>Daily collection</div>
          <div style={s("font-size:12.5px;color:#8B8D96")}>
            {analytics ? `${period} · ${a.currency}` : "Last 16 days · USD"}
          </div>
        </div>
        {bars.every((b) => b.height === 0) ? (
          <Empty note="No payments were collected in this period." />
        ) : (
          <div style={s("display:flex;align-items:flex-end;gap:6px;height:170px")}>
            {bars.map((b) => (
              <div
                key={b.key}
                title={b.display}
                style={{
                  ...s("flex:1;border-radius:4px 4px 0 0"),
                  // A day that took nothing keeps a hairline, so the run of
                  // quiet days reads as zero rather than as missing data.
                  height: b.height === 0 ? "2px" : `${b.height}%`,
                  background:
                    b.height === 0 ? "#EDEDEF" : b.muted ? "#F3A6AB" : "#DA1E28",
                }}
              />
            ))}
          </div>
        )}
        {analytics && bars.some((b) => b.height > 0) && (
          <div style={s("display:flex;justify-content:space-between;margin-top:9px;font-size:11.5px;color:#9A9CA5")}>
            <span>{bars[0].label}</span>
            <span>{bars[bars.length - 1].label}</span>
          </div>
        )}
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:14.5px;margin-bottom:16px")}>
            Top links
          </div>
          {links.length === 0 ? (
            <Empty note="No link has been paid in this period." />
          ) : (
            <div style={s("display:flex;flex-direction:column;gap:15px")}>
              {links.map((l, i) => (
                <div key={l.key}>
                  <div style={s("display:flex;justify-content:space-between;gap:12px;font-size:12.5px;margin-bottom:6px")}>
                    <span style={s("color:#3A3B42;font-weight:500;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {l.name}
                    </span>
                    <span style={s("font-family:'IBM Plex Mono';font-weight:600;flex-shrink:0")}>{l.display}</span>
                  </div>
                  <div style={s("height:7px;background:#F2F2F4;border-radius:4px;overflow:hidden")}>
                    <div
                      style={{
                        ...s("height:100%;border-radius:4px"),
                        width: `${l.percent}%`,
                        background: rankColor(i),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:14.5px;margin-bottom:16px")}>
            {isLive && role === "sales" ? "Collected by you" : "Top sales reps"}
          </div>
          {reps.length === 0 ? (
            <Empty note="Nobody has collected a payment in this period." />
          ) : (
            <div style={s("display:flex;flex-direction:column;gap:13px")}>
              {reps.map((rep, i) => (
                <div key={rep.key} style={s("display:flex;align-items:center;gap:11px")}>
                  <span style={s("width:32px;height:32px;border-radius:50%;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0")}>
                    {rep.initials}
                  </span>
                  <div style={s("flex:1;min-width:0")}>
                    <div style={s("font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {rep.name}
                    </div>
                    <div style={s("height:5px;background:#F2F2F4;border-radius:3px;margin-top:5px;overflow:hidden")}>
                      <div
                        style={{
                          ...s("height:100%;border-radius:3px"),
                          width: `${rep.percent}%`,
                          background: rankColor(i),
                        }}
                      />
                    </div>
                  </div>
                  <span style={s("font-family:'IBM Plex Mono';font-size:12.5px;font-weight:600;flex-shrink:0")}>
                    {rep.display}
                  </span>
                </div>
              ))}
            </div>
          )}
          {isLive && role === "sales" && (
            <div style={s("font-size:11.5px;color:#9A9CA5;margin-top:13px")}>
              You can only see payments taken through links you created.
            </div>
          )}
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:flex;align-items:center;gap:8px;padding:16px 22px;border-bottom:1px solid #F0F0F2;flex-wrap:wrap")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-right:6px")}>
            Transactions
          </div>
          <button onClick={on.filterAll} style={statChip.all}>All</button>
          <button onClick={on.filterPaid} style={statChip.paid}>Paid</button>
          <button onClick={on.filterPending} style={statChip.pending}>Pending</button>
          <button onClick={on.filterFailed} style={statChip.failed}>Failed</button>
          <button onClick={on.filterRefunded} style={statChip.refunded}>Refunded</button>
          <div style={s("flex:1")} />
          <span style={s("font-size:12.5px;color:#9A9CA5")}>{txnCount}{" of "}{txnTotal}</span>
        </div>
        <div style={s("display:grid;grid-template-columns:1.3fr 1.8fr 1.2fr 1.1fr 1fr 1fr;padding:11px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Transaction</span>
          <span>Description</span>
          <span>Customer</span>
          <span>Method</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        {" "}
        {txns.map((t, i) => (
          <Fragment key={i}>
            <div
              className="zxxbkkbw"
              style={s("display:grid;grid-template-columns:1.3fr 1.8fr 1.2fr 1.1fr 1fr 1fr;align-items:center;padding:13px 22px;border-bottom:1px solid #F5F5F6")}
            >
              <div style={s("min-width:0")}>
                <span style={s("display:block;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono';white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.id}
                </span>
                <span style={s("display:block;font-size:11.5px;color:#9A9CA5")}>{t.date}</span>
              </div>
              <div style={s("min-width:0")}>
                <span style={s("display:block;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.title}
                </span>
                <span style={s("display:block;font-size:11.5px;color:#9A9CA5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.merchant}
                </span>
              </div>
              <span style={s("font-size:13px;color:#3A3B42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {t.customer}
              </span>
              <div style={s("display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5B5D66")}>
                {t.mc && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;flex-shrink:0")}>
                      <span style={s("width:15px;height:15px;border-radius:50%;background:#EB001B")} />
                      <span style={s("width:15px;height:15px;border-radius:50%;background:#F79E1B;margin-left:-6px")} />
                    </span>
                  </>
                )}
                {t.visa && (
                  <>
                    <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:11px;color:#1A1F71;flex-shrink:0")}>
                      VISA
                    </span>
                  </>
                )}
                <span style={s("font-family:'IBM Plex Mono';color:#9A9CA5;font-size:11.5px")}>{"••"}{t.last4}</span>
              </div>
              <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
              <span>
                {t.sPaid && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                      Paid
                    </span>
                  </>
                )}
                {" "}
                {t.sPending && (
                  <>
                    <span style={s("padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Pending
                    </span>
                  </>
                )}
                {" "}
                {t.sFailed && (
                  <>
                    <span style={s("padding:4px 10px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Failed
                    </span>
                  </>
                )}
                {" "}
                {t.sRefunded && (
                  <>
                    <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Refunded
                    </span>
                  </>
                )}
                {" "}
                {t.sExpired && (
                  <>
                    <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Expired
                    </span>
                  </>
                )}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
