"use client";

import { Fragment } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Team() {
  const { on, team } = useApp();
  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1260px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px")}>
        <div style={s("font-size:13.5px;color:#8B8D96")}>
          Sales users can create links and see payments for their own links.
        </div>
        <button
          className="zxvmr3xp"
          onClick={on.merchInviteTeam}
          style={s("display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;background:#DA1E28;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.28)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Invite sales user
        </button>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
        <div style={s("display:grid;grid-template-columns:2fr 1.8fr 1.3fr .7fr 1fr .9fr;padding:12px 22px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
          <span>Name</span>
          <span>Email</span>
          <span>Branch</span>
          <span>Links</span>
          <span>Volume</span>
          <span>Status</span>
        </div>
        {" "}
        {team.map((t, i) => (
          <Fragment key={i}>
            <div
              className="zxxbkkbw"
              style={s("display:grid;grid-template-columns:2fr 1.8fr 1.3fr .7fr 1fr .9fr;align-items:center;padding:13px 22px;border-bottom:1px solid #F5F5F6")}
            >
              <div style={s("display:flex;align-items:center;gap:11px;min-width:0")}>
                <span style={s("width:34px;height:34px;border-radius:50%;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0")}>
                  {t.initials}
                </span>
                <span style={s("font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                  {t.name}
                </span>
              </div>
              <span style={s("font-size:12.5px;color:#5B5D66;font-family:'IBM Plex Mono';white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {t.email}
              </span>
              <span style={s("font-size:13px;color:#5B5D66")}>{t.branch}</span>
              <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.links}</span>
              <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.volume}</span>
              <span>
                {t.act && (
                  <>
                    <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                      Active
                    </span>
                  </>
                )}
                {" "}
                {t.invited && (
                  <>
                    <span style={s("padding:4px 10px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:11.5px;font-weight:600")}>
                      Invited
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
