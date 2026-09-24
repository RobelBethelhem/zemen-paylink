"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";
import { asset } from "@/lib/asset";

// Operators sign themselves up. The merchant number is the control: it has to
// already be in the register the bank keeps, and it is what decides the name
// their customers see on a receipt — so nobody types a business name here.
export function Register() {
  const { on, reg, regBusy, regError, setReg } = useApp();

  const label = "display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px";
  const input =
    "width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB";

  const mismatch = reg.confirm.length > 0 && reg.password !== reg.confirm;

  return (
    <div
      data-auth=""
      style={s(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px",
      )}
    >
      <div
        style={s(
          "width:100%;max-width:440px;background:#fff;border-radius:20px;padding:38px 36px;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)",
        )}
      >
        <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:26px")}>
          <img src={asset("/zemen-logo-dark.png")} alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>
            PayLink
          </div>
        </div>

        <h1
          style={s(
            "font-family:'Space Grotesk';font-weight:600;font-size:25px;letter-spacing:-.02em;margin:0 0 6px",
          )}
        >
          Activate your account
        </h1>
        <p style={s("color:#6B6D76;font-size:14px;margin:0 0 24px;line-height:1.6")}>
          Choose how you will sign in, then enter the merchant number your bank contact gave you.
        </p>

        <label style={s(label)}>Username</label>
        <input
          className="zxq6owgx"
          value={reg.username}
          onChange={(e) => setReg({ username: e.target.value })}
          placeholder="your.username"
          autoComplete="username"
          style={s(input + ";margin-bottom:16px")}
        />

        <label style={s(label)}>Full name</label>
        <input
          className="zxq6owgx"
          value={reg.fullName}
          onChange={(e) => setReg({ fullName: e.target.value })}
          placeholder="As it should appear to your team"
          style={s(input + ";margin-bottom:16px")}
        />

        <label style={s(label)}>Password</label>
        <input
          className="zxq6owgx"
          type="password"
          value={reg.password}
          onChange={(e) => setReg({ password: e.target.value })}
          placeholder="At least 12 characters"
          autoComplete="new-password"
          style={s(input + ";margin-bottom:16px")}
        />

        <div style={s("font-size:11.5px;color:#9A9CA5;margin:-10px 0 16px;line-height:1.6")}>
          Twelve characters or more. A phrase you will remember beats a short word with symbols in
          it — there is no requirement to mix cases or punctuation.
        </div>

        <label style={s(label)}>Confirm password</label>
        <input
          className="zxq6owgx"
          type="password"
          value={reg.confirm}
          onChange={(e) => setReg({ confirm: e.target.value })}
          placeholder="Re-enter password"
          autoComplete="new-password"
          // Re-states the `border` shorthand rather than adding a
          // `border-color` longhand next to it: React warns when a longhand is
          // dropped on rerender while the shorthand is still set, and the two
          // together are how border styling quietly breaks.
          style={s(
            input +
              `;border:1px solid ${mismatch ? "#E8949A" : "#E3E3E6"}` +
              ";margin-bottom:" +
              (mismatch ? "6px" : "16px"),
          )}
        />
        {mismatch ? (
          <div style={s("font-size:12px;color:#B0141C;margin-bottom:16px")}>
            Those passwords do not match.
          </div>
        ) : null}

        <label style={s(label)}>Merchant number</label>
        <input
          className="zxq6owgx"
          value={reg.merchantNumber}
          onChange={(e) => setReg({ merchantNumber: e.target.value })}
          placeholder="000000001100"
          style={s(input + ";font-family:'IBM Plex Mono';margin-bottom:6px")}
        />
        <div style={s("font-size:12px;color:#9A9CA5;margin-bottom:22px;line-height:1.6")}>
          Checked against the merchants your bank has registered. It sets which merchant your
          payments settle to, and the name your customers see on their receipt.
        </div>

        {regError ? (
          <div
            style={s(
              "display:flex;gap:10px;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:18px",
            )}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={s("flex-shrink:0;margin-top:1px")}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <span>{regError}</span>
          </div>
        ) : null}

        <button
          className="zxvmr3xp"
          onClick={on.register}
          disabled={regBusy}
          style={s(
            `width:100%;padding:14px;background:${regBusy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:${regBusy ? "wait" : "pointer"};display:flex;align-items:center;justify-content:center;gap:10px`,
          )}
        >
          {regBusy ? (
            <>
              <span
                style={s(
                  "width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite",
                )}
              />
              Creating your account…
            </>
          ) : (
            "Create account"
          )}
        </button>

        <div style={s("text-align:center;margin-top:16px")}>
          <a
            href="#"
            className="zxex49ni"
            onClick={(e) => {
              e.preventDefault();
              on.goLogin();
            }}
            style={s("font-size:13px;color:#6B6D76")}
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
