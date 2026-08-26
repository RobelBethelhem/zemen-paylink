"use client";

import { use, useEffect, useState } from "react";
import { ApiError, api, type Receipt } from "@/lib/api";
import { s } from "@/lib/css";

// The payer's printable proof of payment. Reached from the confirmation page,
// or from the operator's payment detail when a customer asks for a copy.
//
// It prints rather than downloads: every browser can print to PDF, the output
// carries real fonts and the bank's mark, and there is no PDF library to keep
// in step with the design.

function formatMoment(iso?: string) {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; }
  [data-receipt-page] { padding: 0 !important; min-height: 0 !important; background: #fff !important; }
  [data-receipt] { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: none !important; }
  [data-print-hide] { display: none !important; }
}
`;

export default function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .receipt(orderId)
      .then((r) => {
        if (!cancelled) setReceipt(r);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "This receipt could not be loaded.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (error) {
    return (
      <div
        style={s(
          "min-height:100vh;background:#F5F5F6;display:flex;align-items:center;justify-content:center;padding:32px 18px",
        )}
      >
        <div
          style={s(
            "background:#fff;border-radius:18px;padding:32px 28px;max-width:400px;text-align:center;box-shadow:0 24px 60px rgba(20,21,25,.14)",
          )}
        >
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:19px;margin-bottom:8px")}>
            No receipt available
          </div>
          <p style={s("color:#6B6D76;font-size:13.5px;margin:0;line-height:1.6")}>{error}</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div style={s("min-height:100vh;background:#F5F5F6")} />
    );
  }

  return (
    <div
      data-receipt-page=""
      style={s("min-height:100vh;background:#F5F5F6;padding:32px 18px 48px")}
    >
      <style>{PRINT_CSS}</style>

      <div style={s("max-width:560px;margin:0 auto")}>
        <div
          data-print-hide=""
          style={s("display:flex;align-items:center;gap:10px;margin-bottom:16px")}
        >
          <button
            onClick={() => window.print()}
            style={s(
              "display:flex;align-items:center;gap:8px;padding:10px 16px;background:#141519;color:#fff;border:none;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 9V3h12v6" />
              <rect x="6" y="14" width="12" height="7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
            </svg>
            Print or save as PDF
          </button>
          <span style={s("font-size:12px;color:#9A9CA5")}>
            Choose &ldquo;Save as PDF&rdquo; in the print dialog to keep a copy.
          </span>
        </div>

        <div
          data-receipt=""
          style={s(
            "background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(20,21,25,.12)",
          )}
        >
          {/* A test receipt must never be presentable as proof of a real
              payment, so it says so before anything else on the page. */}
          {receipt.isTest && (
            <div
              style={s(
                "background:#FEF3E2;border-bottom:1px solid #F3D9A8;color:#8A5A00;padding:11px 30px;font-size:12.5px;line-height:1.5;display:flex;align-items:center;gap:9px",
              )}
            >
              <span
                style={s(
                  "font-weight:700;letter-spacing:.05em;font-size:11px;background:#F3D9A8;border-radius:5px;padding:2px 7px;flex-shrink:0",
                )}
              >
                TEST
              </span>
              <span>Test transaction — no money moved. This is not a valid proof of payment.</span>
            </div>
          )}

          <div style={s("padding:30px 30px 24px;border-bottom:1px solid #F0F0F2")}>
            <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px")}>
              <img
                src="/zemen-logo-dark.png"
                alt="Zemen Bank"
                style={s("height:30px;width:auto;display:block")}
              />
              <div style={s("text-align:right")}>
                <div
                  style={s(
                    "font-size:10.5px;color:#9A9CA5;letter-spacing:.1em;text-transform:uppercase;font-weight:600",
                  )}
                >
                  Receipt
                </div>
                <div style={s("font-family:'IBM Plex Mono';font-size:13px;font-weight:600;margin-top:3px")}>
                  {receipt.number}
                </div>
              </div>
            </div>

            <div style={s("font-size:13px;color:#6B6D76;margin-bottom:4px")}>
              {receipt.settled ? "Amount paid" : "Amount reserved"}
            </div>
            <div
              style={s(
                "font-family:'Space Grotesk';font-weight:700;font-size:34px;letter-spacing:-.02em;line-height:1.1",
              )}
            >
              {receipt.settled ? receipt.netDisplay : receipt.amountDisplay}
            </div>

            <div
              style={s(
                `display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:600;${
                  receipt.settled
                    ? "background:#E6F6EE;color:#12905A"
                    : "background:#EAF1FB;color:#2C5FA8"
                }`,
              )}
            >
              <span
                style={s(
                  `width:6px;height:6px;border-radius:50%;background:${receipt.settled ? "#12905A" : "#2C5FA8"}`,
                )}
              />
              {receipt.headline}
            </div>

            {receipt.explanation ? (
              <p style={s("font-size:12.5px;color:#6B6D76;line-height:1.6;margin:12px 0 0")}>
                {receipt.explanation}
              </p>
            ) : null}
          </div>

          <div style={s("padding:22px 30px;border-bottom:1px solid #F0F0F2")}>
            <Row label="Paid to" value={receipt.merchantName} />
            <Row label="For" value={receipt.title} />
            {receipt.description ? <Row label="Details" value={receipt.description} /> : null}
            {receipt.reference ? <Row label="Merchant reference" value={receipt.reference} mono /> : null}
            {receipt.isSplit && receipt.billTotalDisplay ? (
              <Row label="Share of bill" value={`${receipt.amountDisplay} of ${receipt.billTotalDisplay}`} />
            ) : null}
            <Row label="Date" value={formatMoment(receipt.paidAt)} last />
          </div>

          <div style={s("padding:22px 30px;border-bottom:1px solid #F0F0F2")}>
            {receipt.customerName ? <Row label="Paid by" value={receipt.customerName} /> : null}
            {receipt.customerEmail ? <Row label="Email" value={receipt.customerEmail} /> : null}
            <Row
              label="Card"
              value={
                receipt.cardLast4
                  ? `${receipt.cardBrand ?? "Card"} ····${receipt.cardLast4}`
                  : "Card details held by the gateway"
              }
              mono={!!receipt.cardLast4}
              last
            />
          </div>

          {/* The money's history. A partly refunded receipt has to explain
              itself, or the total will not match what the payer remembers. */}
          {receipt.entries.length > 1 && (
            <div style={s("padding:22px 30px;border-bottom:1px solid #F0F0F2")}>
              <div
                style={s(
                  "font-size:10.5px;color:#9A9CA5;letter-spacing:.1em;text-transform:uppercase;font-weight:600;margin-bottom:13px",
                )}
              >
                Activity
              </div>
              {receipt.entries.map((entry, i) => (
                <div
                  key={i}
                  style={s(
                    `display:flex;align-items:baseline;justify-content:space-between;gap:14px;font-size:13px${
                      i === receipt.entries.length - 1 ? "" : ";margin-bottom:11px"
                    }`,
                  )}
                >
                  <div style={s("min-width:0")}>
                    <div style={s("font-weight:600;color:#141519")}>{entry.label}</div>
                    <div style={s("font-size:11.5px;color:#9A9CA5;margin-top:2px")}>
                      {formatMoment(entry.at)}
                    </div>
                  </div>
                  <span
                    style={s("font-family:'IBM Plex Mono';font-weight:600;flex-shrink:0")}
                  >
                    {entry.amount}
                  </span>
                </div>
              ))}

              {receipt.refundedDisplay ? (
                <div
                  style={s(
                    "display:flex;justify-content:space-between;gap:14px;border-top:1px solid #F0F0F2;margin-top:14px;padding-top:13px;font-size:13.5px;font-weight:700",
                  )}
                >
                  <span>Net paid</span>
                  <span style={s("font-family:'IBM Plex Mono'")}>{receipt.netDisplay}</span>
                </div>
              ) : null}
            </div>
          )}

          <div style={s("padding:22px 30px")}>
            <div
              style={s(
                "font-size:10.5px;color:#9A9CA5;letter-spacing:.1em;text-transform:uppercase;font-weight:600;margin-bottom:13px",
              )}
            >
              Transaction references
            </div>
            <Row label="Order" value={receipt.orderId} mono />
            {receipt.gatewayReceipt ? (
              <Row label="Gateway receipt" value={receipt.gatewayReceipt} mono />
            ) : null}
            {receipt.authorizationCode ? (
              <Row label="Approval code" value={receipt.authorizationCode} mono />
            ) : null}
            {receipt.acquirerReference ? (
              <Row label="Acquirer reference" value={receipt.acquirerReference} mono />
            ) : null}
            {receipt.settlementDate ? (
              <Row label="Settlement date" value={receipt.settlementDate} mono />
            ) : null}
            <Row label="Issued" value={formatMoment(receipt.issuedAt)} last />
          </div>

          <div
            style={s(
              "background:#FAFAFB;border-top:1px solid #F0F0F2;padding:16px 30px;font-size:11px;color:#9A9CA5;line-height:1.7",
            )}
          >
            Processed securely by the Mastercard Payment Gateway. Card details are never shared
            with the merchant. Quote the gateway receipt and approval code above in any query
            about this payment.
          </div>
        </div>
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
        `display:flex;justify-content:space-between;align-items:baseline;gap:18px;font-size:13px${last ? "" : ";margin-bottom:10px"}`,
      )}
    >
      <span style={s("color:#6B6D76;flex-shrink:0")}>{label}</span>
      <span
        style={s(
          `font-weight:600;color:#141519;text-align:right;word-break:break-word${mono ? ";font-family:'IBM Plex Mono';font-size:12.5px" : ""}`,
        )}
      >
        {value}
      </span>
    </div>
  );
}
