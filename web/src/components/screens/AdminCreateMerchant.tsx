"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function AdminCreateMerchant() {
  const { on } = useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:760px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <button
        className="zxoy0gmr"
        onClick={on.adminMerchants}
        style={s("display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer;margin-bottom:16px")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Cancel
      </button>
      {" "}
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:16px;padding:26px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:18px;margin-bottom:4px")}>
          Onboard a new merchant
        </div>
        <div style={s("font-size:13.5px;color:#8B8D96;margin-bottom:22px")}>
          Create the workspace and send an activation invite to the merchant admin.
        </div>
        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px")}>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Legal / registered name
            </label>
            <input
              className="zx20fx8r"
              placeholder="e.g. Sheba Trading PLC"
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Trade name
            </label>
            <input
              className="zx20fx8r"
              placeholder="Shown to customers"
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Category
            </label>
            <select style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#fff;cursor:pointer")}>
              <option>Retail & Trade</option>
              <option>Manufacturing</option>
              <option>Electronics</option>
              <option>Fashion & Apparel</option>
              <option>Healthcare</option>
              <option>Hospitality</option>
              <option>Services</option>
              <option>NGO / Non-profit</option>
            </select>
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              TIN / Registration no.
            </label>
            <input
              className="zx20fx8r"
              placeholder="0001234567"
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;font-family:'IBM Plex Mono'")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Merchant admin email
            </label>
            <input
              className="zx20fx8r"
              placeholder="admin@company.et"
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Phone
            </label>
            <input
              className="zx20fx8r"
              placeholder="+251 …"
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Default currency
            </label>
            <select style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#fff;cursor:pointer")}>
              <option>USD $ (default)</option>
              <option>ETB Br</option>
              <option>EUR €</option>
              <option>GBP £</option>
            </select>
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Settlement account (Zemen)
            </label>
            <input
              className="zx20fx8r"
              placeholder="Zemen account no."
              style={s("width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;font-family:'IBM Plex Mono'")}
            />
          </div>
        </div>
        <div style={s("display:flex;align-items:center;gap:11px;background:#FDECED;border-radius:12px;padding:13px 15px;margin-bottom:22px")}>
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B0141C"
            strokeWidth="1.8"
            style={s("flex-shrink:0")}
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 5L2 7" />
          </svg>
          <span style={s("font-size:12.5px;color:#B0141C")}>
            An activation email will be sent to the merchant admin to set their password and enable 2-factor sign-in.
          </span>
        </div>
        <div style={s("display:flex;gap:11px;justify-content:flex-end")}>
          <button
            className="zxoy0gmr"
            onClick={on.adminMerchants}
            style={s("padding:12px 20px;border:1px solid #E3E3E6;background:#fff;border-radius:11px;font-size:13.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
          >
            Cancel
          </button>
          <button
            className="zxvmr3xp"
            onClick={on.adminMerchants}
            style={s("display:flex;align-items:center;gap:8px;padding:12px 22px;border:none;background:#DA1E28;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3)")}
          >
            Create & send invite
          </button>
        </div>
      </div>
    </div>
  );
}
