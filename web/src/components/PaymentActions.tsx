"use client";

import { useEffect, useState } from "react";
import { s } from "@/lib/css";
import { ApiError, api, type PaymentDetail } from "@/lib/api";
import { payerLabel } from "@/store/live";

type Action = "capture" | "refund" | "void";

const ACTION = {
  capture: {
    title: "Capture payment",
    verb: "Capture",
    blurb: "Take funds that were reserved when the customer paid. You can capture less than the full amount and come back for the rest.",
    accent: "#141519",
    accentHover: "#000",
  },
  refund: {
    title: "Refund payment",
    verb: "Refund",
    blurb: "Return money to the customer's card. Part of it, or all of it.",
    accent: "#DA1E28",
    accentHover: "#B0141C",
  },
  void: {
    title: "Void authorization",
    verb: "Void the hold",
    blurb: "Release the reserved funds without taking any. The customer's card is freed immediately.",
    accent: "#DA1E28",
    accentHover: "#B0141C",
  },
} as const;

/**
 * Payment detail with the money actions attached.
 *
 * Amounts are pre-filled with the full remaining balance so the common case is
 * one click, while partial capture and partial refund stay one edit away.
 */
export function PaymentActions({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .payment(orderId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load this payment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function begin(next: Action) {
    setError("");
    setDone("");
    setAction(next);
    if (!detail) return;
    // Strip the currency symbol and separators so the field is directly editable.
    const remaining = next === "capture" ? detail.capturableDisplay : detail.refundableDisplay;
    setAmount(remaining.replace(/[^\d.]/g, ""));
  }

  async function confirm() {
    if (!action || !detail) return;
    setBusy(true);
    setError("");
    try {
      const updated =
        action === "capture"
          ? await api.capture(orderId, amount)
          : action === "refund"
            ? await api.refund(orderId, amount)
            : await api.voidPayment(orderId);
      setDetail(updated);
      setAction(null);
      setDone(
        action === "capture"
          ? "Captured."
          : action === "refund"
            ? "Refunded."
            : "Hold released.",
      );
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not go through.");
    } finally {
      setBusy(false);
    }
  }

  const config = action ? ACTION[action] : null;

  return (
    <div
      onClick={onClose}
      style={s(
        "position:fixed;inset:0;z-index:240;background:rgba(20,21,25,.5);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn .2s ease both",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={s(
          "width:100%;max-width:520px;max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 40px 90px rgba(0,0,0,.4);animation:fadeUp .25s ease both",
        )}
      >
        <div
          style={s(
            "display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #F0F0F2",
          )}
        >
          <div>
            <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px")}>
              {config ? config.title : "Payment"}
            </div>
            <div style={s("font-size:12px;color:#9A9CA5;font-family:'IBM Plex Mono';margin-top:2px")}>
              {orderId}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="zxoy0gmr"
            style={s(
              "width:32px;height:32px;border-radius:9px;border:1px solid #E7E7EA;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0",
            )}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B5D66" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={s("padding:22px")}>
          {loading ? (
            <div style={s("display:flex;justify-content:center;padding:36px 0")}>
              <span
                style={s(
                  "width:24px;height:24px;border:3px solid #ECECEE;border-top-color:#DA1E28;border-radius:50%;animation:spin .8s linear infinite",
                )}
              />
            </div>
          ) : !detail ? (
            <div style={s("font-size:13.5px;color:#B0141C")}>{error || "Payment unavailable."}</div>
          ) : (
            <>
              <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:18px")}>
                <span
                  style={s(
                    "width:40px;height:40px;border-radius:11px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0",
                  )}
                >
                  {payerLabel(detail)
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div style={s("min-width:0")}>
                  <div style={s("font-size:14px;font-weight:600")}>
                    {payerLabel(detail)}
                  </div>
                  <div style={s("font-size:12.5px;color:#8B8D96")}>
                    {detail.date} · {detail.time}
                    {detail.cardLast4 ? ` · ${detail.cardBrand} ····${detail.cardLast4}` : ""}
                  </div>
                </div>
              </div>

              <div
                style={s(
                  "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:12px;padding:14px 16px;margin-bottom:18px",
                )}
              >
                {detail.authorizedMinor > 0 ? (
                  <Line label="Reserved" value={detail.authorizedDisplay} />
                ) : null}
                <Line label="Captured" value={detail.capturedDisplay} />
                {detail.refundedMinor > 0 ? (
                  <Line label="Refunded" value={detail.refundedDisplay} tone="#B0141C" />
                ) : null}
                <Line label="Net" value={detail.netDisplay} strong last />
              </div>

              {done ? (
                <div
                  style={s(
                    "display:flex;align-items:center;gap:9px;background:#E6F6EE;border:1px solid #C6E9D7;color:#12905A;border-radius:11px;padding:11px 14px;font-size:13px;font-weight:600;margin-bottom:16px",
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {done}
                </div>
              ) : null}

              {error ? (
                <div
                  style={s(
                    "display:flex;gap:10px;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:16px",
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

              {action && config ? (
                <>
                  <div style={s("font-size:13px;color:#6B6D76;line-height:1.6;margin-bottom:16px")}>
                    {config.blurb}
                  </div>
                  {action !== "void" ? (
                    <>
                      <label
                        style={s("display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px")}
                      >
                        Amount to {action}
                        <span style={s("font-weight:500;color:#9A9CA5")}>
                          {" "}
                          — up to{" "}
                          {action === "capture" ? detail.capturableDisplay : detail.refundableDisplay}
                        </span>
                      </label>
                      <input
                        className="zxq6owgx"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !busy) void confirm();
                        }}
                        style={s(
                          "width:100%;padding:13px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:16px;font-family:'IBM Plex Mono';background:#FAFAFB;margin-bottom:18px",
                        )}
                      />
                    </>
                  ) : null}
                  <div style={s("display:flex;gap:10px")}>
                    <button
                      className="zxoy0gmr"
                      onClick={() => {
                        setAction(null);
                        setError("");
                      }}
                      disabled={busy}
                      style={s(
                        "flex:1;padding:13px;border:1px solid #E7E7EA;background:#fff;border-radius:11px;font-size:14px;font-weight:600;color:#3A3B42;cursor:pointer",
                      )}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => void confirm()}
                      disabled={busy}
                      style={s(
                        `flex:1.4;padding:13px;border:none;background:${busy ? "#8B8D96" : config.accent};color:#fff;border-radius:11px;font-size:14px;font-weight:600;cursor:${busy ? "wait" : "pointer"};display:flex;align-items:center;justify-content:center;gap:9px`,
                      )}
                    >
                      {busy ? (
                        <>
                          <span
                            style={s(
                              "width:15px;height:15px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite",
                            )}
                          />
                          Working…
                        </>
                      ) : (
                        config.verb
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
                    {detail.canCapture ? (
                      <ActionButton
                        label={`Capture ${detail.capturableDisplay}`}
                        onClick={() => begin("capture")}
                        primary
                      />
                    ) : null}
                    {detail.canRefund ? (
                      <ActionButton label="Refund" onClick={() => begin("refund")} danger />
                    ) : null}
                    {detail.canVoid ? (
                      <ActionButton label="Void hold" onClick={() => begin("void")} danger />
                    ) : null}
                    {!detail.canCapture && !detail.canRefund && !detail.canVoid ? (
                      <div style={s("font-size:13px;color:#9A9CA5;line-height:1.6")}>
                        Nothing to do here — this payment is settled.
                      </div>
                    ) : null}
                  </div>

                      {detail.gatewayReceipt || detail.authorizationCode ? (
                    <div style={s("margin-top:22px")}>
                      <div
                        style={s(
                          "font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px",
                        )}
                      >
                        References
                      </div>
                      <div
                        style={s(
                          "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:11px;padding:13px 15px",
                        )}
                      >
                        <Ref label="Gateway receipt" value={detail.gatewayReceipt} />
                        <Ref label="Approval code" value={detail.authorizationCode} />
                        <Ref label="Acquirer reference" value={detail.acquirerReference} />
                        <Ref label="Settlement date" value={detail.settlementDate} />
                        <Ref label="Order" value={detail.orderId} last />
                      </div>
                      <div style={s("font-size:11.5px;color:#9A9CA5;margin-top:8px;line-height:1.55")}>
                        Quote the gateway receipt to look this payment up in Merchant
                        Administration, or the approval code when raising a dispute.
                      </div>
                    </div>
                  ) : null}

                  {/* What to open when a customer asks for proof of payment. */}
                  <a
                    href={`/r/${encodeURIComponent(detail.orderId)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={s(
                      "display:flex;align-items:center;justify-content:center;gap:8px;margin-top:22px;padding:11px;border:1px solid #E7E7EA;border-radius:11px;font-size:13px;font-weight:600;color:#141519;text-decoration:none",
                    )}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M8 13h8M8 17h5" />
                    </svg>
                    Customer receipt
                  </a>

              {detail.operations.length > 0 ? (
                    <div style={s("margin-top:22px")}>
                      <div
                        style={s(
                          "font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px",
                        )}
                      >
                        History
                      </div>
                      <div style={s("display:flex;flex-direction:column;gap:8px")}>
                        {detail.operations.map((op) => (
                          <div
                            key={op.id}
                            style={s(
                              "display:flex;align-items:center;gap:10px;font-size:12.5px;padding:9px 12px;background:#FAFAFB;border:1px solid #EEEEF0;border-radius:10px",
                            )}
                          >
                            <span
                              style={s(
                                `width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${op.status === "success" ? "#12905A" : "#DA1E28"}`,
                              )}
                            />
                            <span style={s("font-weight:600;text-transform:capitalize")}>{op.type}</span>
                            <span style={s("font-family:'IBM Plex Mono'")}>{op.amountDisplay}</span>
                            <span style={s("flex:1")} />
                            <span style={s("color:#9A9CA5")}>{op.at}</span>
                            {op.performedBy ? (
                              <span style={s("color:#9A9CA5")}>· {op.performedBy}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {detail.operations.some((o) => o.status !== "success") ? (
                        <div style={s("font-size:12px;color:#B0141C;margin-top:8px;line-height:1.5")}>
                          {detail.operations.find((o) => o.status !== "success")?.detail}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  danger,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const base =
    "padding:11px 16px;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer;flex:1;min-width:130px";
  const style = primary
    ? `${base};border:none;background:#141519;color:#fff`
    : danger
      ? `${base};border:1px solid #F5C6C9;background:#fff;color:#B0141C`
      : `${base};border:1px solid #E7E7EA;background:#fff;color:#3A3B42`;
  return (
    <button className={primary ? "zx15p5ni" : "zx1b5k1d"} onClick={onClick} style={s(style)}>
      {label}
    </button>
  );
}

// One reference row. Rendered only when the gateway actually gave us the value.
function Ref({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  if (!value) return null;
  return (
    <div
      style={s(
        `display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12.5px${last ? "" : ";margin-bottom:8px"}`,
      )}
    >
      <span style={s("color:#6B6D76;flex-shrink:0")}>{label}</span>
      <span
        style={s(
          "font-family:'IBM Plex Mono';font-weight:600;color:#141519;text-align:right;word-break:break-all",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  strong,
  last,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={s(
        `display:flex;justify-content:space-between;align-items:center;font-size:13px${last ? ";padding-top:9px;margin-top:9px;border-top:1px solid #EAEAEC" : ";margin-bottom:9px"}`,
      )}
    >
      <span style={s("color:#6B6D76")}>{label}</span>
      <span
        style={s(
          `font-weight:600;font-family:'IBM Plex Mono';color:${tone ?? "#141519"}${strong ? ";font-size:15px" : ""}`,
        )}
      >
        {value}
      </span>
    </div>
  );
}
