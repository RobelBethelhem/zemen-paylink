"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function LinksList() {
  const { linksList, on } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap")}>
        <div style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7E7EA;border-radius:11px;padding:10px 14px;width:280px;max-width:100%")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9CA5" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            placeholder="Search links…"
            style={s("border:none;background:transparent;font-size:13.5px;width:100%")}
          />
        </div>
        <div style={s("flex:1")} />
        <button
          className="zxoy0gmr"
          style={s("display:flex;align-items:center;gap:8px;padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Filter
        </button>
        <button
          className="zxvmr3xp"
          onClick={on.createLink}
          style={s("display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;background:#DA1E28;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.28)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New link
        </button>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:grid;grid-template-columns:2.4fr .8fr 1fr 1.1fr 1.3fr 1fr 60px;padding:12px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Link</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Collected</span>
          <span>Usage</span>
          <span>Status</span>
          <span />
        </div>
        {" "}
        {linksList.map((l, i) => (
          <Fragment key={i}>
            <div
              className="zxxbkkbw"
              onClick={l.open}
              style={s("display:grid;grid-template-columns:2.4fr .8fr 1fr 1.1fr 1.3fr 1fr 60px;align-items:center;padding:14px 22px;border-bottom:1px solid #F5F5F6;cursor:pointer")}
            >
              <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                <span style={s("width:36px;height:36px;border-radius:9px;background:#FDECED;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <span style={s("min-width:0")}>
                  <span style={s("display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                    {l.title}
                  </span>
                  <span style={s("display:block;font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                    {l.id}{" · /"}{l.slug}
                  </span>
                </span>
              </div>
              <span>
                {l.dyn && (
                  <>
                    <span style={s("padding:3px 9px;background:#FDECED;color:#B0141C;border-radius:6px;font-size:11px;font-weight:600")}>
                      Dynamic
                    </span>
                  </>
                )}
                {l.stc && (
                  <>
                    <span style={s("padding:3px 9px;background:#F2F2F4;color:#5B5D66;border-radius:6px;font-size:11px;font-weight:600")}>
                      Static
                    </span>
                  </>
                )}
              </span>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono'")}>{l.amount}</span>
              <span style={s("font-size:13.5px;font-weight:600;font-family:'IBM Plex Mono';color:#12905A")}>
                {l.paid}
              </span>
              <span style={s("padding-right:14px")}>
                <div style={s("display:flex;justify-content:space-between;font-size:11.5px;color:#8B8D96;margin-bottom:5px")}>
                  <span style={s("font-family:'IBM Plex Mono'")}>{l.scans}</span>
                  <span style={s("font-family:'IBM Plex Mono'")}>{"/ "}{l.max}</span>
                </div>
                <div style={s("height:5px;background:#F0F0F2;border-radius:3px;overflow:hidden")}>
                  <div style={s("height:100%;border-radius:3px;background:#DA1E28;width: {{ l.pct }}%")} />
                </div>
              </span>
              <span>
                {l.lActive && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                      Active
                    </span>
                  </>
                )}
                {" "}
                {l.lLimit && (
                  <>
                    <span style={s("padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Limit reached
                    </span>
                  </>
                )}
                {" "}
                {l.lExpired && (
                  <>
                    <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Expired
                    </span>
                  </>
                )}
                {" "}
                {l.lPaused && (
                  <>
                    <span style={s("padding:4px 10px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Paused
                    </span>
                  </>
                )}
              </span>
              <span style={s("display:flex;justify-content:flex-end;gap:4px;color:#C7C8CE")}>
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
