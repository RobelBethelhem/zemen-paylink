"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type RegisteredMerchant } from "@/lib/api";
import { s } from "@/lib/css";
import { useSession } from "@/store/SessionProvider";

// Merchant management's whole screen: the register of merchant numbers and the
// name each trades under. Operators sign up against a number here, and that
// name is what a payer sees on a receipt — so this list is the one place a
// merchant's identity is decided.
export function MerchantRegister() {
  const { session, signOut } = useSession();

  const [merchants, setMerchants] = useState<RegisteredMerchant[]>([]);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [liveNumber, setLiveNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .merchantRegister()
      .then((r) => {
        if (!cancelled) setMerchants(r.merchants ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the merchant register.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setError("");
    setNotice("");
    if (!number.trim() || !name.trim()) {
      setError("A merchant needs both a number and a name.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.registerMerchant({
        number: number.trim(),
        name: name.trim(),
        liveNumber: liveNumber.trim(),
      });
      setMerchants(result.merchants ?? []);
      setNotice(`${name.trim()} registered. Operators can now sign up with ${number.trim()}.`);
      setNumber("");
      setName("");
      setLiveNumber("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this merchant.");
    } finally {
      setBusy(false);
    }
  }

  const label = "display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px";
  const input =
    "width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#FAFAFB";

  return (
    <div style={s("min-height:100vh;background:#F5F5F6")}>
      <div
        style={s(
          "background:#141519;color:#fff;padding:18px 30px;display:flex;align-items:center;gap:13px",
        )}
      >
        <img
          src="/zemen-logo-light.png"
          alt="Zemen Bank"
          style={s("height:28px;width:auto;display:block")}
        />
        <span style={s("width:1px;height:24px;background:rgba(255,255,255,.18)")} />
        <div style={s("flex:1")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;line-height:1.1")}>
            Merchant register
          </div>
          <div
            style={s(
              "font-size:11px;color:#8B8D96;letter-spacing:.1em;text-transform:uppercase;margin-top:2px",
            )}
          >
            Merchant management
          </div>
        </div>
        <div style={s("text-align:right;font-size:12.5px")}>
          <div style={s("font-weight:600")}>{session?.user.fullName}</div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
            style={s("font-size:12px;color:#9A9CA5")}
          >
            Sign out
          </a>
        </div>
      </div>

      <div data-pad="" style={s("padding:26px 30px;max-width:1000px;margin:0 auto")}>
        <div
          data-grid-2=""
          style={s("display:grid;grid-template-columns:1fr 1.3fr;gap:18px;align-items:start")}
        >
          <div
            style={s(
              "background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,21,25,.04)",
            )}
          >
            <div
              style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:4px")}
            >
              Register a merchant
            </div>
            <p style={s("font-size:12.5px;color:#8B8D96;line-height:1.6;margin:0 0 18px")}>
              The number comes from the gateway. The name is what appears on your customers&rsquo;
              receipts, so enter it as the business should be known.
            </p>

            <label style={s(label)}>Merchant number</label>
            <input
              className="zxq6owgx"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="000000001100"
              style={s(input + ";font-family:'IBM Plex Mono';margin-bottom:14px")}
            />

            <label style={s(label)}>Merchant name</label>
            <input
              className="zxq6owgx"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kunu Foods"
              style={s(input + ";margin-bottom:14px")}
            />

            <label style={s(label)}>
              Live merchant number
              <span style={s("font-weight:500;color:#9A9CA5")}> &mdash; only if different</span>
            </label>
            <input
              className="zxq6owgx"
              value={liveNumber}
              onChange={(e) => setLiveNumber(e.target.value)}
              placeholder="Leave blank to use the same number"
              style={s(input + ";font-family:'IBM Plex Mono';margin-bottom:6px")}
            />
            <div style={s("font-size:11.5px;color:#9A9CA5;margin-bottom:18px;line-height:1.6")}>
              Set this only when the acquirer issued a separate number for production.
            </div>

            {error ? (
              <div
                style={s(
                  "background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.55;margin-bottom:14px",
                )}
              >
                {error}
              </div>
            ) : null}
            {notice ? (
              <div
                style={s(
                  "background:#E6F6EE;border:1px solid #BCE6D2;color:#0E7A4C;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.55;margin-bottom:14px",
                )}
              >
                {notice}
              </div>
            ) : null}

            <button
              className="zxvmr3xp"
              onClick={() => void submit()}
              disabled={busy}
              style={s(
                `width:100%;padding:12px;background:${busy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:${busy ? "wait" : "pointer"}`,
              )}
            >
              {busy ? "Saving…" : "Register merchant"}
            </button>
          </div>

          <div
            style={s(
              "background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden",
            )}
          >
            <div
              style={s(
                "display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid #F0F0F2",
              )}
            >
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px")}>
                Registered merchants
              </div>
              <span style={s("font-size:12.5px;color:#9A9CA5")}>{merchants.length}</span>
            </div>

            {merchants.length === 0 ? (
              <div style={s("padding:26px 22px;text-align:center;font-size:13px;color:#9A9CA5")}>
                No merchants registered yet. Add the first one to let operators sign up.
              </div>
            ) : (
              merchants.map((m) => (
                <div
                  key={m.number}
                  style={s(
                    "display:flex;align-items:center;gap:14px;padding:14px 22px;border-bottom:1px solid #F5F5F6",
                  )}
                >
                  <div style={s("flex:1;min-width:0")}>
                    <div style={s("font-size:13.5px;font-weight:600")}>{m.name}</div>
                    <div
                      style={s(
                        "font-family:'IBM Plex Mono';font-size:12px;color:#8B8D96;margin-top:2px",
                      )}
                    >
                      {m.number}
                      {m.liveNumber ? ` · live ${m.liveNumber}` : ""}
                    </div>
                  </div>
                  <div style={s("text-align:right;flex-shrink:0")}>
                    <div style={s("font-size:12.5px;font-weight:600")}>
                      {m.operators} {m.operators === 1 ? "operator" : "operators"}
                    </div>
                    <div style={s("font-size:11.5px;color:#9A9CA5;margin-top:2px")}>
                      {m.createdAt}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNumber(m.number);
                      setName(m.name);
                      setLiveNumber(m.liveNumber ?? "");
                      setNotice("");
                      setError("");
                    }}
                    className="zxoy0gmr"
                    style={s(
                      "padding:6px 12px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:12px;font-weight:600;color:#3A3B42;cursor:pointer;flex-shrink:0",
                    )}
                  >
                    Edit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
