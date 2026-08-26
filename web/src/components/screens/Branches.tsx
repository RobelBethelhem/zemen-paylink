"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Branches() {
  const { branches, on } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px")}>
        <div style={s("font-size:13.5px;color:#8B8D96")}>4 branches · 12 sales users</div>
        <button
          className="zxvmr3xp"
          onClick={on.merchAddBranch}
          style={s("display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;background:#DA1E28;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.28)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add branch
        </button>
      </div>
      <div style={s("display:flex;flex-wrap:wrap;gap:16px")}>
        {branches.map((b, i) => (
          <Fragment key={i}>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px;box-shadow:0 1px 2px rgba(20,21,25,.04);flex:1 1 268px;min-width:0")}>
              <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:16px")}>
                <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                  <span style={s("width:40px;height:40px;border-radius:11px;background:#FDECED;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                      <rect x="4" y="3" width="16" height="18" rx="1.5" />
                      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6" />
                    </svg>
                  </span>
                  <div style={s("min-width:0")}>
                    <div style={s("font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {b.name}
                    </div>
                    <div style={s("font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>{b.code}</div>
                  </div>
                </div>
                <button
                  className="zxerbvw2"
                  style={s("border:none;background:transparent;color:#C7C8CE;cursor:pointer;padding:4px")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              <div style={s("display:flex;border:1px solid #F0F0F2;border-radius:11px;overflow:hidden;margin-bottom:14px")}>
                <div style={s("flex:1;padding:11px;text-align:center;border-right:1px solid #F0F0F2")}>
                  <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:17px")}>{b.sales}</div>
                  <div style={s("font-size:11px;color:#9A9CA5")}>Sales</div>
                </div>
                <div style={s("flex:1;padding:11px;text-align:center;border-right:1px solid #F0F0F2")}>
                  <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:17px")}>{b.links}</div>
                  <div style={s("font-size:11px;color:#9A9CA5")}>Links</div>
                </div>
                <div style={s("flex:1.3;padding:11px;text-align:center")}>
                  <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:17px;font-family:'IBM Plex Mono'")}>
                    {b.volume}
                  </div>
                  <div style={s("font-size:11px;color:#9A9CA5")}>Volume</div>
                </div>
              </div>
              <div style={s("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#6B6D76")}>
                <span style={s("width:26px;height:26px;border-radius:50%;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600")}>
                  {b.code}
                </span>
                {"Managed by "}
                <strong style={s("color:#3A3B42")}>{b.manager}</strong>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
