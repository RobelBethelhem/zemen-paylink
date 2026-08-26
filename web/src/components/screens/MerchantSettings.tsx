"use client";

import { s } from "@/lib/css";

export function MerchantSettings() {
  return (
    <div
      data-pad=""
      style={s("padding:26px 30px;max-width:820px;margin:0 auto;animation:fadeUp .45s ease both;display:flex;flex-direction:column;gap:16px")}
    >
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:16px")}>
          Business profile
        </div>
        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Legal name
            </label>
            <input
              className="zxq6owgx"
              defaultValue="Sheba Trading PLC"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Category
            </label>
            <input
              className="zxq6owgx"
              defaultValue="Retail & Trade"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Support email
            </label>
            <input
              className="zxq6owgx"
              defaultValue="admin@sheba.et"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Phone
            </label>
            <input
              className="zxq6owgx"
              defaultValue="+251 116 62 4021"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB")}
            />
          </div>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:16px")}>
          Settlement & payout
        </div>
        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px")}>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Settlement account (Zemen)
            </label>
            <input
              defaultValue="•••• •••• 4021"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB;font-family:'IBM Plex Mono'")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Settlement schedule
            </label>
            <input
              defaultValue="Daily · T+1"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB")}
            />
          </div>
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#FAFAFB;border:1px solid #EEE;border-radius:11px")}>
          <div>
            <div style={s("font-size:13.5px;font-weight:600")}>Default display currency</div>
            <div style={s("font-size:12px;color:#8B8D96")}>USD — set by your bank administrator</div>
          </div>
          <span style={s("padding:6px 13px;background:#141519;color:#fff;border-radius:8px;font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>
            USD $
          </span>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:6px")}>
          Notifications
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #F2F2F4")}>
          <span style={s("font-size:13.5px;color:#3A3B42")}>Email me on every successful payment</span>
          <span style={s("width:44px;height:25px;border-radius:14px;background:#DA1E28;position:relative")}>
            <span style={s("position:absolute;top:3px;left:22px;width:19px;height:19px;border-radius:50%;background:#fff")} />
          </span>
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #F2F2F4")}>
          <span style={s("font-size:13.5px;color:#3A3B42")}>Daily collection summary</span>
          <span style={s("width:44px;height:25px;border-radius:14px;background:#DA1E28;position:relative")}>
            <span style={s("position:absolute;top:3px;left:22px;width:19px;height:19px;border-radius:50%;background:#fff")} />
          </span>
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:14px 0")}>
          <span style={s("font-size:13.5px;color:#3A3B42")}>Failed payment alerts</span>
          <span style={s("width:44px;height:25px;border-radius:14px;background:#D8D8DC;position:relative")}>
            <span style={s("position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff")} />
          </span>
        </div>
      </div>
    </div>
  );
}
