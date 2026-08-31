"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Login() {
  const { authBusy, authError, email, on, password, regDone, set, signedOutReason, takeover } =
    useApp();
  return (
    <div data-auth="" style={s("min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr")}>
      <div
        data-hide-mobile=""
        style={s("position:relative;background:#141519;color:#fff;padding:48px 56px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden")}
      >
        <div style={s("position:absolute;top:-120px;right:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0%,rgba(218,30,40,0) 70%);opacity:.5")} />
        <div style={s("position:absolute;bottom:-160px;left:-100px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0%,rgba(218,30,40,0) 70%);opacity:.22")} />
        <div style={s("position:relative;display:flex;align-items:center;gap:13px")}>
          <img src="/zemen-logo-light.png" alt="Zemen Bank" style={s("height:42px;width:auto;display:block")} />
          <span style={s("width:1px;height:34px;background:rgba(255,255,255,.18)")} />
          <div>
            <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:19px;letter-spacing:-.02em;white-space:nowrap;line-height:1.1;color:#fff")}>
              PayLink
            </div>
            <div style={s("font-size:11px;color:#8B8D96;letter-spacing:.14em;text-transform:uppercase;margin-top:2px")}>
              Merchant Portal
            </div>
          </div>
        </div>
        <div style={s("position:relative")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:38px;line-height:1.12;letter-spacing:-.03em;max-width:460px")}>
            Get paid with a single link.
          </div>
          <p style={s("color:#A7A9B2;font-size:15px;line-height:1.65;max-width:430px;margin:18px 0 30px")}>
            Create secure payment links backed by the Mastercard Payment Gateway. Static or dynamic amounts, QR, scan limits and expiry — settled straight to your Zemen account.
          </p>
          <div style={s("display:flex;gap:26px")}>
            <div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:24px")}>MPGS</div>
              <div style={s("font-size:12px;color:#8B8D96")}>Secure gateway</div>
            </div>
            <div style={s("width:1px;background:rgba(255,255,255,.12)")} />
            <div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:24px")}>3-D Secure</div>
              <div style={s("font-size:12px;color:#8B8D96")}>Card protection</div>
            </div>
            <div style={s("width:1px;background:rgba(255,255,255,.12)")} />
            <div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:24px")}>Multi-ccy</div>
              <div style={s("font-size:12px;color:#8B8D96")}>ETB · USD +</div>
            </div>
          </div>
        </div>
        <div style={s("position:relative;font-size:12px;color:#71737C")}>
          © 2026 Zemen Bank S.C. · Licensed by the National Bank of Ethiopia
        </div>
      </div>
      <div
        data-pad=""
        style={s("display:flex;align-items:center;justify-content:center;padding:48px;background:#fff")}
      >
        <div style={s("width:100%;max-width:392px;animation:fadeUp .5s ease both")}>
          <div data-only-mobile="" style={s("display:flex;align-items:center;gap:11px;margin-bottom:28px")}>
            <img src="/zemen-logo-dark.png" alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
            <span style={s("width:1px;height:22px;background:#E0E0E3")} />
            <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>PayLink</div>
          </div>
          <h1 style={s("font-family:'Space Grotesk';font-weight:600;font-size:27px;letter-spacing:-.02em;margin:0 0 6px")}>
            Sign in
          </h1>
          <p style={s("color:#6B6D76;font-size:14px;margin:0 0 26px")}>Welcome back. Sign in to your workspace.</p>
          {regDone ? (
            <div
              style={s("display:flex;gap:10px;background:#E6F6EE;border:1px solid #BCE6D2;color:#0E7A4C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:18px")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={s("flex-shrink:0;margin-top:1px")}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{regDone}</span>
            </div>
          ) : null}
          <label style={s("display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
            Username
          </label>
          {" "}
          <input
            className="zxq6owgx"
            onChange={set.email}
            placeholder="your.username"
            value={email}
            style={s("width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB;margin-bottom:16px")}
          />
          {" "}
          <div style={s("display:flex;justify-content:space-between;align-items:center;margin-bottom:7px")}>
            <label style={s("font-size:13px;font-weight:600;color:#3A3B42")}>Password</label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                on.goForgotPassword();
              }}
              style={s("font-size:12.5px")}
            >
              Forgot?
            </a>
          </div>
          {" "}
          <input
            className="zxq6owgx"
            onChange={set.password}
            type="password"
            placeholder="••••••••"
            value={password}
            style={s("width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB;margin-bottom:22px")}
          />
          {" "}
          {signedOutReason && !authError && !takeover ? (
            <div
              style={s("display:flex;gap:10px;background:#FEF3E2;border:1px solid #F5DCB0;color:#8A5800;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:16px")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>
                {signedOutReason === "idle"
                  ? "You were signed out because the session was left inactive. Sign in to continue."
                  : signedOutReason === "expired"
                    ? "Your session reached its time limit and was signed out. Sign in to continue."
                    : "This session was ended — its time ran out, or the account was signed in on another device."}
              </span>
            </div>
          ) : null}
          {takeover ? (
            <div
              style={s("background:#FEF3E2;border:1px solid #F5DCB0;color:#8A5800;border-radius:11px;padding:13px 15px;font-size:13px;line-height:1.55;margin-bottom:16px")}
            >
              <div style={s("display:flex;gap:10px")}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
                <span>{takeover}</span>
              </div>
              <div style={s("display:flex;gap:9px;margin-top:12px")}>
                <button
                  onClick={on.confirmTakeover}
                  disabled={authBusy}
                  style={s(`flex:1;padding:11px;background:${authBusy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:9px;font-size:13.5px;font-weight:600;cursor:${authBusy ? "wait" : "pointer"};font-family:inherit`)}
                >
                  {authBusy ? "Signing in…" : "Sign that session out and continue"}
                </button>
                <button
                  onClick={on.cancelTakeover}
                  disabled={authBusy}
                  style={s("padding:11px 16px;background:#fff;color:#6B6D76;border:1px solid #E7E7EA;border-radius:9px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit")}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {authError ? (
            <div
              style={s("display:flex;gap:10px;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:16px")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <span>{authError}</span>
            </div>
          ) : null}
          <button
            className="zxvmr3xp"
            onClick={on.signIn}
            disabled={authBusy}
            style={s(`width:100%;padding:14px;background:${authBusy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:${authBusy ? "wait" : "pointer"};box-shadow:0 8px 20px rgba(218,30,40,.28);display:flex;align-items:center;justify-content:center;gap:10px`)}
          >
            {authBusy ? (
              <>
                <span style={s("width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite")} />
                Signing in…
              </>
            ) : (
              "Continue"
            )}
          </button>
          {" "}
          <div style={s("margin-top:22px;padding-top:20px;border-top:1px solid #EEE;text-align:center;font-size:13px;color:#6B6D76")}>
            {"Don't have an account yet? "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                on.goRegister();
              }}
            >
              Activate your account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
