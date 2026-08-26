"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function AdminMerchants() {
  const { merchants, on } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap")}>
        <div style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7E7EA;border-radius:11px;padding:10px 14px;width:280px;max-width:100%")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9CA5" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            placeholder="Search merchants…"
            style={s("border:none;background:transparent;font-size:13.5px;width:100%")}
          />
        </div>
        <div style={s("flex:1")} />
        <button
          className="zxvmr3xp"
          onClick={on.adminCreateMerchant}
          style={s("display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;background:#DA1E28;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.28)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Onboard merchant
        </button>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:grid;grid-template-columns:2.2fr 1.3fr .7fr .6fr 1.1fr .9fr 1fr 40px;padding:12px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Merchant</span>
          <span>Category</span>
          <span>Branch</span>
          <span>Team</span>
          <span>Volume</span>
          <span>Txns</span>
          <span>Status</span>
          <span />
        </div>
        {" "}
        {merchants.map((m, i) => (
          <Fragment key={i}>
            <div
              className="zxxbkkbw"
              onClick={m.open}
              style={s("display:grid;grid-template-columns:2.2fr 1.3fr .7fr .6fr 1.1fr .9fr 1fr 40px;align-items:center;padding:13px 22px;border-bottom:1px solid #F5F5F6;cursor:pointer")}
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
              <span style={s("font-size:13px;font-weight:500")}>{m.branches}</span>
              <span style={s("font-size:13px;font-weight:500")}>{m.team}</span>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{m.volume}</span>
              <span style={s("font-size:13px;font-family:'IBM Plex Mono';color:#5B5D66")}>{m.txns}</span>
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
                    <span style={s("padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Pending
                    </span>
                  </>
                )}
                {" "}
                {m.mSuspended && (
                  <>
                    <span style={s("padding:4px 10px;background:#FDECED;color:#B0141C;border-radius:20px;font-size:11.5px;font-weight:600")}>
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
