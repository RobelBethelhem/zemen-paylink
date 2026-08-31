// Typed client for the Go API. Everything the operator flow needs goes
// through here so the token handling and error shape live in one place.

// Calls go to the current origin by default and Next proxies /api/v1/* to the
// Go API (see next.config.ts). That way the portal works unchanged on
// localhost, a LAN address or a tunnel, with only one port to expose.
//
// Set NEXT_PUBLIC_API_BASE_URL to bypass the proxy and talk to the API directly.
export function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return ""; // same origin
  return "http://localhost:8080"; // server-side (not used by the browser paths)
}

import { openResponse, resetChannel, sealRequest } from "@/lib/secure";

const TOKEN_STORAGE_KEY = "zemen.paylink.token";

export type Role = "admin" | "merchant" | "sales" | "merchant_management";

export type SessionUser = {
  id: string;
  /** The login identifier. */
  username: string;
  email: string;
  /** The registered merchant this operator trades under, fixed at sign-up. */
  mpgsMerchantNumber?: string;
  mpgsMerchantName?: string;
  fullName: string;
  role: Role;
  title?: string;
  merchantId?: string;
  merchant?: string;
  branchId?: string;
  branch?: string;
  initials: string;
};

export type Session = {
  token?: string;
  expiresAt?: string;
  user: SessionUser;
  gatewayConnected: boolean;
  requiresGateway: boolean;
  /** True until the account can be recovered without an administrator. */
  requiresRecovery: boolean;
  /** The gateway this session's screens are scoped to. */
  environment: Environment;

  /**
   * The session policy, in seconds, as the server enforces it: how long this
   * session may sit untouched, and how long it may last at all. The browser
   * signs out on the same limits so nobody is left on a screen whose next
   * click will fail — the server is still the one enforcing them.
   */
  idleSeconds: number;
  lifetimeSeconds: number;
};

/** Which Mastercard gateway a profile, link or payment belongs to. */
export type Environment = "test" | "live";

export type GatewayHostOption = {
  host: string;
  label: string;
  environment: Environment;
};

/** One environment an operator has connected. */
export type GatewayConnection = {
  environment: Environment;
  active: boolean;
  connected: boolean;
  gatewayHost: string;
  mpgsMerchantId: string;
  merchantName: string;
  apiVersion: string;
  apiPasswordMasked?: string;
  verifiedAt?: string;
};

export type SecurityQuestion = { position: number; prompt: string };

export type SecurityStatus = {
  configured: boolean;
  questions: SecurityQuestion[];
  /** The fixed set to choose from — no free text, see the API for why. */
  prompts: string[];
  required: number;
};

export type RecoveryChallenge = {
  username: string;
  questions: SecurityQuestion[];
};

export type RegisterResult = {
  username: string;
  merchantNumber: string;
  merchantName: string;
  message: string;
};

/** One entry in the register merchant management keeps. */
export type RegisteredMerchant = {
  number: string;
  name: string;
  liveNumber?: string;
  operators: number;
  createdAt: string;
};

export type GatewayCredentials = {
  // The active connection, flattened for convenience.
  connected: boolean;
  environment: Environment;
  gatewayHost: string;
  mpgsMerchantId: string;
  merchantName: string;
  apiVersion: string;
  apiPasswordMasked?: string;
  verifiedAt?: string;
  /** Test and live, where connected. An operator may hold both. */
  connections: GatewayConnection[];
  /** Fixed at registration and shown rather than asked for. */
  registeredMerchantNumber?: string;
  registeredMerchantName?: string;
  registeredLiveNumber?: string;
  defaultGatewayHost: string;
  defaultApiVersion: string;
  knownHosts: GatewayHostOption[];
};

export type PayLink = {
  id: string;
  slug: string;
  /** Fixed at creation; every payment against this link uses that gateway. */
  environment: Environment;
  title: string;
  description?: string;
  reference?: string;
  type: "static" | "dynamic" | "split";
  amountMinor: number;
  targetMinor: number;
  currency: string;
  minMinor?: number;
  maxMinor?: number;
  maxUses: number | null;
  usedCount: number;
  paidCount: number;
  paidMinor: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  merchantName?: string;
  createdBy?: string;
  branchName?: string;
  url: string;
  shareUrl: string;
  amountDisplay: string;
  paidDisplay: string;
  effectiveStatus: string;
  maxUsesLabel: string;
  expiryLabel: string;
  isSplit: boolean;
  targetDisplay?: string;
  remainingMinor: number;
  remainingDisplay?: string;
  percentPaid: number;
};

export type Payment = {
  id: string;
  payLinkId: string;
  orderId: string;
  /** Inherited from the link — which gateway actually moved this money. */
  environment: Environment;
  amountMinor: number;
  currency: string;
  authorizedMinor: number;
  capturedMinor: number;
  refundedMinor: number;
  status: string;
  customerName?: string;
  customerEmail?: string;
  cardBrand?: string;
  cardLast4?: string;
  gatewayReceipt?: string;
  authorizationCode?: string;
  acquirerReference?: string;
  settlementDate?: string;
  createdAt: string;
  completedAt?: string;
  linkTitle?: string;
  createdBy?: string;
  amountDisplay: string;
  date: string;
  time: string;
};

export type Contributor = {
  name: string;
  amountDisplay: string;
  cardBrand?: string;
  cardLast4?: string;
  paidAt: string;
};

export type LinkSummary = {
  attempts: number;
  paid: number;
  authorized: number;
  pending: number;
  failed: number;
  abandoned: number;
  refunded: number;
  collectedMinor: number;
  collectedDisplay: string;
  heldMinor: number;
  heldDisplay: string;
  refundedMinor: number;
  refundedDisplay: string;
};

export type PaymentOperation = {
  id: string;
  transactionId: string;
  type: "capture" | "refund" | "void";
  amountMinor: number;
  currency: string;
  status: string;
  gatewayCode?: string;
  detail?: string;
  performedBy?: string;
  amountDisplay: string;
  at: string;
};

/** A payment plus where its money stands and what can still be done to it. */
export type PaymentDetail = Payment & {
  authorizedDisplay: string;
  capturedDisplay: string;
  refundedDisplay: string;
  netDisplay: string;
  capturableMinor: number;
  capturableDisplay: string;
  refundableMinor: number;
  refundableDisplay: string;
  canCapture: boolean;
  canRefund: boolean;
  canVoid: boolean;
  operations: PaymentOperation[];
  link?: { id: string; title: string; paymentMode: string };
};

export type PublicLink = {
  slug: string;
  title: string;
  description?: string;
  reference?: string;
  merchantName: string;
  branchName?: string;
  type: "static" | "dynamic";
  /** True when the link belongs to the test gateway — shown to the payer. */
  isTest: boolean;
  currency: string;
  amountMinor: number;
  amountDisplay: string;
  minMinor?: number;
  maxMinor?: number;
  status: string;
  payable: boolean;
  unavailable?: string;
  expiresAt?: string;
  isSplit: boolean;
  targetMinor: number;
  targetDisplay?: string;
  paidMinor: number;
  paidDisplay?: string;
  remainingMinor: number;
  remainingDisplay?: string;
  percentPaid: number;
  contributorCount: number;
};

export type CheckoutSession = {
  orderId: string;
  sessionId: string;
  sessionVersion: string;
  successIndicator: string;
  gatewayHost: string;
  checkoutScript: string;
  amountDisplay: string;
  currency: string;
  merchantName: string;
  returnUrl: string;
};

export type PaymentStatus = {
  orderId: string;
  status: string;
  amountDisplay: string;
  currency: string;
  linkTitle: string;
  merchantName: string;
  cardBrand?: string;
  cardLast4?: string;
  gatewayStatus?: string;
  completedAt?: string;
  receipt?: string;
};

/** ApiError carries the server's own message so screens can show it verbatim. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string) {
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  anonymous?: boolean;
};

// Codes the server uses to say "your channel is gone" — a restart clears every
// one of them, so a single silent re-handshake and retry is the right answer
// rather than surfacing a failure the user can do nothing about.
const CHANNEL_GONE = new Set(["secure_channel_required", "secure_channel_expired", "secure_stale"]);

async function attempt<T>(
  path: string,
  options: RequestOptions,
  renew: boolean,
): Promise<{ ok: true; value: T } | { ok: false; error: ApiError }> {
  const { method = "GET", body, anonymous } = options;
  const base = apiBase();

  if (renew) resetChannel();

  let sealed;
  try {
    sealed = await sealRequest(base, method, path, body);
  } catch (err) {
    return {
      ok: false,
      error: new ApiError(
        0,
        err instanceof Error ? err.message : "Could not open a secure channel.",
        "secure_channel_required",
      ),
    };
  }

  const headers: Record<string, string> = { ...sealed.headers };
  const token = anonymous ? null : tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(base + path, { method, headers, body: sealed.body });
  } catch {
    return {
      ok: false,
      error: new ApiError(0, "Could not reach the PayLink service. Is the API running?"),
    };
  }

  if (response.status === 204) return { ok: true, value: undefined as T };

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    // A sealed reply has to be opened first; anything else — an error raised
    // before a channel existed — is already plain.
    if (response.headers.get("X-PL-Sealed") === "1") {
      try {
        payload = JSON.parse(await openResponse(raw, sealed.headers["X-PL-Nonce"]));
      } catch {
        return {
          ok: false,
          error: new ApiError(response.status, "The reply from the service could not be opened."),
        };
      }
    } else {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
  }

  if (!response.ok) {
    const detail = payload as { error?: string; code?: string } | null;
    return {
      ok: false,
      error: new ApiError(
        response.status,
        detail?.error ?? `Request failed (HTTP ${response.status}).`,
        detail?.code,
      ),
    };
  }
  return { ok: true, value: payload as T };
}

/**
 * Notified when the server refuses a credentialled call outright.
 *
 * The session provider registers here so a session ended elsewhere — its time
 * up, or taken over by a sign-in on another device — closes the portal once,
 * in one place, instead of every caller having to notice a 401 for itself.
 */
let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function noteRejection(error: ApiError, options: RequestOptions) {
  // A failed sign-in is a 401 too, and it must not be read as a session ending.
  if (error.status === 401 && !options.anonymous) unauthorizedHandler?.();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const first = await attempt<T>(path, options, false);
  if (first.ok) return first.value;

  if (first.error.code && CHANNEL_GONE.has(first.error.code)) {
    const retried = await attempt<T>(path, options, true);
    if (retried.ok) return retried.value;
    noteRejection(retried.error, options);
    throw retried.error;
  }
  noteRejection(first.error, options);
  throw first.error;
}

export type CreateLinkInput = {
  title: string;
  description?: string;
  reference?: string;
  type: "static" | "dynamic" | "split";
  /** Bill total on a split link. */
  target?: string;
  /** purchase takes the money at checkout; authorize only reserves it. */
  paymentMode?: "purchase" | "authorize";
  amount?: string;
  currency: string;
  min?: string;
  max?: string;
  maxUses?: number | null;
  expiresAt?: string;
  branchId?: string;
};

export type AnalyticsRange = "7d" | "30d" | "90d" | "ytd";

export type StatPoint = {
  day: string;
  label: string;
  minor: number;
  display: string;
  count: number;
};

export type RankedItem = {
  id: string;
  name: string;
  initials?: string;
  minor: number;
  display: string;
  count: number;
  /** Share of the leader's takings, for the bar width. */
  percent: number;
};

export type CurrencyLine = {
  currency: string;
  minor: number;
  display: string;
  count: number;
};

/**
 * Figures are reported in one currency — the busiest one. Anything taken in
 * another currency is listed in `otherTotals` rather than folded in, because
 * adding them would need an FX rate we do not have.
 */
export type Analytics = {
  range: AnalyticsRange;
  currency: string;
  /** Which gateway these figures came from. Test money is never real money. */
  environment: Environment;
  /** How the daily series is grouped — longer ranges group up to stay readable. */
  bucket: "day" | "week" | "month";
  collectedDisplay: string;
  collectedMinor: number;
  /** null when the preceding window has nothing to compare against. */
  collectedChange: number | null;
  successfulCount: number;
  successfulChange: number | null;
  successRate: number;
  failedCount: number;
  refundedCount: number;
  pendingCount: number;
  /** Checkouts opened and never finished. */
  abandonedCount: number;
  attempts: number;
  avgTicketDisplay: string;
  daily: StatPoint[];
  topLinks: RankedItem[];
  topOperators: RankedItem[];
  otherTotals: CurrencyLine[];
  hasData: boolean;
};

export type ReceiptEntry = {
  label: string;
  amount: string;
  at: string;
  note?: string;
};

/**
 * The payer's proof of what happened to their money. Deliberately not a
 * "confirmation": an uncaptured authorization says so, and a refund shows on
 * the same document rather than leaving an overstated receipt in circulation.
 */
export type Receipt = {
  number: string;
  orderId: string;
  issuedAt: string;
  status: string;
  headline: string;
  explanation: string;
  /** False when nothing has actually left the cardholder's account. */
  settled: boolean;
  currency: string;
  amountDisplay: string;
  authorizedDisplay?: string;
  capturedDisplay?: string;
  refundedDisplay?: string;
  netDisplay: string;
  title: string;
  description?: string;
  reference?: string;
  /**
   * The name on the MPGS merchant profile the money went through — the same
   * name the payer saw on the Mastercard checkout page, not our workspace label.
   */
  merchantName: string;
  customerName?: string;
  customerEmail?: string;
  cardBrand?: string;
  cardLast4?: string;
  gatewayReceipt?: string;
  authorizationCode?: string;
  acquirerReference?: string;
  settlementDate?: string;
  paidAt?: string;
  isSplit: boolean;
  billTotalDisplay?: string;
  entries: ReceiptEntry[];
  isTest: boolean;
};

export type ShareChannel = "email" | "sms" | "whatsapp" | "copy" | "qr" | "other";

export type ShareResult = {
  channel: ShareChannel;
  url: string;
  message: string;
  delivered: boolean;
  shareUrl?: string;
  note?: string;
};

export const api = {
  /**
   * force answers a `session_active` refusal: sign the other session out and
   * take the account over. The server only acts on it once the password has
   * been proved, so it grants nothing an ordinary sign-in would not.
   */
  login: (username: string, password: string, force = false) =>
    request<Session>("/api/v1/auth/login", {
      method: "POST",
      body: force ? { username, password, force } : { username, password },
      anonymous: true,
    }),

  // Operators register themselves; the merchant number is what gates it. No
  // session is issued — they sign in afterwards.
  register: (input: {
    username: string;
    password: string;
    confirmPassword: string;
    merchantNumber: string;
    fullName?: string;
  }) =>
    request<RegisterResult>("/api/v1/auth/register", {
      method: "POST",
      body: input,
      anonymous: true,
    }),

  // Ends the session server-side. Dropping the local token is not signing out.
  logout: () => request<{ signedOut: boolean }>("/api/v1/auth/logout", { method: "POST" }),

  securityQuestions: () => request<SecurityStatus>("/api/v1/auth/security-questions"),

  setSecurityQuestions: (input: {
    currentPassword: string;
    questions: { prompt: string; answer: string }[];
  }) =>
    request<SecurityStatus>("/api/v1/auth/security-questions", { method: "PUT", body: input }),

  // Answered for every username, real or not — see the API for why.
  recoveryChallenge: (username: string) =>
    request<RecoveryChallenge>(`/api/v1/auth/recovery/${encodeURIComponent(username)}`, {
      anonymous: true,
    }),

  // Answers and the new password go together in one call, so no reset ticket
  // ever exists to be intercepted.
  recover: (input: {
    username: string;
    answers: string[];
    newPassword: string;
    confirmPassword: string;
  }) =>
    request<{ recovered: boolean; message: string }>("/api/v1/auth/recovery", {
      method: "POST",
      body: input,
      anonymous: true,
    }),

  merchantRegister: () =>
    request<{ merchants: RegisteredMerchant[] }>("/api/v1/merchant-register"),

  registerMerchant: (input: { number: string; name: string; liveNumber?: string }) =>
    request<{ merchants: RegisteredMerchant[] }>("/api/v1/merchant-register", {
      method: "POST",
      body: input,
    }),

  me: () => request<Session>("/api/v1/auth/me"),

  invite: (token: string) =>
    request<{ email: string; fullName: string; role: Role; merchant: string }>(
      `/api/v1/auth/invite/${encodeURIComponent(token)}`,
      { anonymous: true },
    ),

  activate: (token: string, password: string) =>
    request<Session>("/api/v1/auth/activate", {
      method: "POST",
      body: { token, password },
      anonymous: true,
    }),

  gatewayCredentials: () => request<GatewayCredentials>("/api/v1/gateway/credentials"),

  // The merchant number and name are not sent: both come from the register.
  saveGatewayCredentials: (input: {
    environment: Environment;
    gatewayHost: string;
    apiVersion?: string;
    apiPassword: string;
  }) =>
    request<GatewayCredentials>("/api/v1/gateway/credentials", {
      method: "PUT",
      body: input,
    }),

  // Switches between connections the operator already holds. Links and payments
  // made in the other environment stay where they are.
  setEnvironment: (environment: Environment) =>
    request<GatewayCredentials>("/api/v1/gateway/environment", {
      method: "POST",
      body: { environment },
    }),

  disconnectGateway: (environment?: Environment) =>
    request<GatewayCredentials>(
      `/api/v1/gateway/credentials${environment ? `?environment=${environment}` : ""}`,
      { method: "DELETE" },
    ),

  links: () => request<{ links: PayLink[] }>("/api/v1/links"),

  // `force` bypasses the server's re-check throttle, for an explicit refresh.
  link: (id: string, force = false) =>
    request<{ link: PayLink; payments: Payment[]; summary: LinkSummary; contributors: Contributor[] }>(
      `/api/v1/links/${encodeURIComponent(id)}${force ? "?force=1" : ""}`,
    ),

  createLink: (input: CreateLinkInput) =>
    request<PayLink>("/api/v1/links", { method: "POST", body: input }),

  setLinkStatus: (id: string, status: "active" | "paused" | "cancelled") =>
    request<PayLink>(`/api/v1/links/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: { status },
    }),

  shareLink: (id: string, channel: ShareChannel, to?: string, message?: string) =>
    request<ShareResult>(`/api/v1/links/${encodeURIComponent(id)}/share`, {
      method: "POST",
      body: { channel, to: to ?? "", message: message ?? "" },
    }),

  payments: () => request<{ payments: Payment[] }>("/api/v1/payments"),

  analytics: (range: AnalyticsRange) =>
    request<Analytics>(`/api/v1/analytics?range=${range}`),

  payment: (orderId: string) =>
    request<PaymentDetail>(`/api/v1/payments/${encodeURIComponent(orderId)}`),

  // Money movement. An omitted amount means the whole remaining balance.
  capture: (orderId: string, amount?: string) =>
    request<PaymentDetail>(`/api/v1/payments/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      body: { amount: amount ?? "" },
    }),

  refund: (orderId: string, amount?: string) =>
    request<PaymentDetail>(`/api/v1/payments/${encodeURIComponent(orderId)}/refund`, {
      method: "POST",
      body: { amount: amount ?? "" },
    }),

  voidPayment: (orderId: string) =>
    request<PaymentDetail>(`/api/v1/payments/${encodeURIComponent(orderId)}/void`, {
      method: "POST",
      body: {},
    }),

  team: () => request<{ team: unknown[] }>("/api/v1/team"),

  branches: () => request<{ branches: { id: string; name: string }[] }>("/api/v1/branches"),

  // --- payer-facing, no session -------------------------------------------
  publicLink: (slug: string) =>
    request<PublicLink>(`/api/v1/public/links/${encodeURIComponent(slug)}`, { anonymous: true }),

  startCheckout: (
    slug: string,
    input: { amount?: string; customerName?: string; customerEmail?: string } = {},
  ) =>
    request<CheckoutSession>(`/api/v1/public/links/${encodeURIComponent(slug)}/checkout`, {
      method: "POST",
      body: input,
      anonymous: true,
    }),

  paymentStatus: (orderId: string) =>
    request<PaymentStatus>(`/api/v1/public/payments/${encodeURIComponent(orderId)}`, {
      anonymous: true,
    }),

  receipt: (orderId: string) =>
    request<Receipt>(`/api/v1/public/receipts/${encodeURIComponent(orderId)}`, {
      anonymous: true,
    }),
};
