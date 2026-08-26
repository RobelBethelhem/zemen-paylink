"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Analytics,
  type AnalyticsRange,
  type PayLink,
  type Payment,
} from "@/lib/api";

// The screens were built against the prototype's data shapes. Rather than
// rewrite them, live API records are adapted into those same shapes, so a
// screen renders identically whether it is showing demo or real data.

export type ScreenLink = {
  id: string;
  title: string;
  /** True when the link belongs to the test gateway rather than production. */
  isTest: boolean;
  type: string;
  amount: string;
  cur: string;
  status: string;
  scans: number;
  max: number | string;
  paid: string;
  paidCount: number;
  expiry: string;
  created: string;
  slug: string;
  branch: string;
  sales: string;
  lActive: boolean;
  lLimit: boolean;
  lExpired: boolean;
  lPaused: boolean;
  dyn: boolean;
  stc: boolean;
  pct: number;
  open: () => void;
  url: string;
};

export type ScreenTxn = {
  id: string;
  /** Present only on live rows; identifies the payment at the gateway. */
  orderId?: string;
  /** Gateway receipt — the reference to quote for reconciliation. */
  reference?: string;
  date: string;
  time: string;
  merchant: string;
  title: string;
  link: string;
  customer: string;
  method: string;
  last4: string;
  amount: string;
  cur: string;
  status: string;
  branch: string;
  sales: string;
  sPaid: boolean;
  sPending: boolean;
  sFailed: boolean;
  sExpired: boolean;
  sRefunded: boolean;
  mc: boolean;
  visa: boolean;
  /** Data-driven badge, so new outcomes render without new markup branches. */
  badge?: StatusBadge;
};

export type StatusBadge = {
  label: string;
  bg: string;
  fg: string;
  dot?: string;
};

// One badge per outcome, in the palette the rest of the portal already uses.
const BADGES: Record<string, StatusBadge> = {
  Paid: { label: "Paid", bg: "#E6F6EE", fg: "#12905A", dot: "#12905A" },
  Authorized: { label: "Authorized", bg: "#EAF1FB", fg: "#2C5FA8", dot: "#2C5FA8" },
  "Part captured": { label: "Part captured", bg: "#EAF1FB", fg: "#2C5FA8", dot: "#2C5FA8" },
  "Part refunded": { label: "Part refunded", bg: "#FEF3E2", fg: "#B77400", dot: "#F0A83A" },
  Refunded: { label: "Refunded", bg: "#F2F2F4", fg: "#5B5D66" },
  Pending: { label: "Pending", bg: "#FEF3E2", fg: "#B77400", dot: "#F0A83A" },
  Failed: { label: "Failed", bg: "#FDECED", fg: "#B0141C", dot: "#DA1E28" },
  Voided: { label: "Voided", bg: "#F2F2F4", fg: "#5B5D66" },
  Expired: { label: "Expired", bg: "#F2F2F4", fg: "#5B5D66" },
};

const LINK_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  expired: "Expired",
  limit_reached: "Limit reached",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  initiated: "Pending",
  authorized: "Authorized",
  partially_captured: "Part captured",
  paid: "Paid",
  partially_refunded: "Part refunded",
  refunded: "Refunded",
  failed: "Failed",
  cancelled: "Voided",
  expired: "Expired",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Badge for a display status, used by both live and demo rows. */
export function badgeFor(label: string): StatusBadge {
  return BADGES[label] ?? { label, bg: "#F2F2F4", fg: "#5B5D66" };
}

export function adaptLink(l: PayLink, onOpen: (l: PayLink) => void): ScreenLink {
  const status = LINK_STATUS_LABELS[l.effectiveStatus] ?? "Active";
  const pct =
    typeof l.maxUses === "number" && l.maxUses > 0
      ? Math.min(100, Math.round((l.paidCount / l.maxUses) * 100))
      : 42;
  return {
    id: l.id,
    title: l.title,
    isTest: l.environment !== "live",
    type: l.type === "dynamic" ? "Dynamic" : "Static",
    amount: l.amountDisplay,
    cur: l.currency,
    status,
    scans: l.usedCount,
    max: l.maxUses ?? "∞",
    paid: l.paidDisplay,
    paidCount: l.paidCount,
    expiry: l.expiresAt ? formatDate(l.expiresAt) : "—",
    created: formatDate(l.createdAt),
    slug: l.slug,
    branch: l.branchName || "—",
    sales: l.createdBy || "—",
    lActive: status === "Active",
    lLimit: status === "Limit reached",
    lExpired: status === "Expired",
    lPaused: status === "Paused" || status === "Cancelled",
    dyn: l.type === "dynamic",
    stc: l.type === "static",
    pct,
    open: () => onOpen(l),
    url: l.url,
  };
}

/**
 * How to name the person who paid.
 *
 * Hosted Checkout does not ask for a cardholder name, so a perfectly good
 * payment often arrives with no name at all. Only an attempt that never
 * finished is genuinely waiting on anybody — calling a captured payment
 * "Awaiting payer" reads as though the money never arrived.
 */
export function payerLabel(p: {
  customerName?: string;
  customerEmail?: string;
  status: string;
}): string {
  if (p.customerName) return p.customerName;
  if (p.customerEmail) return p.customerEmail;
  return p.status === "initiated" ? "Awaiting payer" : "Cardholder";
}

export function adaptPayment(p: Payment, merchantName: string, operator: string): ScreenTxn {
  const status = PAYMENT_STATUS_LABELS[p.status] ?? "Pending";
  const brand = (p.cardBrand || "").toUpperCase();
  const isVisa = brand.includes("VISA");
  return {
    id: p.id,
    orderId: p.orderId,
    reference: p.gatewayReceipt,
    date: p.date,
    time: p.time,
    merchant: merchantName,
    title: p.linkTitle || "Payment link",
    link: p.payLinkId,
    customer: payerLabel(p),
    method: isVisa ? "Visa" : "Mastercard",
    last4: p.cardLast4 || "••••",
    amount: p.amountDisplay,
    cur: p.currency,
    status,
    branch: "—",
    sales: operator,
    // Legacy flags keep the untouched demo screens rendering as before.
    sPaid: status === "Paid",
    sPending: status === "Pending",
    sFailed: status === "Failed",
    sExpired: status === "Expired",
    sRefunded: status === "Refunded",
    mc: !isVisa,
    visa: isVisa,
    badge: badgeFor(status),
  };
}

/** Loads the signed-in operator's links and payments from the API. */
export function useOperatorData(enabled: boolean) {
  const [links, setLinks] = useState<PayLink[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [l, p] = await Promise.all([api.links(), api.payments()]);
      setLinks(l.links ?? []);
      setPayments(p.payments ?? []);
    } catch {
      // Leave the last good data on screen rather than blanking it.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { links, payments, loading, reload, setLinks };
}

/**
 * An empty Go slice serialises as `null`, so every list is replaced with an
 * array before the screen touches it. One missing currency should not be able
 * to take the page down.
 */
function withLists(a: Analytics): Analytics {
  return {
    ...a,
    daily: a.daily ?? [],
    topLinks: a.topLinks ?? [],
    topOperators: a.topOperators ?? [],
    otherTotals: a.otherTotals ?? [],
  };
}

/**
 * Loads the analytics summary for the selected window. The server does the
 * arithmetic — it is the only side that can see every payment and knows which
 * of them are the caller's to see.
 */
export function useAnalytics(enabled: boolean, range: AnalyticsRange) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Captures and refunds move these figures, so the screens that perform them
  // ask for a fresh read rather than leaving a stale total on display.
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }
    // A range switch while a slower request is still in flight would otherwise
    // let the stale answer land last and win.
    let current = true;
    setLoading(true);
    api
      .analytics(range)
      .then((a) => {
        if (current) setData(withLists(a));
      })
      .catch(() => {
        // Keep the last good figures rather than showing zeroes.
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [enabled, range, nonce]);

  return { analytics: data, loading, reload };
}
