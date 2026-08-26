"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function SalesDashboard() {
  const { linksList, on, txns } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:20px;background:linear-gradient(100deg,#141519,#301316 78%);border-radius:16px;padding:22px 26px;margin-bottom:16px;position:relative;overflow:hidden")}>
        <div style={s("position:absolute;right:-40px;top:-70px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0,rgba(218,30,40,0) 70%);opacity:.45")} />
        <div style={s("flex:1;position:relative;min-width:0")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em")}>
            Good afternoon, Meseret
          </div>
          <div style={s("color:#A7A9B2;font-size:13.5px;margin-top:5px")}>
            Bole Branch · create a link and share it with your customer to collect in seconds.
          </div>
        </div>
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
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:13px;color:#6B6D76;font-weight:500")}>My collected · 30d</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            $18,400
          </div>
          <div style={s("font-size:12.5px;color:#12905A;font-weight:600;margin-top:5px")}>▲ 11.0%</div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Payments</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            96
          </div>
          <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>this period</div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Active links</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            6
          </div>
          <div style={s("font-size:12.5px;color:#9A9CA5;margin-top:5px")}>2 near limit</div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-size:13px;color:#6B6D76;font-weight:500")}>Success rate</div>
          <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:27px;letter-spacing:-.02em;margin-top:12px")}>
            96.0%
          </div>
          <div style={s("font-size:12.5px;color:#12905A;font-weight:600;margin-top:5px")}>▲ 1.2%</div>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.9fr 1fr;gap:16px;margin-bottom:16px")}>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:2px")}>
            My collection trend
          </div>
          <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:8px")}>USD · last 30 days</div>
          <div style={s("height:190px")}>
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
              <path
                d="M0,160 L57,150 L113,158 L170,132 L227,140 L283,108 L340,118 L397,88 L453,96 L510,66 L567,74 L623,48 L680,40 L680,200 L0,200 Z"
                fill="url(#gSales)"
              />
              <path
                d="M0,160 L57,150 L113,158 L170,132 L227,140 L283,108 L340,118 L397,88 L453,96 L510,66 L567,74 L623,48 L680,40"
                fill="none"
                stroke="#DA1E28"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
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
          {" "}
          {linksList.map((l, i) => (
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
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
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
