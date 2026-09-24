"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";
import { asset } from "@/lib/asset";

export function Pay() {
  const { on, payCard, payMinimal, payTab, redirecting } = useApp();
  return (
    <div style={s("min-height:100vh;background:#F5F5F6;display:flex;flex-direction:column")}>
      <header style={s("background:#fff;border-bottom:1px solid #E9E9EC;padding:0 22px;height:60px;display:flex;align-items:center;gap:14px")}>
        <div style={s("display:flex;align-items:center;gap:10px")}>
          <img src={asset("/zemen-logo-dark.png")} alt="Zemen Bank" style={s("height:28px;width:auto;display:block")} />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;color:#141519;white-space:nowrap")}>
            PayLink
          </span>
        </div>
        <div style={s("flex:1")} />
        <div
          data-hide-mobile=""
          style={s("display:flex;align-items:center;gap:6px;font-size:11px;color:#8B8D96;margin-right:4px")}
        >
          Preview:
        </div>
        <div style={s("display:flex;gap:6px")}>
          <button onClick={on.payVarCard} style={payTab.card}>Card</button>
          <button onClick={on.payVarMin} style={payTab.minimal}>Minimal</button>
        </div>
      </header>
      <div style={s("flex:1;display:flex;align-items:center;justify-content:center;padding:32px 20px")}>
        {payCard && (
          <>
            <div style={s("width:100%;max-width:452px;animation:fadeUp .4s ease both")}>
              <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:20px;box-shadow:0 20px 50px rgba(20,21,25,.1);overflow:hidden")}>
                <div style={s("padding:22px 26px;border-bottom:1px solid #F2F2F4;display:flex;align-items:center;gap:12px")}>
                  <span style={s("width:44px;height:44px;border-radius:12px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600")}>
                    ST
                  </span>
                  <div style={s("flex:1")}>
                    <div style={s("font-size:15px;font-weight:600")}>Sheba Trading PLC</div>
                    <div style={s("display:flex;align-items:center;gap:5px;font-size:12px;color:#12905A;margin-top:2px")}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4 12 14.01l-3-3" />
                      </svg>
                      Verified merchant
                    </div>
                  </div>
                </div>
                <div style={s("padding:30px 26px;text-align:center")}>
                  <div style={s("font-size:13px;color:#8B8D96;margin-bottom:8px")}>Amount to pay</div>
                  <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:46px;letter-spacing:-.02em;line-height:1")}>
                    $120.00
                  </div>
                  <div style={s("font-size:14px;color:#3A3B42;margin-top:12px;font-weight:500")}>
                    Annual Membership 2026
                  </div>
                  {" "}
                  <div style={s("display:inline-flex;align-items:center;gap:6px;background:#F2F2F4;border-radius:8px;padding:5px 11px;font-size:12px;color:#6B6D76;margin-top:10px;font-family:'IBM Plex Mono'")}>
                    Ref · INV-2044
                  </div>
                </div>
                <div style={s("padding:0 26px 26px")}>
                  <button
                    className="zxvmr3xp"
                    onClick={on.payNow}
                    style={s("width:100%;padding:15px;border:none;background:#DA1E28;color:#fff;border-radius:13px;font-size:15.5px;font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(218,30,40,.32);display:flex;align-items:center;justify-content:center;gap:9px")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    Pay securely
                  </button>
                  {" "}
                  <div style={s("display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;color:#8B8D96;font-size:11.5px")}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    You'll be redirected to Mastercard's secure page for card entry & 3-D Secure.
                  </div>
                  <div style={s("display:flex;align-items:center;justify-content:center;gap:14px;margin-top:18px;padding-top:18px;border-top:1px solid #F2F2F4")}>
                    <span style={s("display:inline-flex;align-items:center")}>
                      <span style={s("width:22px;height:22px;border-radius:50%;background:#EB001B")} />
                      <span style={s("width:22px;height:22px;border-radius:50%;background:#F79E1B;margin-left:-9px")} />
                    </span>
                    <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:17px;color:#1A1F71")}>
                      VISA
                    </span>
                    <span style={s("width:1px;height:20px;background:#E7E7EA")} />
                    <span style={s("font-size:11px;color:#9A9CA5;line-height:1.3")}>
                      Powered by
                      <br />
                      <strong style={s("color:#5B5D66")}>Mastercard MPGS</strong>
                    </span>
                  </div>
                </div>
              </div>
              <div style={s("text-align:center;font-size:12px;color:#9A9CA5;margin-top:18px")}>
                🔒 Secured by Zemen Bank S.C. · Licensed by the National Bank of Ethiopia
              </div>
            </div>
          </>
        )}
        {payMinimal && (
          <>
            <div style={s("width:100%;max-width:380px;text-align:center;animation:fadeUp .4s ease both")}>
              <span style={s("width:52px;height:52px;border-radius:14px;background:#141519;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:17px;font-weight:600;margin-bottom:22px")}>
                ST
              </span>
              {" "}
              <div style={s("font-size:14px;color:#8B8D96")}>You're paying</div>
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:20px;margin-top:3px")}>
                Sheba Trading PLC
              </div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:56px;letter-spacing:-.03em;margin-top:28px;line-height:1")}>
                $120.00
              </div>
              <div style={s("font-size:14px;color:#6B6D76;margin-top:12px")}>Annual Membership 2026</div>
              {" "}
              <button
                className="zxvmr3xp"
                onClick={on.payNow}
                style={s("width:100%;padding:16px;border:none;background:#DA1E28;color:#fff;border-radius:14px;font-size:15.5px;font-weight:600;cursor:pointer;margin-top:34px;box-shadow:0 10px 26px rgba(218,30,40,.3)")}
              >
                Pay securely →
              </button>
              {" "}
              <div style={s("display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;color:#A9ABB3;font-size:11.5px")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span>Mastercard MPGS</span>
                <span>·</span>
                <span>3-D Secure</span>
              </div>
            </div>
          </>
        )}
      </div>
      {redirecting && (
        <>
          <div style={s("position:fixed;inset:0;background:#141519;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;animation:fadeIn .25s ease both")}>
            <div style={s("display:flex;align-items:center;gap:11px;position:absolute;top:26px;left:26px")}>
              <img src={asset("/zemen-logo-light.png")} alt="Zemen Bank" style={s("height:28px;width:auto;display:block")} />
              <span style={s("width:1px;height:22px;background:rgba(255,255,255,.2)")} />
              <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;color:#fff")}>PayLink</span>
            </div>
            <div style={s("display:flex;align-items:center;gap:14px;margin-bottom:24px")}>
              <span style={s("display:inline-flex;align-items:center")}>
                <span style={s("width:30px;height:30px;border-radius:50%;background:#EB001B")} />
                <span style={s("width:30px;height:30px;border-radius:50%;background:#F79E1B;margin-left:-12px")} />
              </span>
              <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:22px;color:#fff")}>
                VISA
              </span>
            </div>
            <div style={s("width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#DA1E28;animation:spin .8s linear infinite;margin-bottom:22px")} />
            <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:19px;color:#fff")}>
              Redirecting to Mastercard MPGS…
            </div>
            <div style={s("font-size:13.5px;color:#9A9CA5;margin-top:8px;max-width:340px;line-height:1.6")}>
              Taking you to Mastercard's secure hosted payment page to enter your card details. Please don't close this window.
            </div>
            <button
              className="zx1recmf"
              onClick={on.payBack}
              style={s("margin-top:26px;padding:10px 18px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#C7C8CE;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer")}
            >
              ← Back to payment
            </button>
          </div>
        </>
      )}
    </div>
  );
}
