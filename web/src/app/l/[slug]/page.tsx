"use client";

import { use, useEffect, useState } from "react";
import { s } from "@/lib/css";
import { ApiError, api, type CheckoutSession, type PublicLink } from "@/lib/api";

// The gateway's checkout.js attaches this global once loaded.
declare global {
  interface Window {
    Checkout?: {
      configure: (options: Record<string, unknown>) => void;
      showPaymentPage: () => void;
    };
  }
}

function loadCheckoutScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Checkout) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("failed to load checkout.js")));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error("failed to load checkout.js")));
    document.head.appendChild(el);
  });
}

export default function PayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [link, setLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  // Only asked for on a split bill, where the merchant needs to know who has
  // chipped in. Optional — it never blocks the payment.
  const [payerName, setPayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .publicLink(slug)
      .then((l) => {
        if (cancelled) return;
        setLink(l);
        // On a split bill the obvious thing to pay is whatever is left, so
        // offer that and let the payer type less if they are only covering part.
        if (l.isSplit && l.remainingMinor > 0) {
          setAmount((l.remainingDisplay ?? "").replace(/[^\d.]/g, ""));
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function pay() {
    if (!link) return;
    setError("");
    setBusy(true);
    try {
      const session: CheckoutSession = await api.startCheckout(slug, {
        amount: link.type === "static" ? undefined : amount,
        customerName: payerName.trim() || undefined,
      });
      await loadCheckoutScript(session.checkoutScript);
      if (!window.Checkout) throw new Error("checkout unavailable");

      // Hosted Checkout takes over from here: card details are entered on the
      // gateway's own page, so they never reach this origin.
      window.Checkout.configure({
        session: { id: session.sessionId },
      });
      window.Checkout.showPaymentPage();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not open the secure payment page. Please try again.",
      );
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Frame>
        <div style={s("display:flex;align-items:center;justify-content:center;padding:60px 0")}>
          <span
            style={s(
              "width:28px;height:28px;border:3px solid #ECECEE;border-top-color:#DA1E28;border-radius:50%;animation:spin .8s linear infinite",
            )}
          />
        </div>
      </Frame>
    );
  }

  if (notFound || !link) {
    return (
      <Frame>
        <Notice
          tone="neutral"
          title="Link not found"
          body="This payment link does not exist. Please check the address, or ask the merchant to send it again."
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <div
        style={s(
          "background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 30px 70px rgba(20,21,25,.16);animation:fadeUp .5s ease both",
        )}
      >
        <div
          style={s(
            "background:#141519;padding:16px 24px;display:flex;align-items:center;justify-content:space-between",
          )}
        >
          <div style={s("display:flex;align-items:center;gap:11px")}>
            <img
              src="/zemen-logo-light.png"
              alt="Zemen Bank"
              style={s("height:26px;width:auto;display:block")}
            />
            <span style={s("width:1px;height:20px;background:rgba(255,255,255,.18)")} />
            <span
              style={s("font-family:'Space Grotesk';font-weight:600;font-size:14px;color:#fff")}
            >
              PayLink
            </span>
          </div>
          <span
            style={s(
              "display:flex;align-items:center;gap:6px;font-size:11.5px;color:#8B8D96;font-weight:500",
            )}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="2">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Secure
          </span>
        </div>

        {/* A payer must never be left thinking a rehearsal took their money. */}
        {link.isTest && (
          <div
            style={s(
              "display:flex;align-items:center;gap:9px;background:#FEF3E2;border-bottom:1px solid #F3D9A8;color:#8A5A00;padding:11px 26px;font-size:12.5px;line-height:1.5",
            )}
          >
            <span
              style={s(
                "font-weight:700;letter-spacing:.05em;font-size:11px;flex-shrink:0;background:#F3D9A8;border-radius:5px;padding:2px 7px",
              )}
            >
              TEST
            </span>
            <span>This is a test payment link. No money will be taken from your card.</span>
          </div>
        )}

        <div style={s("padding:28px 26px 30px")}>
          <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:22px")}>
            <span
              style={s(
                "width:42px;height:42px;border-radius:11px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0",
              )}
            >
              {link.merchantName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
            <div style={s("min-width:0")}>
              <div style={s("font-size:15px;font-weight:600;line-height:1.2")}>
                {link.merchantName}
              </div>
              <div style={s("font-size:12.5px;color:#8B8D96")}>
                {link.branchName || "Payment request"}
              </div>
            </div>
          </div>

          {link.payable ? (
            <>
              {link.isSplit ? (
                <div
                  style={s(
                    "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:13px;padding:15px 17px;margin-bottom:20px",
                  )}
                >
                  <div
                    style={s(
                      "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px",
                    )}
                  >
                    <span style={s("font-size:12.5px;color:#6B6D76")}>Shared bill</span>
                    <span style={s("font-size:12.5px;font-weight:600;color:#3A3B42")}>
                      {link.targetDisplay}
                    </span>
                  </div>
                  <div
                    style={s(
                      "height:8px;background:#EDEDEF;border-radius:5px;overflow:hidden;margin-bottom:10px",
                    )}
                  >
                    <div
                      style={s(
                        `height:100%;width:${link.percentPaid}%;background:#12905A;border-radius:5px;transition:width .4s ease`,
                      )}
                    />
                  </div>
                  <div style={s("display:flex;justify-content:space-between;font-size:12.5px")}>
                    <span style={s("color:#12905A;font-weight:600")}>
                      {link.paidDisplay} paid
                      {link.contributorCount > 0
                        ? ` · ${link.contributorCount} ${link.contributorCount === 1 ? "person" : "people"}`
                        : ""}
                    </span>
                    <span style={s("color:#3A3B42;font-weight:600")}>
                      {link.remainingDisplay} left
                    </span>
                  </div>
                </div>
              ) : null}

              <div style={s("text-align:center;margin-bottom:22px")}>
                <div style={s("font-size:13px;color:#6B6D76;margin-bottom:4px")}>
                  {link.isSplit ? "Your share" : "Amount due"}
                </div>
                {link.type !== "static" ? (
                  <input
                    className="zxq6owgx"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    style={s(
                      "width:100%;text-align:center;font-family:'Space Grotesk';font-weight:700;font-size:34px;letter-spacing:-.02em;padding:10px 12px;border:1px solid #E3E3E6;border-radius:12px;background:#FAFAFB",
                    )}
                  />
                ) : (
                  <div
                    style={s(
                      "font-family:'Space Grotesk';font-weight:700;font-size:38px;letter-spacing:-.02em",
                    )}
                  >
                    {link.amountDisplay}
                  </div>
                )}
                {link.isSplit ? (
                  <div style={s("font-size:12px;color:#9A9CA5;margin-top:6px")}>
                    Pay all of it, or just your part
                  </div>
                ) : null}
                <div style={s("font-size:13px;color:#6B6D76;margin-top:6px")}>{link.title}</div>
                {link.reference ? (
                  <div
                    style={s("font-size:12px;color:#9A9CA5;font-family:'IBM Plex Mono';margin-top:3px")}
                  >
                    {link.reference}
                  </div>
                ) : null}
              </div>

              {link.isSplit ? (
                <div style={s("margin-bottom:20px")}>
                  <label
                    style={s(
                      "display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px",
                    )}
                  >
                    Your name
                    <span style={s("font-weight:500;color:#9A9CA5")}> — optional</span>
                  </label>
                  <input
                    className="zxq6owgx"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="So the organiser knows who paid"
                    style={s(
                      "width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#FAFAFB",
                    )}
                  />
                </div>
              ) : null}

              {link.description ? (
                <div
                  style={s(
                    "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:11px;padding:12px 14px;font-size:13px;color:#5B5D66;line-height:1.6;margin-bottom:20px",
                  )}
                >
                  {link.description}
                </div>
              ) : null}

              {error ? (
                <div
                  style={s(
                    "display:flex;gap:10px;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:16px",
                  )}
                >
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                className="zxvmr3xp"
                onClick={() => void pay()}
                disabled={busy}
                style={s(
                  `width:100%;padding:15px;background:${busy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:12px;font-size:15.5px;font-weight:600;cursor:${busy ? "wait" : "pointer"};box-shadow:0 10px 24px rgba(218,30,40,.3);display:flex;align-items:center;justify-content:center;gap:10px`,
                )}
              >
                {busy ? (
                  <>
                    <span
                      style={s(
                        "width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite",
                      )}
                    />
                    Opening secure payment…
                  </>
                ) : (
                  "Pay securely"
                )}
              </button>

              <div
                style={s(
                  "display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px",
                )}
              >
                <span style={s("display:inline-flex;align-items:center")}>
                  <span style={s("width:20px;height:20px;border-radius:50%;background:#EB001B")} />
                  <span
                    style={s(
                      "width:20px;height:20px;border-radius:50%;background:#F79E1B;margin-left:-9px",
                    )}
                  />
                </span>
                <span
                  style={s(
                    "font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:14px;color:#1A1F71",
                  )}
                >
                  VISA
                </span>
                <span style={s("font-size:11.5px;color:#9A9CA5")}>· MPGS</span>
              </div>
            </>
          ) : (
            <Notice
              tone="warn"
              title="This link is not accepting payments"
              body={link.unavailable ?? "Please contact the merchant for a new payment link."}
              inline
            />
          )}
        </div>
      </div>

      <div
        style={s(
          "text-align:center;font-size:11.5px;color:#9A9CA5;margin-top:18px;line-height:1.6",
        )}
      >
        Processed securely by the Mastercard Payment Gateway.
        <br />
        Your card details are never shared with the merchant.
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={s(
        "min-height:100vh;background:#F5F5F6;display:flex;align-items:center;justify-content:center;padding:32px 18px",
      )}
    >
      <div style={s("width:100%;max-width:420px")}>{children}</div>
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
  inline,
}: {
  tone: "neutral" | "warn";
  title: string;
  body: string;
  inline?: boolean;
}) {
  const bg = tone === "warn" ? "#FEF3E2" : "#F2F2F4";
  const fg = tone === "warn" ? "#B77400" : "#5B5D66";
  return (
    <div
      style={s(
        inline
          ? "text-align:center;padding:14px 0"
          : "background:#fff;border-radius:20px;padding:32px 26px;text-align:center;box-shadow:0 30px 70px rgba(20,21,25,.16)",
      )}
    >
      <div
        style={s(
          `width:52px;height:52px;border-radius:14px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;margin:0 auto 16px`,
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </div>
      <div
        style={s(
          "font-family:'Space Grotesk';font-weight:600;font-size:18px;letter-spacing:-.01em;margin-bottom:6px",
        )}
      >
        {title}
      </div>
      <div style={s("font-size:13.5px;color:#6B6D76;line-height:1.65")}>{body}</div>
    </div>
  );
}
