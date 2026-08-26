"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function AdminMerchantDetail() {
  const { activeMerchant, merchantTxns, on } = useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:1200px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <button
        className="zxoy0gmr"
        onClick={on.adminMerchants}
        style={s("display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer;margin-bottom:16px")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        All merchants
      </button>
      {" "}
      <div style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px")}>
        <span style={s("width:52px;height:52px;border-radius:13px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600")}>
          {activeMerchant.initials}
        </span>
        <div style={s("flex:1;min-width:0")}>
          <div style={s("display:flex;align-items:center;gap:11px;flex-wrap:wrap")}>
            <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:22px;letter-spacing:-.01em")}>
              {activeMerchant.name}
            </span>
            {activeMerchant.mActive && (
              <>
                <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 11px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:12px;font-weight:600")}>
                  Active
                </span>
              </>
            )}
            {activeMerchant.mPending && (
              <>
                <span style={s("padding:4px 11px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:12px;font-weight:600")}>
                  Pending activation
                </span>
              </>
            )}
            {activeMerchant.mSuspended && (
              <>
                <span style={s("padding:4px 11px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:12px;font-weight:600")}>
                  Suspended
                </span>
              </>
            )}
          </div>
          <div style={s("font-size:13px;color:#9A9CA5;font-family:'IBM Plex Mono';margin-top:4px")}>
            {activeMerchant.id}{" · "}{activeMerchant.cat}
          </div>
        </div>
        <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
          <button
            className="zxoy0gmr"
            onClick={on.roleMerchant}
            style={s("padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
          >
            View as merchant
          </button>
          <button
            className="zx1b5k1d"
            style={s("padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#B0141C;cursor:pointer")}
          >
            Suspend
          </button>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start")}>
        <div>
          <div
            data-grid-kpi=""
            style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:16px")}
          >
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:15px 16px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12px;color:#6B6D76")}>Volume</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:19px;margin-top:5px;font-family:'IBM Plex Mono'")}>
                {activeMerchant.volume}
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:15px 16px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12px;color:#6B6D76")}>Txns</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:19px;margin-top:5px")}>
                {activeMerchant.txns}
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:15px 16px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12px;color:#6B6D76")}>Branches</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:19px;margin-top:5px")}>
                {activeMerchant.branches}
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:15px 16px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12px;color:#6B6D76")}>Team</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:19px;margin-top:5px")}>
                {activeMerchant.team}
              </div>
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
            <div style={s("padding:16px 20px;border-bottom:1px solid #F0F0F2;font-family:'Space Grotesk';font-weight:600;font-size:14.5px")}>
              Recent transactions
            </div>
            <div style={s("display:grid;grid-template-columns:1.4fr 1fr 1fr .9fr;padding:11px 20px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
              <span>Customer</span>
              <span>Link</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {" "}
            {merchantTxns.map((t, i) => (
              <Fragment key={i}>
                <div style={s("display:grid;grid-template-columns:1.4fr 1fr 1fr .9fr;align-items:center;padding:12px 20px;border-bottom:1px solid #F5F5F6")}>
                  <div style={s("min-width:0")}>
                    <span style={s("display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {t.customer}
                    </span>
                    <span style={s("display:block;font-size:11px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                      {t.date}
                    </span>
                  </div>
                  <span style={s("font-size:12px;color:#5B5D66;font-family:'IBM Plex Mono'")}>{t.link}</span>
                  <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
                  <span>
                    {t.sPaid && (
                      <>
                        <span style={s("padding:3px 9px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11px;font-weight:600")}>
                          Paid
                        </span>
                      </>
                    )}
                    {" "}
                    {t.sPending && (
                      <>
                        <span style={s("padding:3px 9px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11px;font-weight:600")}>
                          Pending
                        </span>
                      </>
                    )}
                    {" "}
                    {t.sFailed && (
                      <>
                        <span style={s("padding:3px 9px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11px;font-weight:600")}>
                          Failed
                        </span>
                      </>
                    )}
                    {" "}
                    {t.sRefunded && (
                      <>
                        <span style={s("padding:3px 9px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11px;font-weight:600")}>
                          Refunded
                        </span>
                      </>
                    )}
                    {" "}
                    {t.sExpired && (
                      <>
                        <span style={s("padding:3px 9px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11px;font-weight:600")}>
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
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:6px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
          <div style={s("display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
            <span style={s("color:#8B8D96")}>Admin contact</span>
            <span style={s("font-weight:600;font-family:'IBM Plex Mono';font-size:12px")}>
              {activeMerchant.contact}
            </span>
          </div>
          <div style={s("display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
            <span style={s("color:#8B8D96")}>Category</span>
            <span style={s("font-weight:600")}>{activeMerchant.cat}</span>
          </div>
          <div style={s("display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
            <span style={s("color:#8B8D96")}>Onboarded</span>
            <span style={s("font-weight:600")}>{activeMerchant.joined}</span>
          </div>
          <div style={s("display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
            <span style={s("color:#8B8D96")}>Default currency</span>
            <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>USD $</span>
          </div>
          <div style={s("display:flex;justify-content:space-between;padding:13px 0;font-size:13px")}>
            <span style={s("color:#8B8D96")}>Gateway</span>
            <span style={s("font-weight:600")}>Mastercard MPGS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
