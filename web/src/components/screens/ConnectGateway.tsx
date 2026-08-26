"use client";

import { useEffect, useState } from "react";
import { s } from "@/lib/css";
import { ApiError, api, type Environment, type GatewayCredentials } from "@/lib/api";
import { useApp } from "@/store/AppProvider";
import { useSession } from "@/store/SessionProvider";

// Fallbacks if the API is unreachable while the form loads; the server is the
// authority on which hosts may be used.
const FALLBACK_HOSTS: Record<Environment, string> = {
  test: "test-gateway.mastercard.com",
  live: "ap-gateway.mastercard.com",
};

// Shown to a sales operator until their own MPGS identity is stored. Until the
// gateway accepts these details the operator cannot issue payment links,
// because every payment is initiated with their credentials.
export function ConnectGateway() {
  const { session, signOut, markGatewayConnected } = useSession();
  const { on } = useApp();

  const [current, setCurrent] = useState<GatewayCredentials | null>(null);
  const [environment, setEnvironment] = useState<Environment>("test");
  const [host, setHost] = useState(FALLBACK_HOSTS.test);
  const [apiPassword, setApiPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // The connection for the environment being edited, if there already is one.
  const existing = current?.connections?.find((c) => c.environment === environment);

  const hostsFor = (env: Environment) =>
    (current?.knownHosts ?? []).filter((h) => h.environment === env);

  function chooseEnvironment(env: Environment) {
    setEnvironment(env);
    setError("");
    setApiPassword("");
    const connection = current?.connections?.find((c) => c.environment === env);
    // Each environment is a different merchant profile with a different
    // password, so switching the toggle reloads that profile rather than
    // carrying the other one's details across.
    setHost(connection?.gatewayHost || hostsFor(env)[0]?.host || FALLBACK_HOSTS[env]);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .gatewayCredentials()
      .then((c) => {
        if (cancelled) return;
        setCurrent(c);
        const env = c.environment ?? "test";
        setEnvironment(env);
        setHost(c.gatewayHost || c.defaultGatewayHost || FALLBACK_HOSTS[env]);
      })
      .catch(() => {
        /* the form still works from defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Switching only moves which connection the operator is working in; nothing
  // already created moves with them.
  async function switchTo(env: Environment) {
    setError("");
    setBusy(true);
    try {
      const saved = await api.setEnvironment(env);
      setCurrent(saved);
      // The rest of the portal reads the environment off the session.
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not switch gateway.");
      setBusy(false);
    }
  }

  async function submit() {
    setError("");
    if (!apiPassword.trim() && !existing?.connected) {
      setError("Enter your MPGS API password.");
      return;
    }
    setBusy(true);
    try {
      const saved = await api.saveGatewayCredentials({
        environment,
        gatewayHost: host.trim(),
        apiVersion: current?.defaultApiVersion,
        apiPassword: apiPassword.trim(),
      });
      setCurrent(saved);
      setApiPassword("");
      setDone(true);
      markGatewayConnected();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify these credentials.");
    } finally {
      setBusy(false);
    }
  }

  // Both come from the merchant register, keyed on the environment being set up.
  const registeredName = current?.registeredMerchantName ?? current?.merchantName ?? "";
  const activeNumber =
    (environment === "live" && current?.registeredLiveNumber) ||
    current?.registeredMerchantNumber ||
    current?.mpgsMerchantId ||
    "";

  const label = "display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px";
  const input =
    "width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14.5px;background:#FAFAFB";

  return (
    <div
      data-pad=""
      style={s(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px",
      )}
    >
      <div
        style={s(
          "width:100%;max-width:520px;background:#fff;border-radius:20px;padding:38px 36px;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)",
        )}
      >
        <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:26px")}>
          <img
            src="/zemen-logo-dark.png"
            alt="Zemen Bank"
            style={s("height:30px;width:auto;display:block")}
          />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>
            PayLink
          </div>
        </div>

        {done ? (
          <>
            <div
              style={s(
                "width:56px;height:56px;border-radius:16px;background:#E6F6EE;display:flex;align-items:center;justify-content:center;margin-bottom:20px;animation:pop .4s ease both",
              )}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="2.2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1
              style={s(
                "font-family:'Space Grotesk';font-weight:600;font-size:25px;letter-spacing:-.02em;margin:0 0 6px",
              )}
            >
              {environment === "live" ? "Live gateway connected" : "Test gateway connected"}
            </h1>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 24px;line-height:1.6")}>
              {environment === "live"
                ? "Verified against the production gateway and stored securely. Links you create from now on take real money."
                : "Verified and stored securely. You can now create payment links and share them with your customers — nothing you do here moves real money."}
            </p>
            <div
              style={s(
                "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:12px;padding:16px 18px;margin-bottom:24px",
              )}
            >
              <Row label="Mode" value={environment === "live" ? "Live" : "Test"} />
              <Row label="Gateway" value={current?.gatewayHost ?? host} />
              <Row label="Merchant" value={registeredName || "—"} />
              <Row label="Merchant number" value={activeNumber || "—"} mono />
              <Row label="API password" value={current?.apiPasswordMasked ?? "••••"} mono last />
            </div>
            <button
              className="zxvmr3xp"
              onClick={() => window.location.reload()}
              style={s(
                "width:100%;padding:14px;background:#DA1E28;color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer",
              )}
            >
              Continue to your workspace
            </button>
            <button
              onClick={() => {
                setDone(false);
                setError("");
              }}
              style={s(
                "width:100%;padding:12px;margin-top:10px;background:transparent;color:#6B6D76;border:none;font-size:13px;font-weight:500;cursor:pointer",
              )}
            >
              Connect the other gateway
            </button>
          </>
        ) : (
          <>
            <div
              style={s(
                "display:inline-flex;align-items:center;gap:8px;background:#FDECED;color:#B0141C;font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;margin-bottom:16px",
              )}
            >
              Operator setup · {session?.user.fullName ?? ""}
            </div>
            <h1
              style={s(
                "font-family:'Space Grotesk';font-weight:600;font-size:25px;letter-spacing:-.02em;margin:0 0 6px",
              )}
            >
              Connect your gateway
            </h1>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 22px;line-height:1.6")}>
              Enter the Mastercard Payment Gateway credentials issued to you as an Operator. Payment
              links you create are settled through this merchant profile, so we verify the details
              with the gateway before saving them.
            </p>

            <label style={s(label)}>Gateway</label>
            <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px")}>
              {(["test", "live"] as Environment[]).map((env) => {
                const on = environment === env;
                const connected = current?.connections?.find(
                  (c) => c.environment === env,
                )?.connected;
                return (
                  <button
                    key={env}
                    onClick={() => chooseEnvironment(env)}
                    style={s(
                      `text-align:left;padding:13px 15px;border-radius:12px;cursor:pointer;background:#fff;border:1.5px solid ${
                        on ? (env === "live" ? "#DA1E28" : "#141519") : "#E3E3E6"
                      }`,
                    )}
                  >
                    <span
                      style={s(
                        `display:flex;align-items:center;gap:7px;font-size:14px;font-weight:600;color:${on ? "#141519" : "#6B6D76"}`,
                      )}
                    >
                      {env === "test" ? "Test" : "Live"}
                      {connected ? (
                        <span
                          style={s(
                            "width:6px;height:6px;border-radius:50%;background:#12905A;flex-shrink:0",
                          )}
                        />
                      ) : null}
                    </span>
                    <span
                      style={s("display:block;font-size:11.5px;color:#9A9CA5;margin-top:3px")}
                    >
                      {env === "test" ? "Simulated — no real money" : "Real cards, real money"}
                    </span>
                  </button>
                );
              })}
            </div>

            {existing?.connected && !existing.active ? (
              <div
                style={s(
                  "display:flex;align-items:center;gap:12px;background:#F4F6FF;border:1px solid #D9E0FA;border-radius:11px;padding:11px 14px;margin-bottom:16px",
                )}
              >
                <span style={s("flex:1;font-size:12.5px;color:#3A3B42;line-height:1.5")}>
                  Already connected — you are just not working in it.
                </span>
                <button
                  className="zxvmr3xp"
                  onClick={() => void switchTo(environment)}
                  disabled={busy}
                  style={s(
                    "padding:8px 14px;background:#141519;color:#fff;border:none;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0",
                  )}
                >
                  Work in {environment === "live" ? "Live" : "Test"}
                </button>
              </div>
            ) : null}

            {environment === "live" ? (
              <div
                style={s(
                  "display:flex;gap:10px;background:#FEF3E2;border:1px solid #F3D9A8;color:#8A5A00;border-radius:11px;padding:12px 14px;font-size:12.5px;line-height:1.6;margin-bottom:16px",
                )}
              >
                <span>
                  Links you create in Live take money from real cards and settle to the real
                  merchant account. Your test links and their figures stay separate and are not
                  affected.
                </span>
              </div>
            ) : null}

            <label style={s(label)}>Gateway host</label>
            <div style={s("display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px")}>
              {hostsFor(environment).map((option) => (
                <button
                  key={option.host}
                  onClick={() => setHost(option.host)}
                  title={option.label}
                  style={s(
                    `padding:6px 11px;border-radius:8px;font-size:12px;font-family:'IBM Plex Mono';cursor:pointer;background:${
                      host === option.host ? "#141519" : "#F4F4F6"
                    };color:${host === option.host ? "#fff" : "#5B5D66"};border:1px solid ${
                      host === option.host ? "#141519" : "#E7E7EA"
                    }`,
                  )}
                >
                  {option.host}
                </button>
              ))}
            </div>
            <input
              className="zxq6owgx"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={FALLBACK_HOSTS[environment]}
              style={s(input + ";font-family:'IBM Plex Mono';margin-bottom:6px")}
            />
            <div style={s("font-size:12px;color:#9A9CA5;margin-bottom:16px;line-height:1.6")}>
              Only Mastercard&rsquo;s own gateways are accepted — your API password is sent to
              whatever host is entered here. If your acquirer issued a branded gateway, ask the bank
              to allow it.
            </div>

            {/* Fixed when the operator registered. Showing it rather than
                asking again is what stops two people on one merchant
                authenticating as different merchants. */}
            <label style={s(label)}>Your merchant</label>
            <div
              style={s(
                "display:flex;align-items:center;justify-content:space-between;gap:14px;background:#F7F7F8;border:1px solid #E7E7EA;border-radius:11px;padding:13px 15px;margin-bottom:6px",
              )}
            >
              <span style={s("font-size:14.5px;font-weight:600;color:#141519")}>
                {registeredName || "Not registered"}
              </span>
              <span style={s("font-family:'IBM Plex Mono';font-size:13px;color:#6B6D76")}>
                {activeNumber || "—"}
              </span>
            </div>
            <div style={s("font-size:12px;color:#9A9CA5;margin-bottom:16px;line-height:1.6")}>
              Set when you registered. Payments settle to this merchant and its name is what
              appears on your customers&rsquo; receipts.
            </div>

            <label style={s(label)}>
              API password
              {existing?.connected ? (
                <span style={s("font-weight:500;color:#9A9CA5")}>
                  {" "}
                  — leave blank to keep {existing.apiPasswordMasked}
                </span>
              ) : null}
            </label>
            <input
              className="zxq6owgx"
              type="password"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder="••••••••••••••••"
              style={s(input + ";font-family:'IBM Plex Mono';margin-bottom:8px")}
            />
            <div style={s("font-size:12px;color:#9A9CA5;margin-bottom:22px;line-height:1.6")}>
              Stored encrypted on the server and never shown again in full. Find it in Merchant
              Administration under Admin → Integration Settings.
            </div>

            {error ? (
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
                <span>{error}</span>
              </div>
            ) : null}

            <button
              className="zxvmr3xp"
              onClick={() => void submit()}
              disabled={busy}
              style={s(
                `width:100%;padding:14px;background:${busy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:${busy ? "wait" : "pointer"};display:flex;align-items:center;justify-content:center;gap:10px`,
              )}
            >
              {busy ? (
                <>
                  <span
                    style={s(
                      "width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite",
                    )}
                  />
                  Verifying with the gateway…
                </>
              ) : (
                "Verify & connect"
              )}
            </button>

            <div style={s("text-align:center;margin-top:16px")}>
              {/* An operator who is already trading got here from the portal and
                  needs a way back; a first-time one has nowhere to go but out. */}
              <a
                href="#"
                className="zxex49ni"
                onClick={(e) => {
                  e.preventDefault();
                  if (session?.gatewayConnected) on.salesDash();
                  else signOut();
                }}
                style={s("font-size:13px;color:#6B6D76")}
              >
                {session?.gatewayConnected ? "Back to your workspace" : "Sign out"}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={s(
        `display:flex;justify-content:space-between;align-items:center;font-size:13px${last ? "" : ";margin-bottom:10px"}`,
      )}
    >
      <span style={s("color:#6B6D76")}>{label}</span>
      <span style={s(`font-weight:600;color:#141519${mono ? ";font-family:'IBM Plex Mono'" : ""}`)}>
        {value}
      </span>
    </div>
  );
}
