"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Otp() {
  const { on } = useApp();
  return (
    <div
      data-auth=""
      style={s("min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px")}
    >
      <div style={s("width:100%;max-width:428px;background:#fff;border-radius:20px;padding:38px 36px;text-align:center;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)")}>
        <div style={s("width:60px;height:60px;border-radius:16px;background:#FDECED;display:flex;align-items:center;justify-content:center;margin:0 auto 20px")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <h1 style={s("font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0 0 6px")}>
          Two-factor verification
        </h1>
        <p style={s("color:#6B6D76;font-size:14px;margin:0 0 26px;line-height:1.6")}>
          Enter the 6-digit code sent to
          <br />
          <strong style={s("color:#141519")}>+251 ••• ••• 042</strong>
        </p>
        <div style={s("display:flex;gap:10px;justify-content:center;margin-bottom:26px")}>
          <input
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            defaultValue="9"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #DA1E28;border-radius:12px;background:#fff")}
          />
          <input
            className="zxq6owgx"
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            defaultValue="2"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #E3E3E6;border-radius:12px;background:#FAFAFB")}
          />
          <input
            className="zxq6owgx"
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            defaultValue="4"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #E3E3E6;border-radius:12px;background:#FAFAFB")}
          />
          <input
            className="zxq6owgx"
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #E3E3E6;border-radius:12px;background:#FAFAFB")}
          />
          <input
            className="zxq6owgx"
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #E3E3E6;border-radius:12px;background:#FAFAFB")}
          />
          <input
            className="zxq6owgx"
            onInput={on.otpNext}
            maxLength={1}
            inputMode="numeric"
            style={s("width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;font-family:'IBM Plex Mono';border:1.5px solid #E3E3E6;border-radius:12px;background:#FAFAFB")}
          />
        </div>
        {" "}
        <button
          className="zxvmr3xp"
          onClick={on.verify}
          style={s("width:100%;padding:14px;background:#DA1E28;color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer")}
        >
          Verify & continue
        </button>
        {" "}
        <div style={s("margin-top:18px;font-size:13px;color:#6B6D76")}>
          {"Didn't get a code? "}
          <a href="#">Resend in 0:28</a>
        </div>
      </div>
    </div>
  );
}
