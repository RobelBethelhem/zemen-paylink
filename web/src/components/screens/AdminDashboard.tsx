"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function AdminDashboard() {
  const { dateChip, merchants, on } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px")}>
        <div style={s("display:flex;gap:6px")}>
          <button onClick={on.date7} style={dateChip.d7}>7D</button>
          <button onClick={on.date30} style={dateChip.d30}>30D</button>
          <button onClick={on.date90} style={dateChip.d90}>90D</button>
          <button onClick={on.dateYtd} style={dateChip.ytd}>YTD</button>
        </div>
        <div style={s("flex:1")} />
        <button
          className="zxoy0gmr"
          style={s("display:flex;align-items:center;gap:8px;padding:9px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Export
        </button>
      </div>
      <div data-grid-kpi="" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Total volume</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                <path d="M17 6h6v6" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            $419,760
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 12.4%</span>
            <span style={s("color:#9A9CA5")}>vs prev 30d</span>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Transactions</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M17 2l4 4-4 4" />
                <path d="M3 6h18" />
                <path d="M7 22l-4-4 4-4" />
                <path d="M21 18H3" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            3,044
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 8.1%</span>
            <span style={s("color:#9A9CA5")}>vs prev 30d</span>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Success rate</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            94.2%
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 1.3%</span>
            <span style={s("color:#9A9CA5")}>approval ratio</span>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Merchants</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M3 9l1.5-5h15L21 9" />
                <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            6
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>5 active</span>
            <span style={s("color:#9A9CA5")}>· 1 pending</span>
          </div>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.9fr 1fr;gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px")}>
            <div>
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>Payment volume</div>
              <div style={s("font-size:12.5px;color:#8B8D96")}>USD equivalent · last 30 days</div>
            </div>
            <div style={s("display:flex;align-items:center;gap:14px;font-size:12px;color:#6B6D76")}>
              <span style={s("display:flex;align-items:center;gap:6px")}>
                <span style={s("width:10px;height:3px;border-radius:2px;background:#DA1E28")} />
                This period
              </span>
              <span style={s("display:flex;align-items:center;gap:6px")}>
                <span style={s("width:10px;height:3px;border-radius:2px;background:#C7C8CE")} />
                Previous
              </span>
            </div>
          </div>
          <div style={s("position:relative;height:210px;margin-top:8px")}>
            <svg viewBox="0 0 680 220" preserveAspectRatio="none" style={s("width:100%;height:100%;display:block")}>
              <defs>
                <linearGradient id="gAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#DA1E28" stopOpacity=".22" />
                  <stop offset="1" stopColor="#DA1E28" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line
                x1="0"
                y1="40"
                x2="680"
                y2="40"
                stroke="#F0F0F2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1="90"
                x2="680"
                y2="90"
                stroke="#F0F0F2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1="140"
                x2="680"
                y2="140"
                stroke="#F0F0F2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1="190"
                x2="680"
                y2="190"
                stroke="#F0F0F2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,180 L57,168 L113,176 L170,140 L227,150 L283,112 L340,120 L397,86 L453,92 L510,60 L567,50 L623,34 L680,24 L680,220 L0,220 Z"
                fill="url(#gAdmin)"
              />
              <path
                d="M0,190 L57,185 L113,188 L170,170 L227,175 L283,150 L340,158 L397,140 L453,146 L510,128 L567,120 L623,110 L680,104"
                fill="none"
                stroke="#C7C8CE"
                strokeWidth="2"
                strokeDasharray="4 5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,180 L57,168 L113,176 L170,140 L227,150 L283,112 L340,120 L397,86 L453,92 L510,60 L567,50 L623,34 L680,24"
                fill="none"
                stroke="#DA1E28"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            {" "}
            <div style={s("position:absolute;top:12px;right:0;transform:translateX(0)")}>
              <div style={s("position:relative")}>
                <span style={s("position:absolute;right:2px;top:2px;width:10px;height:10px;border-radius:50%;background:#DA1E28;box-shadow:0 0 0 4px rgba(218,30,40,.18)")} />
              </div>
            </div>
            <div style={s("display:flex;justify-content:space-between;font-size:11px;color:#A9ABB3;margin-top:8px")}>
              <span>20 Jun</span>
              <span>25</span>
              <span>30</span>
              <span>05 Jul</span>
              <span>10</span>
              <span>15</span>
              <span>19</span>
            </div>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:2px")}>
            Payment status
          </div>
          <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:10px")}>Share of all transactions</div>
          <div style={s("display:flex;align-items:center;justify-content:center;position:relative;height:150px")}>
            <svg width="150" height="150" viewBox="0 0 140 140">
              <g transform="rotate(-90 70 70)" fill="none" strokeWidth="16">
                <circle cx="70" cy="70" r="54" stroke="#DA1E28" strokeDasharray="278.2 61.1" strokeDashoffset="0" />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  stroke="#F0A83A"
                  strokeDasharray="20.4 318.9"
                  strokeDashoffset="-278.2"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  stroke="#5B5D66"
                  strokeDasharray="23.75 315.5"
                  strokeDashoffset="-298.6"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  stroke="#C7C8CE"
                  strokeDasharray="6.79 332.5"
                  strokeDashoffset="-322.35"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  stroke="#E7E7EA"
                  strokeDasharray="10.18 329.1"
                  strokeDashoffset="-329.14"
                />
              </g>
              <text
                x="70"
                y="66"
                textAnchor="middle"
                style={s("font-family:'Space Grotesk';font-weight:700;font-size:20px;fill:#141519")}
              >
                3,044
              </text>
              <text
                x="70"
                y="82"
                textAnchor="middle"
                style={s("font-family:'IBM Plex Sans';font-size:9.5px;fill:#8B8D96;letter-spacing:.08em")}
              >
                TRANSACTIONS
              </text>
            </svg>
          </div>
          <div style={s("display:flex;flex-direction:column;gap:8px;margin-top:12px")}>
            <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px")}>
              <span style={s("width:9px;height:9px;border-radius:2px;background:#DA1E28")} />
              <span style={s("flex:1;color:#3A3B42")}>Paid</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>82%</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px")}>
              <span style={s("width:9px;height:9px;border-radius:2px;background:#F0A83A")} />
              <span style={s("flex:1;color:#3A3B42")}>Pending</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>6%</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px")}>
              <span style={s("width:9px;height:9px;border-radius:2px;background:#5B5D66")} />
              <span style={s("flex:1;color:#3A3B42")}>Failed</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>7%</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px")}>
              <span style={s("width:9px;height:9px;border-radius:2px;background:#C7C8CE")} />
              <span style={s("flex:1;color:#3A3B42")}>Refunded</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>2%</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px")}>
              <span style={s("width:9px;height:9px;border-radius:2px;background:#E7E7EA")} />
              <span style={s("flex:1;color:#3A3B42")}>Expired</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>3%</span>
            </div>
          </div>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #F0F0F2")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>Merchants</div>
          <div style={s("display:flex;gap:10px")}>
            <button
              className="zxoy0gmr"
              onClick={on.adminMerchants}
              style={s("padding:8px 14px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:12.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
            >
              View all
            </button>
            <button
              className="zx15p5ni"
              onClick={on.adminCreateMerchant}
              style={s("display:flex;align-items:center;gap:7px;padding:8px 14px;border:none;background:#141519;color:#fff;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Onboard merchant
            </button>
          </div>
        </div>
        <div style={s("display:grid;grid-template-columns:2.4fr 1.4fr .8fr .7fr 1.1fr 1fr 36px;padding:11px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Merchant</span>
          <span>Category</span>
          <span>Branches</span>
          <span>Team</span>
          <span>Volume</span>
          <span>Status</span>
          <span />
        </div>
        {" "}
        {merchants.map((m, i) => (
          <Fragment key={i}>
            <div
              className="zxxbkkbw"
              onClick={m.open}
              style={s("display:grid;grid-template-columns:2.4fr 1.4fr .8fr .7fr 1.1fr 1fr 36px;align-items:center;padding:13px 22px;border-bottom:1px solid #F5F5F6;cursor:pointer")}
            >
              <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                <span style={s("width:36px;height:36px;border-radius:9px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0")}>
                  {m.initials}
                </span>
                <span style={s("min-width:0")}>
                  <span style={s("display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {m.name}
                  </span>
                  <span style={s("display:block;font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                    {m.id}
                  </span>
                </span>
              </div>
              <span style={s("font-size:13px;color:#5B5D66")}>{m.cat}</span>
              <span style={s("font-size:13px;color:#3A3B42;font-weight:500")}>{m.branches}</span>
              <span style={s("font-size:13px;color:#3A3B42;font-weight:500")}>{m.team}</span>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{m.volume}</span>
              <span>
                {m.mActive && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Active
                    </span>
                  </>
                )}
                {" "}
                {m.mPending && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Pending
                    </span>
                  </>
                )}
                {" "}
                {m.mSuspended && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Suspended
                    </span>
                  </>
                )}
              </span>
              <span style={s("display:flex;justify-content:flex-end;color:#C7C8CE")}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
