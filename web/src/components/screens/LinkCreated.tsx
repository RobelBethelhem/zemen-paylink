"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";
import { LinkQr } from "@/components/LinkQr";

export function LinkCreated() {
  const { amountDisplay, copied, expiryLabel, isTestMode, linkTypeLabel, maxScansLabel, newLinkUrl, notCopied, on, shareNotice, shareUrl } = useApp();
  return (
    <div data-pad="" style={s("padding:34px 30px;max-width:940px;margin:0 auto;animation:fadeUp .45s ease both")}>
      {shareNotice ? (
        <div
          style={s("position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:220;background:#141519;color:#fff;padding:13px 20px;border-radius:12px;font-size:13.5px;font-weight:500;box-shadow:0 20px 50px rgba(0,0,0,.35);animation:toastin .3s ease both;max-width:90vw")}
        >
          {shareNotice}
        </div>
      ) : null}
      <div style={s("text-align:center;margin-bottom:26px")}>
        <div style={s("width:64px;height:64px;border-radius:50%;background:#E6F6EE;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:pop .5s cubic-bezier(.2,.8,.3,1.4) both")}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em")}>
          Your Pay-by-Link is ready
        </div>
        <div style={s("font-size:14px;color:#8B8D96;margin-top:5px")}>
          Share it with your customer — payments settle through Mastercard MPGS.
        </div>
        {/* The moment before it gets sent to someone is when this matters most. */}
        {isTestMode && (
          <div
            style={s(
              "display:inline-flex;align-items:center;gap:9px;background:#FEF3E2;border:1px solid #F3D9A8;color:#8A5A00;border-radius:20px;padding:7px 15px;font-size:12.5px;margin-top:12px",
            )}
          >
            <span style={s("font-weight:700;letter-spacing:.05em;font-size:11px")}>TEST</span>
            <span>
              This link is on the test gateway. It cannot take real money — connect your live
              gateway before sending links to customers.
            </span>
          </div>
        )}
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start")}>
        <div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04);margin-bottom:16px")}>
            <div style={s("font-size:12px;color:#9A9CA5;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px")}>
              Payment link
            </div>
            <div style={s("display:flex;align-items:center;gap:10px;background:#FAFAFB;border:1px solid #E7E7EA;border-radius:11px;padding:12px 14px")}>
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DA1E28"
                strokeWidth="1.8"
                style={s("flex-shrink:0")}
              >
                <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span style={s("flex:1;font-family:'IBM Plex Mono';font-size:13px;color:#3A3B42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                {newLinkUrl}
              </span>
              <button
                className="zxvmr3xp"
                onClick={on.copy}
                style={s("display:flex;align-items:center;gap:6px;padding:8px 14px;border:none;background:#DA1E28;color:#fff;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0")}
              >
                {copied && (
                  <>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Copied
                  </>
                )}
                {notCopied && (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04);margin-bottom:16px")}>
            <div style={s("font-size:12px;color:#9A9CA5;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px")}>
              Share via
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:10px")}>
              <button
                className="zxy758nv"
                onClick={on.shareSms}
                style={s("display:flex;flex-direction:column;align-items:center;gap:8px;padding:15px 8px;border:1px solid #E7E7EA;background:#fff;border-radius:12px;cursor:pointer")}
              >
                <span style={s("width:38px;height:38px;border-radius:10px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span style={s("font-size:12px;font-weight:600;color:#3A3B42")}>SMS</span>
              </button>
              <button
                className="zxy758nv"
                onClick={on.shareEmail}
                style={s("display:flex;flex-direction:column;align-items:center;gap:8px;padding:15px 8px;border:1px solid #E7E7EA;background:#fff;border-radius:12px;cursor:pointer")}
              >
                <span style={s("width:38px;height:38px;border-radius:10px;background:#FDECED;display:flex;align-items:center;justify-content:center")}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 5L2 7" />
                  </svg>
                </span>
                <span style={s("font-size:12px;font-weight:600;color:#3A3B42")}>Email</span>
              </button>
              <button
                className="zxy758nv"
                onClick={on.shareWhatsApp}
                style={s("display:flex;flex-direction:column;align-items:center;gap:8px;padding:15px 8px;border:1px solid #E7E7EA;background:#fff;border-radius:12px;cursor:pointer")}
              >
                <span style={s("width:38px;height:38px;border-radius:10px;background:#E6F6EE;display:flex;align-items:center;justify-content:center")}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="1.8">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <span style={s("font-size:12px;font-weight:600;color:#3A3B42")}>WhatsApp</span>
              </button>
              <button
                className="zxy758nv"
                onClick={on.shareMore}
                style={s("display:flex;flex-direction:column;align-items:center;gap:8px;padding:15px 8px;border:1px solid #E7E7EA;background:#fff;border-radius:12px;cursor:pointer")}
              >
                <span style={s("width:38px;height:38px;border-radius:10px;background:#F2F2F4;display:flex;align-items:center;justify-content:center")}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5B5D66" strokeWidth="1.8">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                  </svg>
                </span>
                <span style={s("font-size:12px;font-weight:600;color:#3A3B42")}>More</span>
              </button>
            </div>
          </div>
          <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
            <button
              className="zxoy0gmr"
              onClick={on.merchCreate}
              style={s("display:flex;align-items:center;gap:7px;padding:11px 18px;border:1px solid #E3E3E6;background:#fff;border-radius:11px;font-size:13.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create another
            </button>
            <button
              className="zx15p5ni"
              onClick={on.merchLinks}
              style={s("flex:1;padding:11px 18px;border:none;background:#141519;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer")}
            >
              Done — go to Pay Links
            </button>
          </div>
        </div>
        <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04);text-align:center")}>
          <div style={s("font-size:12px;color:#9A9CA5;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px")}>
            Scan to pay
          </div>
          {" "}
          <div style={s("display:inline-block;padding:14px;border:1px solid #EEE;border-radius:16px;background:#fff")}>
            <LinkQr url={shareUrl} />
          </div>
          {" "}
          <div style={s("margin-top:16px;padding-top:16px;border-top:1px solid #F2F2F4;text-align:left")}>
            <div style={s("display:flex;justify-content:space-between;font-size:13px;margin-bottom:9px")}>
              <span style={s("color:#8B8D96")}>Amount</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{amountDisplay}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;font-size:13px;margin-bottom:9px")}>
              <span style={s("color:#8B8D96")}>Type</span>
              <span style={s("font-weight:600")}>{linkTypeLabel}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;font-size:13px;margin-bottom:9px")}>
              <span style={s("color:#8B8D96")}>Limit</span>
              <span style={s("font-weight:600")}>{maxScansLabel}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Expiry</span>
              <span style={s("font-weight:600")}>{expiryLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
