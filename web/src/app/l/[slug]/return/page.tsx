"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { s } from "@/lib/css";
import { api, type PaymentStatus } from "@/lib/api";

// Where the gateway sends the payer after Hosted Checkout. The redirect
// parameters are only a hint — the server re-reads the order from the gateway,
// so this page just reflects the authoritative result.

type Tone = "success" | "reserved" | "pending" | "released" | "failed";

const TONES: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: "#12905A", bg: "#E6F6EE" },
  reserved: { fg: "#2C5FA8", bg: "#EAF1FB" },
  pending: { fg: "#B77400", bg: "#FEF3E2" },
  released: { fg: "#5B5D66", bg: "#F2F2F4" },
  failed: { fg: "#B0141C", bg: "#FDECED" },
};

type Outcome = { tone: Tone; title: string; body: string; amountLabel: string };

// States that produced a document worth keeping. An abandoned or failed attempt
// moved no money, so there is nothing to receipt.
const RECEIPTABLE = new Set([
  "paid",
  "authorized",
  "partially_captured",
  "partially_refunded",
  "refunded",
]);

// Every state the payer can land in gets its own words. An authorization in
// particular is a success for them — the money is committed, just not taken —
// and must never read like a failure.
function outcomeFor(status: PaymentStatus | null, error: string): Outcome {
  if (error) {
    return {
      tone: "failed",
      title: "Something went wrong",
      body: error,
      amountLabel: "Amount",
    };
  }
  const merchant = status?.merchantName || "the merchant";
  const amount = status?.amountDisplay || "The amount";

  switch (status?.status) {
    case "paid":
    case "partially_captured":
      return {
        tone: "success",
        title: "Payment complete",
        body: `Thank you. Your payment to ${merchant} was received.`,
        amountLabel: "Amount",
      };
    case "authorized":
      return {
        tone: "reserved",
        title: "Card authorized",
        body: `${amount} is reserved on your card. ${merchant} will take the payment when your order is confirmed — nothing has been charged yet.`,
        amountLabel: "Reserved",
      };
    case "partially_refunded":
    case "refunded":
      return {
        tone: "released",
        title: "Payment refunded",
        body: `${merchant} has refunded this payment to your card.`,
        amountLabel: "Amount",
      };
    case "cancelled":
      return {
        tone: "released",
        title: "Hold released",
        body: "The funds reserved on your card have been released. Nothing was charged.",
        amountLabel: "Was reserved",
      };
    case "expired":
      return {
        tone: "released",
        title: "Payment not completed",
        body: "This payment timed out before it finished. No money has been taken.",
        amountLabel: "Amount",
      };
    case "initiated":
      return {
        tone: "pending",
        title: "Confirming your payment",
        body: "This usually takes a few seconds.",
        amountLabel: "Amount",
      };
    default:
      return {
        tone: "failed",
        title: "Payment not completed",
        body: "No money has been taken. You can try again from the original payment link.",
        amountLabel: "Amount",
      };
  }
}

function Icon({ tone, color }: { tone: Tone; color: string }) {
  const common = { width: 29, height: 29, viewBox: "0 0 24 24", fill: "none", stroke: color };
  if (tone === "success") {
    return (
      <svg {...common} strokeWidth="2.2">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (tone === "reserved") {
    // A closed padlock: committed, but not yet taken.
    return (
      <svg {...common} strokeWidth="1.9">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (tone === "pending") {
    return (
      <svg {...common} strokeWidth="1.9">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

function ReturnView() {
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setError("This confirmation link is missing its order reference.");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const next = await api.paymentStatus(orderId);
        if (cancelled) return;
        setStatus(next);
        // Settlement can lag the redirect by a moment; re-check a few times
        // while the attempt is still open.
        if (next.status === "initiated" && attempts < 5) {
          timer = setTimeout(() => setAttempts((a) => a + 1), 1500);
        }
      } catch {
        if (!cancelled) setError("We could not confirm this payment. Please contact the merchant.");
      }
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, attempts]);

  // Hand the payer back to the system that asked for this link, when it asked
  // for them back.
  //
  // Only once the outcome has settled — the server sends nothing while a
  // payment is still in flight, so a redirect can never land somebody on a page
  // claiming a result neither side knows yet.
  //
  // Deliberately not instant: the bank confirms what happened first, and the
  // link stays on screen so a blocked or failed redirect is a dead end for
  // nobody.
  const continueURL = status?.continueUrl ?? "";
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (!continueURL) return;
    setReturning(true);
    const timer = setTimeout(() => {
      window.location.replace(continueURL);
    }, 2500);
    return () => clearTimeout(timer);
  }, [continueURL]);

  const outcome = outcomeFor(status, error);
  const { fg, bg } = TONES[outcome.tone];

  return (
    <div
      style={s(
        "min-height:100vh;background:#F5F5F6;display:flex;align-items:center;justify-content:center;padding:32px 18px",
      )}
    >
      <div style={s("width:100%;max-width:420px")}>
        <div
          style={s(
            "background:#fff;border-radius:20px;padding:34px 28px;text-align:center;box-shadow:0 30px 70px rgba(20,21,25,.16);animation:fadeUp .5s ease both",
          )}
        >
          <div
            style={s(
              `width:62px;height:62px;border-radius:17px;background:${bg};display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:pop .45s ease both`,
            )}
          >
            <Icon tone={outcome.tone} color={fg} />
          </div>

          <h1
            style={s(
              "font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0 0 6px",
            )}
          >
            {outcome.title}
          </h1>
          <p style={s("color:#6B6D76;font-size:14px;margin:0 0 24px;line-height:1.6")}>
            {outcome.body}
          </p>

          {status ? (
            <div
              style={s(
                "background:#FAFAFB;border:1px solid #EEEEF0;border-radius:12px;padding:16px 18px;text-align:left",
              )}
            >
              <Row label={outcome.amountLabel} value={status.amountDisplay} strong />
              <Row label="For" value={status.linkTitle} />
              {status.cardLast4 ? (
                <Row
                  label="Card"
                  value={`${status.cardBrand ?? "Card"} ····${status.cardLast4}`}
                  mono
                />
              ) : null}
              <Row label="Reference" value={status.orderId} mono last />
            </div>
          ) : null}

          {/* Offered only once something actually happened to the card — there
              is no receipt for a payment that never completed. */}
          {status && RECEIPTABLE.has(status.status) ? (
            <a
              href={`/r/${encodeURIComponent(status.orderId)}`}
              style={s(
                "display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:12px;border:1px solid #E3E3E6;border-radius:11px;font-size:13.5px;font-weight:600;color:#141519;text-decoration:none",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8M8 17h5" />
              </svg>
              View receipt
            </a>
          ) : null}

          {/* The link is shown, not just followed. A redirect can be blocked,
              slow or simply fail, and a payer whose money has moved should
              never be left on a page with no way forward. */}
          {returning ? (
            <div style={s("margin-top:18px;padding-top:18px;border-top:1px solid #F0F0F2")}>
              <div style={s("display:flex;align-items:center;justify-content:center;gap:9px;color:#6B6D76;font-size:13px")}>
                <span style={s("width:14px;height:14px;border:2px solid #E3E3E6;border-top-color:#DA1E28;border-radius:50%;animation:spin .7s linear infinite")} />
                Returning you to {hostOf(continueURL)}…
              </div>
              <a
                href={continueURL}
                style={s("display:block;margin-top:10px;font-size:12.5px;font-weight:600;color:#DA1E28;text-decoration:none")}
              >
                Continue now
              </a>
            </div>
          ) : null}
        </div>

        <div
          style={s("text-align:center;font-size:11.5px;color:#9A9CA5;margin-top:18px;line-height:1.6")}
        >
          Processed securely by the Mastercard Payment Gateway.
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={s(
        `display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:13px${last ? "" : ";margin-bottom:10px"}`,
      )}
    >
      <span style={s("color:#6B6D76;flex-shrink:0")}>{label}</span>
      <span
        style={s(
          `font-weight:600;color:#141519;text-align:right;word-break:break-all${mono ? ";font-family:'IBM Plex Mono';font-size:12px" : ""}${strong ? ";font-size:15px" : ""}`,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnView />
    </Suspense>
  );
}

// hostOf names where the payer is being sent, so "returning you to…" says a
// place rather than a whole URL with a query string on the end.
function hostOf(raw: string): string {
  try {
    return new URL(raw).host;
  } catch {
    return "the merchant";
  }
}
