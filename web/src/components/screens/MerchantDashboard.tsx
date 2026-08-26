"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function MerchantDashboard() {
  const { dateChip, on, txns } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:20px;background:linear-gradient(100deg,#141519,#301316 78%);border-radius:16px;padding:22px 26px;margin-bottom:16px;position:relative;overflow:hidden")}>
        <div style={s("position:absolute;right:-40px;top:-70px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0,rgba(218,30,40,0) 70%);opacity:.45")} />
        <div style={s("flex:1;position:relative;min-width:0")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:21px;color:#fff;letter-spacing:-.01em")}>
            Collect a payment in seconds
          </div>
          <div style={s("color:#A7A9B2;font-size:13.5px;margin-top:5px;max-width:520px")}>
            Create a static or dynamic Pay-by-Link, set scan limits & expiry, then share by link, QR, SMS, email or WhatsApp — settled through Mastercard MPGS.
          </div>
        </div>
        <button
          className="zx1vagk4"
          onClick={on.merchCreate}
          style={s("position:relative;display:flex;align-items:center;gap:9px;padding:13px 20px;border:none;background:#DA1E28;color:#fff;font-size:14.5px;font-weight:600;border-radius:12px;cursor:pointer;box-shadow:0 10px 26px rgba(218,30,40,.4);white-space:nowrap")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Pay-by-Link
        </button>
      </div>
      <div data-grid-kpi="" style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Collected · 30d</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                <path d="M17 6h6v6" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            $52,480
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 9.2%</span>
            <span style={s("color:#9A9CA5")}>vs prev 30d</span>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Payments</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            642
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 6.0%</span>
            <span style={s("color:#9A9CA5")}>successful</span>
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
            95.1%
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#12905A;font-weight:600")}>▲ 0.8%</span>
            <span style={s("color:#9A9CA5")}>approval</span>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:center;justify-content:space-between")}>
            <span style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Active links</span>
            <span style={s("width:30px;height:30px;border-radius:8px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
          </div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            4
          </div>
          <div style={s("display:flex;align-items:center;gap:5px;margin-top:5px;font-size:12.5px")}>
            <span style={s("color:#9A9CA5")}>of 12 total links</span>
          </div>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.9fr 1fr;gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px")}>
            <div>
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>Collection trend</div>
              <div style={s("font-size:12.5px;color:#8B8D96")}>USD equivalent · last 30 days</div>
            </div>
            <div style={s("display:flex;gap:6px")}>
              <button onClick={on.date7} style={dateChip.d7}>7D</button>
              <button onClick={on.date30} style={dateChip.d30}>30D</button>
              <button onClick={on.date90} style={dateChip.d90}>90D</button>
            </div>
          </div>
          <div style={s("position:relative;height:200px;margin-top:8px")}>
            <svg viewBox="0 0 680 210" preserveAspectRatio="none" style={s("width:100%;height:100%;display:block")}>
              <defs>
                <linearGradient id="gMerch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#DA1E28" stopOpacity=".2" />
                  <stop offset="1" stopColor="#DA1E28" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="45" x2="680" y2="45" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="95" x2="680" y2="95" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="145" x2="680" y2="145" stroke="#F0F0F2" vectorEffect="non-scaling-stroke" />
              <path
                d="M0,170 L57,158 L113,164 L170,150 L227,120 L283,132 L340,96 L397,110 L453,74 L510,86 L567,54 L623,60 L680,36 L680,210 L0,210 Z"
                fill="url(#gMerch)"
              />
              <path
                d="M0,170 L57,158 L113,164 L170,150 L227,120 L283,132 L340,96 L397,110 L453,74 L510,86 L567,54 L623,60 L680,36"
                fill="none"
                stroke="#DA1E28"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            {" "}
            <div style={s("display:flex;justify-content:space-between;font-size:11px;color:#A9ABB3;margin-top:8px")}>
              <span>20 Jun</span>
              <span>27</span>
              <span>04 Jul</span>
              <span>11</span>
              <span>19</span>
            </div>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:2px")}>
            By branch
          </div>
          <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:18px")}>Volume this period</div>
          <div style={s("display:flex;flex-direction:column;gap:16px")}>
            <div>
              <div style={s("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px")}>
                <span style={s("color:#3A3B42;font-weight:500")}>Bole</span>
                <span style={s("font-family:'IBM Plex Mono';font-weight:600")}>$61,200</span>
              </div>
              <div style={s("height:8px;background:#F2F2F4;border-radius:5px;overflow:hidden")}>
                <div style={s("height:100%;width:100%;background:#DA1E28;border-radius:5px")} />
              </div>
            </div>
            <div>
              <div style={s("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px")}>
                <span style={s("color:#3A3B42;font-weight:500")}>Kazanchis</span>
                <span style={s("font-family:'IBM Plex Mono';font-weight:600")}>$38,900</span>
              </div>
              <div style={s("height:8px;background:#F2F2F4;border-radius:5px;overflow:hidden")}>
                <div style={s("height:100%;width:64%;background:#DA1E28;border-radius:5px")} />
              </div>
            </div>
            <div>
              <div style={s("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px")}>
                <span style={s("color:#3A3B42;font-weight:500")}>Megenagna</span>
                <span style={s("font-family:'IBM Plex Mono';font-weight:600")}>$27,750</span>
              </div>
              <div style={s("height:8px;background:#F2F2F4;border-radius:5px;overflow:hidden")}>
                <div style={s("height:100%;width:45%;background:#E86A72;border-radius:5px")} />
              </div>
            </div>
            <div>
              <div style={s("display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px")}>
                <span style={s("color:#3A3B42;font-weight:500")}>Piassa</span>
                <span style={s("font-family:'IBM Plex Mono';font-weight:600")}>$21,400</span>
              </div>
              <div style={s("height:8px;background:#F2F2F4;border-radius:5px;overflow:hidden")}>
                <div style={s("height:100%;width:35%;background:#E86A72;border-radius:5px")} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #F0F0F2")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>Recent payments</div>
          <button
            className="zxoy0gmr"
            onClick={on.merchTxns}
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
        {" "}
        {txns.map((t, i) => (
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
              <div style={s("display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5B5D66;min-width:0")}>
                {t.mc && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;flex-shrink:0")}>
                      <span style={s("width:16px;height:16px;border-radius:50%;background:#EB001B")} />
                      <span style={s("width:16px;height:16px;border-radius:50%;background:#F79E1B;margin-left:-7px")} />
                    </span>
                  </>
                )}
                {t.visa && (
                  <>
                    <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:12px;color:#1A1F71;flex-shrink:0")}>
                      VISA
                    </span>
                  </>
                )}
                <span style={s("font-family:'IBM Plex Mono';color:#9A9CA5;font-size:12px")}>{"••"}{t.last4}</span>
              </div>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
              <span>
                {t.sPaid && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                      Paid
                    </span>
                  </>
                )}
                {" "}
                {t.sPending && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#F0A83A")} />
                      Pending
                    </span>
                  </>
                )}
                {" "}
                {t.sFailed && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#DA1E28")} />
                      Failed
                    </span>
                  </>
                )}
                {" "}
                {t.sRefunded && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Refunded
                    </span>
                  </>
                )}
                {" "}
                {t.sExpired && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
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
