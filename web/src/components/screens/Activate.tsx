"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Activate() {
  const { on, password, set } = useApp();
  return (
    <div
      data-auth=""
      style={s("min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px")}
    >
      <div style={s("width:100%;max-width:440px;background:#fff;border-radius:20px;padding:38px 36px;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)")}>
        <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:26px")}>
          <img src="/zemen-logo-dark.png" alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>PayLink</div>
        </div>
        {" "}
        <div style={s("display:inline-flex;align-items:center;gap:8px;background:#FDECED;color:#B0141C;font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;margin-bottom:16px")}>
          Account activation · Sheba Trading PLC
        </div>
        {" "}
        <h1 style={s("font-family:'Space Grotesk';font-weight:600;font-size:25px;letter-spacing:-.02em;margin:0 0 6px")}>
          Set your password
        </h1>
        <p style={s("color:#6B6D76;font-size:14px;margin:0 0 24px;line-height:1.6")}>
          {"Your bank administrator created your merchant workspace. Choose a password to activate access for "}
          <strong style={s("color:#141519")}>merchant@sheba.et</strong>
          .
        </p>
        {" "}
        <label style={s("display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
          New password
        </label>
        {" "}
        <input
          className="zxq6owgx"
          type="password"
          onChange={set.password}
          placeholder="At least 12 characters"
          value={password}
          style={s("width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB;margin-bottom:14px")}
        />
        {" "}
        <div style={s("display:flex;gap:6px;margin-bottom:16px")}>
          <div style={s("height:5px;flex:1;border-radius:3px;background:#DA1E28")} />
          <div style={s("height:5px;flex:1;border-radius:3px;background:#DA1E28")} />
          <div style={s("height:5px;flex:1;border-radius:3px;background:#F0A83A")} />
          <div style={s("height:5px;flex:1;border-radius:3px;background:#E7E7EA")} />
        </div>
        {" "}
        <label style={s("display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
          Confirm password
        </label>
        {" "}
        <input
          className="zxq6owgx"
          type="password"
          placeholder="Re-enter password"
          style={s("width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB;margin-bottom:22px")}
        />
        {" "}
        <button
          className="zxvmr3xp"
          onClick={on.goOtp}
          style={s("width:100%;padding:14px;background:#DA1E28;color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer")}
        >
          Activate account
        </button>
        {" "}
        <div style={s("text-align:center;margin-top:16px")}>
          <a href="#" onClick={on.goLogin} style={s("font-size:13px;color:#6B6D76")}>Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
