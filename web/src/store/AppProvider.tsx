"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  allTxns,
  branches as branchData,
  links as linkData,
  merchants as merchantData,
  team as teamData,
  type LinkStatus,
  type MerchantStatus,
  type TxnStatus,
} from "@/store/data";
import {
  ApiError,
  api,
  type Contributor,
  type LinkSummary,
  type PayLink as ApiPayLink,
  type Payment as ApiPayment,
} from "@/lib/api";

type LinkDetailResponse = {
  link: ApiPayLink;
  payments: ApiPayment[];
  summary: LinkSummary;
  contributors: Contributor[];
};
import { useSession } from "@/store/SessionProvider";
import { adaptLink, adaptPayment, badgeFor, useAnalytics, useOperatorData } from "@/store/live";

export type Role = "admin" | "merchant" | "sales" | "merchant_management";

export type View =
  | "login"
  | "register"
  | "forgot-password"
  | "security-questions"
  | "merchant-register"
  | "activate"
  | "otp"
  | "pay"
  | "connect-gateway"
  | "admin-dashboard"
  | "admin-merchants"
  | "admin-merchant-detail"
  | "admin-create-merchant"
  | "admin-transactions"
  | "admin-settings"
  | "merchant-dashboard"
  | "merchant-create-link"
  | "merchant-link-created"
  | "merchant-links"
  | "merchant-link-detail"
  | "merchant-transactions"
  | "merchant-branches"
  | "merchant-create-branch"
  | "merchant-sales"
  | "merchant-create-team"
  | "merchant-settings"
  | "sales-dashboard"
  | "sales-create-link"
  | "sales-links"
  | "sales-transactions";

type NewLink = {
  id: string;
  title: string;
  type: "Static" | "Dynamic";
  amount: string;
  cur: string;
  max: number | string;
  expiry: string;
  slug: string;
};

type State = {
  view: View;
  role: Role;
  layout: "sidebar" | "topnav";
  createMode: "wizard" | "quick";
  wizardStep: number;
  linkType: "static" | "dynamic" | "split";
  splitTarget: string;
  // purchase charges at checkout; authorize reserves the funds for later capture.
  paymentMode: "purchase" | "authorize";
  payVariant: "card" | "minimal";
  filterStatus: "all" | TxnStatus;
  search: string;
  dateRange: "7d" | "30d" | "90d" | "YTD";
  sidebarOpen: boolean;
  generating: boolean;
  copied: boolean;
  redirecting: boolean;
  email: string;
  password: string;
  amount: string;
  currency: string;
  title: string;
  reference: string;
  maxScans: string;
  expiry: string;
  oneTime: boolean;
  dynMin: string;
  dynMax: string;
  branchName: string;
  branchCode: string;
  branchCity: string;
  branchArea: string;
  branchMgr: string;
  branchMgrEmail: string;
  branchMgrPhone: string;
  teamFullName: string;
  teamEmail: string;
  teamPhone: string;
  teamBranch: string;
  teamRole: string;
  newLink: NewLink | null;
  activeLinkId: string;
  activeMerchantId: string;
};

const initialState: State = {
  view: "login",
  role: "merchant",
  layout: "sidebar",
  createMode: "wizard",
  wizardStep: 1,
  linkType: "static",
  splitTarget: "",
  paymentMode: "purchase",
  payVariant: "card",
  filterStatus: "all",
  search: "",
  dateRange: "30d",
  sidebarOpen: false,
  generating: false,
  copied: false,
  redirecting: false,
  email: "",
  password: "",
  amount: "",
  currency: "USD",
  title: "",
  reference: "",
  maxScans: "",
  expiry: "",
  oneTime: false,
  dynMin: "",
  dynMax: "",
  branchName: "",
  branchCode: "",
  branchCity: "",
  branchArea: "",
  branchMgr: "",
  branchMgrEmail: "",
  branchMgrPhone: "",
  teamFullName: "",
  teamEmail: "",
  teamPhone: "",
  teamBranch: "",
  teamRole: "Sales agent",
  newLink: null,
  activeLinkId: "PL-3391",
  activeMerchantId: "MER-1042",
};

// ------------------------------------------------------- create-link form

/**
 * The create-link form, blank.
 *
 * Opening the form used to set only the wizard step and the type, leaving the
 * title, amount, reference, expiry and scan limit from the last link still in
 * their boxes — so the second link an operator made started as a half-filled
 * copy of the first.
 *
 * Derived from initialState rather than restated, so a field added to the form
 * with an initial value is cleared here automatically instead of being
 * forgotten.
 *
 * currency is deliberately not reset. It is a setting rather than something
 * typed for one link, and an operator who works in ETB should not have to
 * choose it every time — forgetting once would price a link in the wrong
 * currency, which is a worse failure than a dropdown that remembers.
 */
const BLANK_LINK_FORM = {
  wizardStep: initialState.wizardStep,
  linkType: initialState.linkType,
  paymentMode: initialState.paymentMode,
  amount: initialState.amount,
  title: initialState.title,
  reference: initialState.reference,
  maxScans: initialState.maxScans,
  expiry: initialState.expiry,
  oneTime: initialState.oneTime,
  dynMin: initialState.dynMin,
  dynMax: initialState.dynMax,
  splitTarget: initialState.splitTarget,
} satisfies Partial<State>;

/**
 * The amount fields that do not belong to a link type.
 *
 * This mirrors the branching in the API's create handler exactly — static
 * reads amount, dynamic reads min and max, split reads target and min — so a
 * value the server would ignore is not left sitting on screen where it reads
 * as part of the link being built.
 */
function staleAmounts(type: State["linkType"]): Partial<State> {
  switch (type) {
    case "static":
      return { dynMin: "", dynMax: "", splitTarget: "" };
    case "dynamic":
      return { amount: "", splitTarget: "" };
    case "split":
      return { amount: "", dynMax: "" };
  }
}

// ------------------------------------------------------------ style helpers

const lseg = (active: boolean): CSSProperties =>
  active
    ? { flex: 1, padding: "11px", border: "1.5px solid #DA1E28", borderRadius: "10px", background: "#FDECED", color: "#B0141C", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }
    : { flex: 1, padding: "11px", border: "1.5px solid #E3E3E6", borderRadius: "10px", background: "#fff", color: "#6B6D76", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

const chip = (active: boolean): CSSProperties =>
  active
    ? { padding: "6px 12px", borderRadius: "8px", border: "1px solid #DA1E28", background: "#FDECED", color: "#B0141C", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }
    : { padding: "6px 12px", borderRadius: "8px", border: "1px solid #E7E7EA", background: "#fff", color: "#6B6D76", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

const initials = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const badge = (s: TxnStatus) => ({
  sPaid: s === "Paid",
  sPending: s === "Pending",
  sFailed: s === "Failed",
  sExpired: s === "Expired",
  sRefunded: s === "Refunded",
});

const lstat = (s: LinkStatus) => ({
  lActive: s === "Active",
  lLimit: s === "Limit reached",
  lExpired: s === "Expired",
  lPaused: s === "Paused",
});

const mstat = (s: MerchantStatus) => ({
  mActive: s === "Active",
  mPending: s === "Pending",
  mSuspended: s === "Suspended",
});

const scrollTop = () => {
  if (typeof window !== "undefined") window.scrollTo(0, 0);
};

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

// --------------------------------------------------------------- the store

function useAppValue() {
  const [S, setS] = useState<State>(initialState);
  const patch = (p: Partial<State>) => setS((prev) => ({ ...prev, ...p }));

  // When a real operator is signed in, their screens read the API instead of
  // the demo dataset. Other roles keep the prototype data for now.
  const { session, signOut, signIn: sessionSignIn } = useSession();
  const live = session?.user.role === "sales";
  const operator = useOperatorData(!!live);
  const {
    analytics,
    loading: analyticsLoading,
    reload: reloadAnalytics,
  } = useAnalytics(!!live, S.dateRange === "YTD" ? "ytd" : S.dateRange);
  const [createdLink, setCreatedLink] = useState<ApiPayLink | null>(null);
  const [linkDetail, setLinkDetail] = useState<LinkDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Every route into the create-link form goes through here, so a new link can
  // never open showing the previous one's values.
  const startNewLink = (view: View) => {
    setCreateError("");
    patch(BLANK_LINK_FORM);
    go(view);
  };

  // Changing the type discards the amounts belonging to the type being left.
  // Without this, switching static -> dynamic kept the fixed amount, and
  // switching back showed a figure the operator had already abandoned.
  const selectLinkType = (linkType: State["linkType"]) => {
    setCreateError("");
    patch({ linkType, ...staleAmounts(linkType) });
  };

  const [shareNotice, setShareNotice] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Self-registration. Kept here rather than in the screen so the sign-in form
  // can be prefilled with the username that was just created.
  const [reg, setReg] = useState({
    username: "",
    password: "",
    confirm: "",
    merchantNumber: "",
    fullName: "",
  });
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState("");
  const [regDone, setRegDone] = useState("");

  // Same escape hatch the prototype exposed, so any screen can be jumped to
  // from the console while demoing. Stripped from production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __pay?: unknown }).__pay = {
      state: S,
      setState: patch,
    };
  });

  const go = (view: View) => {
    patch({ view, sidebarOpen: false });
    scrollTop();
  };

  // The portal serves operators and merchant management. Admin and merchant
  // workspaces are not offered, so no role resolves to one of their screens.
  const homeFor = (role: Role): View =>
    role === "merchant_management" ? "merchant-register" : "sales-dashboard";

  // Setting up recovery after a password is lost is impossible, so it is asked
  // for on the way in rather than left as a settings page nobody opens.
  const gateFor = (needsGateway: boolean, needsRecovery: boolean, role: Role): View => {
    if (needsGateway) return "connect-gateway";
    if (needsRecovery) return "security-questions";
    return homeFor(role);
  };

  const setRole = (role: Role) => {
    patch({ role, view: homeFor(role), sidebarOpen: false, wizardStep: 1 });
    scrollTop();
  };

  // A session restored from storage (page reload) has to land on the right
  // screen rather than the login form. Keyed by user id so it runs once per
  // sign-in and does not fight the prototype switcher afterwards.
  const routedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!session) {
      routedFor.current = null;
      return;
    }
    if (routedFor.current === session.user.id) return;
    routedFor.current = session.user.id;
    setS((prev) => ({
      ...prev,
      role: session.user.role,
      view: gateFor(session.requiresGateway, session.requiresRecovery, session.user.role),
    }));
  }, [session]);

  // Self-registration. The merchant number is checked server-side against the
  // register, so a wrong one fails here rather than at the gateway later.
  const registerOperator = async () => {
    setRegError("");
    if (reg.password !== reg.confirm) {
      setRegError("Those passwords do not match.");
      return;
    }
    setRegBusy(true);
    try {
      const result = await api.register({
        username: reg.username.trim(),
        password: reg.password,
        confirmPassword: reg.confirm,
        merchantNumber: reg.merchantNumber.trim(),
        fullName: reg.fullName.trim(),
      });
      // Straight to sign-in with the username already filled in: registering
      // does not sign anyone in, and retyping it is a needless stumble.
      setRegDone(`Account created for ${result.merchantName}. Sign in to continue.`);
      setReg({ username: "", password: "", confirm: "", merchantNumber: "", fullName: "" });
      patch({ view: "login", email: result.username, password: "" });
      scrollTop();
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Could not create this account.");
    } finally {
      setRegBusy(false);
    }
  };

  // Real authentication. An operator with no gateway credentials yet is sent
  // straight to the connect screen, because nothing else is usable until then.
  const signInLive = async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      const next = await sessionSignIn(S.email.trim(), S.password);
      const home: View = gateFor(next.requiresGateway, next.requiresRecovery, next.user.role);
      patch({ role: next.user.role, view: home, password: "", sidebarOpen: false });
      scrollTop();
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "Could not sign in right now.");
    } finally {
      setAuthBusy(false);
    }
  };

  // A signed-in operator creates a real link through the API; the gateway
  // credentials attached to their account are what will settle the payment.
  const generateLive = async () => {
    patch({ generating: true });
    setCreateError("");
    try {
      const created = await api.createLink({
        title: S.title || "Untitled payment link",
        reference: S.reference,
        type: S.linkType,
        target: S.splitTarget,
        paymentMode: S.paymentMode,
        amount: S.amount,
        currency: S.currency,
        min: S.dynMin,
        max: S.dynMax,
        maxUses: S.oneTime ? 1 : S.maxScans ? Number(S.maxScans) : null,
        expiresAt: S.expiry,
      });
      setCreatedLink(created);
      void operator.reload();
      patch({ generating: false, view: "merchant-link-created" });
      scrollTop();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not create the payment link.";
      setCreateError(message);
      patch({ generating: false });
      // A missing gateway connection is recoverable: send them to set it up.
      if (err instanceof ApiError && err.code === "gateway_required") {
        patch({ view: "connect-gateway" });
      }
    }
  };

  const generate = () => {
    if (live) {
      void generateLive();
      return;
    }
    patch({ generating: true });
    const cur = S.currency;
    const sym = cur === "USD" ? "$" : cur === "ETB" ? "Br " : cur + " ";
    const amt =
      S.linkType === "dynamic"
        ? "Customer enters"
        : S.amount
          ? sym + S.amount
          : sym + "0.00";
    const nl: NewLink = {
      id: "PL-" + Math.floor(3400 + Math.random() * 99),
      title: S.title || "Untitled payment link",
      type: S.linkType === "dynamic" ? "Dynamic" : "Static",
      amount: amt,
      cur,
      max: S.maxScans || "∞",
      expiry: S.expiry || "—",
      slug: Math.random().toString(36).slice(2, 8),
    };
    setTimeout(
      () => patch({ generating: false, newLink: nl, view: "merchant-link-created" }),
      1500,
    );
  };

  // The shareable URL: a real one once a link has actually been created.
  const shareURL = createdLink
    ? createdLink.url
    : "https://pay.zemenbank.com/l/" + (S.newLink?.slug || "3f9Ka2");

  const copy = () => {
    try {
      navigator.clipboard?.writeText(shareURL);
    } catch {
      /* clipboard unavailable — the prototype swallows this too */
    }
    patch({ copied: true });
    setTimeout(() => patch({ copied: false }), 1900);
  };

  // Share actions. SMS and WhatsApp are deep links the browser opens; email is
  // delivered by the API. Each one is also recorded server-side for audit.
  const share = async (channel: "email" | "sms" | "whatsapp" | "other") => {
    if (!createdLink) {
      // Demo mode: fall back to the platform share sheet or the clipboard.
      if (channel === "other" && navigator.share) {
        try {
          await navigator.share({ title: "Payment link", url: shareURL });
        } catch {
          /* dismissed */
        }
        return;
      }
      copy();
      return;
    }

    if (channel === "other") {
      if (navigator.share) {
        try {
          await navigator.share({ title: createdLink.title, url: shareURL });
          await api.shareLink(createdLink.id, "other");
        } catch {
          /* dismissed by the user */
        }
      } else {
        copy();
      }
      return;
    }

    const to =
      channel === "email"
        ? window.prompt("Send this payment link to which email address?")
        : window.prompt("Send to which phone number? (include country code)", "+251");
    if (to === null) return;

    try {
      const result = await api.shareLink(createdLink.id, channel, to);
      if (result.shareUrl) {
        window.open(result.shareUrl, "_blank", "noopener");
        return;
      }
      setShareNotice(
        result.delivered
          ? `Payment link sent to ${to}.`
          : (result.note ?? `Recorded. Email delivery is not configured on this server.`),
      );
      setTimeout(() => setShareNotice(""), 5000);
    } catch (err) {
      setShareNotice(err instanceof ApiError ? err.message : "Could not share the link.");
      setTimeout(() => setShareNotice(""), 5000);
    }
  };

  const otpNext = (e: FormEvent<HTMLInputElement>) => {
    const t = e.target as HTMLInputElement;
    if (t.value.length >= 1 && t.nextElementSibling) {
      (t.nextElementSibling as HTMLElement).focus();
    }
  };

  // ---------------------------------------------------------- derived state

  const v = S.view;
  const role = S.role;
  const isDash =
    v.startsWith("admin-") || v.startsWith("merchant-") || v.startsWith("sales-");

  const on = {
    roleAdmin: () => setRole("admin"),
    roleMerchant: () => setRole("merchant"),
    roleSales: () => setRole("sales"),
    goLogin: () => go("login"),
    goActivate: () => go("activate"),
    goOtp: () => go("otp"),
    signIn: () => void signInLive(),
    verify: () => setRole(role),
    goPay: () => go("pay"),
    otpNext,
    logout: () => {
      signOut();
      setCreatedLink(null);
      go("login");
    },
    connectGateway: () => go("connect-gateway"),
    securityQuestions: () => go("security-questions"),
    goForgotPassword: () => go("forgot-password"),
    // A reset leaves every session ended, so the only place to go is sign-in.
    recovered: () => {
      setAuthError("");
      setRegDone("Your password has been changed. Sign in with it now.");
      patch({ view: "login", password: "" });
      scrollTop();
    },
    goRegister: () => {
      setRegError("");
      setRegDone("");
      go("register");
    },
    register: () => void registerOperator(),
    refreshLink: () => {
      const id = linkDetail?.link.id ?? createdLink?.id;
      if (id) void loadLinkDetail(id, true);
    },
    togglePause: () => {
      const target = linkDetail?.link ?? createdLink;
      if (!target) return;
      const next = target.status === "paused" ? "active" : "paused";
      void (async () => {
        try {
          await api.setLinkStatus(target.id, next);
          await loadLinkDetail(target.id, false);
        } catch (err) {
          setShareNotice(
            err instanceof ApiError ? err.message : "Could not update the link.",
          );
          setTimeout(() => setShareNotice(""), 4000);
        }
      })();
    },
    shareEmail: () => void share("email"),
    shareSms: () => void share("sms"),
    shareWhatsApp: () => void share("whatsapp"),
    shareMore: () => void share("other"),
    openSidebar: () => patch({ sidebarOpen: true }),
    closeSidebar: () => patch({ sidebarOpen: false }),
    layoutSidebar: () => patch({ layout: "sidebar" }),
    layoutTopnav: () => patch({ layout: "topnav" }),
    modeWizard: () => patch({ createMode: "wizard", wizardStep: 1 }),
    modeQuick: () => patch({ createMode: "quick" }),
    // dashboard nav
    adminDash: () => go("admin-dashboard"),
    adminMerchants: () => go("admin-merchants"),
    adminTxns: () => go("admin-transactions"),
    adminSettings: () => go("admin-settings"),
    adminCreateMerchant: () => go("admin-create-merchant"),
    merchDash: () => go("merchant-dashboard"),
    merchCreate: () => startNewLink("merchant-create-link"),
    merchLinks: () => go("merchant-links"),
    merchTxns: () => go("merchant-transactions"),
    merchBranches: () => go("merchant-branches"),
    merchTeam: () => go("merchant-sales"),
    merchSettings: () => go("merchant-settings"),
    merchAddBranch: () => {
      patch({ wizardStep: 1 });
      go("merchant-create-branch");
    },
    merchInviteTeam: () => {
      patch({ wizardStep: 1 });
      go("merchant-create-team");
    },
    createBranchDone: () => {
      patch({ wizardStep: 1 });
      go("merchant-branches");
    },
    createTeamDone: () => {
      patch({ wizardStep: 1 });
      go("merchant-sales");
    },
    salesDash: () => go("sales-dashboard"),
    salesCreate: () => startNewLink("sales-create-link"),
    salesLinks: () => go("sales-links"),
    salesTxns: () => go("sales-transactions"),
    // wizard
    typeStatic: () => selectLinkType("static"),
    typeDynamic: () => selectLinkType("dynamic"),
    typeSplit: () => selectLinkType("split"),
    modeCharge: () => patch({ paymentMode: "purchase" }),
    modeReserve: () => patch({ paymentMode: "authorize" }),
    wizNext: () =>
      setS((prev) => {
        const max =
          prev.view === "merchant-create-branch" || prev.view === "merchant-create-team"
            ? 3
            : 4;
        return { ...prev, wizardStep: Math.min(max, prev.wizardStep + 1) };
      }),
    wizBack: () =>
      setS((prev) => ({ ...prev, wizardStep: Math.max(1, prev.wizardStep - 1) })),
    wizStep1: () => patch({ wizardStep: 1 }),
    wizStep2: () => patch({ wizardStep: 2 }),
    wizStep3: () => patch({ wizardStep: 3 }),
    wizStep4: () => patch({ wizardStep: 4 }),
    generate,
    copy,
    toggleOneTime: () => patch({ oneTime: !S.oneTime }),
    createLink: () =>
      startNewLink(role === "sales" ? "sales-create-link" : "merchant-create-link"),
    payVarCard: () => patch({ payVariant: "card" }),
    payVarMin: () => patch({ payVariant: "minimal" }),
    payBack: () => patch({ redirecting: false }),
    backToLinks: () => go(role === "sales" ? "sales-links" : "merchant-links"),
    payNow: () => patch({ redirecting: true }),
    curUSD: () => patch({ currency: "USD" }),
    curETB: () => patch({ currency: "ETB" }),
    curEUR: () => patch({ currency: "EUR" }),
    filterAll: () => patch({ filterStatus: "all" }),
    filterPaid: () => patch({ filterStatus: "Paid" }),
    filterPending: () => patch({ filterStatus: "Pending" }),
    filterFailed: () => patch({ filterStatus: "Failed" }),
    filterRefunded: () => patch({ filterStatus: "Refunded" }),
    date7: () => patch({ dateRange: "7d" }),
    date30: () => patch({ dateRange: "30d" }),
    date90: () => patch({ dateRange: "90d" }),
    dateYtd: () => patch({ dateRange: "YTD" }),
  };

  const field =
    (key: keyof State) =>
    (e: InputEvent) =>
      patch({ [key]: e.target.value } as unknown as Partial<State>);

  const set = {
    email: field("email"),
    password: field("password"),
    amount: field("amount"),
    title: field("title"),
    reference: field("reference"),
    maxScans: field("maxScans"),
    expiry: field("expiry"),
    dynMin: field("dynMin"),
    dynMax: field("dynMax"),
    splitTarget: field("splitTarget"),
    search: field("search"),
    currency: field("currency"),
    branchName: field("branchName"),
    branchCode: field("branchCode"),
    branchCity: field("branchCity"),
    branchArea: field("branchArea"),
    branchMgr: field("branchMgr"),
    branchMgrEmail: field("branchMgrEmail"),
    branchMgrPhone: field("branchMgrPhone"),
    teamFullName: field("teamFullName"),
    teamEmail: field("teamEmail"),
    teamPhone: field("teamPhone"),
    teamBranch: field("teamBranch"),
    teamRole: field("teamRole"),
  };

  let base = allTxns;
  if (role === "merchant") base = base.filter((t) => t.merchant === "Sheba Trading PLC");
  else if (role === "sales") base = base.filter((t) => t.sales === "Meseret A.");

  // Demo rows carry the same shape as live ones (minus an order id) so the
  // screens can render either without branching.
  let ftx = base.map((t) => ({
    ...t,
    ...badge(t.status),
    mc: t.method === "Mastercard",
    visa: t.method === "Visa",
    orderId: undefined as string | undefined,
    reference: undefined as string | undefined,
    badge: badgeFor(t.status),
  }));
  if (S.filterStatus !== "all") ftx = ftx.filter((t) => t.status === S.filterStatus);
  if (S.search) {
    const q = S.search.toLowerCase();
    ftx = ftx.filter((t) =>
      (t.id + t.merchant + t.customer + t.title + t.status).toLowerCase().includes(q),
    );
  }

  const links = linkData.map((l) => ({
    ...l,
    ...lstat(l.status),
    // Demo links stand in for a merchant already trading, not a rehearsal.
    isTest: false,
    dyn: l.type === "Dynamic",
    stc: l.type === "Static",
    pct:
      typeof l.max === "number" ? Math.min(100, Math.round((l.scans / l.max) * 100)) : 42,
    open: () => patch({ activeLinkId: l.id, view: "merchant-link-detail" }),
  }));
  const linksList = role === "sales" ? links.filter((l) => l.sales === "Meseret A.") : links;

  const merchants = merchantData.map((m) => ({
    ...m,
    ...mstat(m.status),
    initials: initials(m.name),
    open: () => patch({ activeMerchantId: m.id, view: "admin-merchant-detail" }),
  }));

  const team = teamData.map((t) => ({
    ...t,
    initials: initials(t.name),
    invited: t.status === "Invited",
    act: t.status === "Active",
  }));

  const activeLink = links.find((l) => l.id === S.activeLinkId) || links[0];
  const activeMerchant =
    merchants.find((m) => m.id === S.activeMerchantId) || merchants[0];

  const decorate = (t: (typeof allTxns)[number]) => ({
    ...t,
    ...badge(t.status),
    mc: t.method === "Mastercard",
    visa: t.method === "Visa",
    orderId: undefined as string | undefined,
    reference: undefined as string | undefined,
    badge: badgeFor(t.status),
  });
  const merchantTxns = allTxns
    .filter((t) => t.merchant === activeMerchant.name)
    .map(decorate);
  const linkTxns = allTxns.filter((t) => t.link === activeLink.id).map(decorate);

  const stp = S.wizardStep;
  const stepState = (n: number) => ({ done: stp > n, active: stp === n, todo: stp < n });

  const curSym =
    S.currency === "USD"
      ? "$"
      : S.currency === "ETB"
        ? "Br "
        : S.currency === "EUR"
          ? "€"
          : S.currency === "GBP"
            ? "£"
            : S.currency + " ";
  const amountDisplay =
    S.linkType === "dynamic" ? "Enter amount" : curSym + (S.amount || "0.00");
  const titleDisplay = S.title || "Payment to Sheba Trading";

  const titles: Partial<Record<View, [string, string]>> = {
    "admin-dashboard": ["Overview", "Platform performance across all merchants"],
    "admin-merchants": ["Merchants", "Onboard and manage merchant accounts"],
    "admin-merchant-detail": [activeMerchant.name, "Merchant profile · " + activeMerchant.id],
    "admin-create-merchant": ["Onboard merchant", "Create a new merchant workspace"],
    "admin-transactions": ["Transaction Analytics", "Every payment across the platform"],
    "admin-settings": ["Settings", "Platform configuration"],
    "merchant-dashboard": ["Overview", "Welcome back, Sheba Trading"],
    "merchant-create-link": ["Create Pay-by-Link", "Generate a secure MPGS payment link"],
    "merchant-link-created": ["Link ready", "Share it and start collecting"],
    "merchant-links": ["Pay Links", "All your payment links"],
    "merchant-link-detail": [activeLink.title, "Link " + activeLink.id],
    "merchant-transactions": ["Transaction Analytics", "Revenue, links and settlement"],
    "merchant-branches": ["Branches", "Your locations and their performance"],
    "merchant-create-branch": ["Add branch", "Create a new branch location"],
    "merchant-sales": ["Team", "Sales users across your branches"],
    "merchant-create-team": ["Invite sales user", "Add a team member to a branch"],
    "merchant-settings": ["Settings", "Workspace, currency and payout"],
    "sales-dashboard": ["Overview", "Your links and collections"],
    "sales-create-link": ["Create Pay-by-Link", "Generate a link for your customer"],
    "sales-links": ["My Links", "Links you have created"],
    "sales-transactions": ["My Payments", "Payments against your links"],
  };
  const pt = titles[v] || ["", ""];

  const users: Record<Role, { name: string; sub: string; initials: string }> = {
    admin: { name: "Nahom W.", sub: "Bank Administrator", initials: "NW" },
    merchant: { name: "Sheba Trading", sub: "Merchant · Bole HQ", initials: "ST" },
    sales: { name: "Meseret Abebe", sub: "Sales · Bole Branch", initials: "MA" },
    merchant_management: {
      name: "Merchant Management", sub: "Merchant onboarding", initials: "MM",
    },
  };
  const roleLabels: Record<Role, string> = {
    admin: "Admin console",
    merchant: "Merchant workspace",
    sales: "Sales workspace",
    merchant_management: "Merchant register",
  };

  // ------------------------------------------------------- live overrides
  // For a signed-in operator these replace the demo collections. Every value
  // is adapted to the shape the screens already render.
  // Opening a link pulls its detail fresh: the server reconciles any in-flight
  // attempts with the gateway first, so what lands here is the real outcome.
  const loadLinkDetail = async (id: string, force = false) => {
    setDetailLoading(true);
    try {
      const detail = await api.link(id, force);
      setLinkDetail(detail);
      setCreatedLink(detail.link);
      void operator.reload();
      reloadAnalytics();
    } catch {
      // Keep whatever is already on screen rather than blanking it.
    } finally {
      setDetailLoading(false);
    }
  };

  const openLive = (l: ApiPayLink) => {
    setCreatedLink(l);
    setLinkDetail(null);
    patch({ view: "merchant-link-detail" });
    scrollTop();
    void loadLinkDetail(l.id);
  };
  const liveLinks = live ? operator.links.map((l) => adaptLink(l, openLive)) : null;
  const merchantLabel = session?.user.merchant ?? "";
  const operatorLabel = session?.user.fullName ?? "";
  // The status chips and the search box above the table have to bite on live
  // rows too, or the count under them describes a list nobody is looking at.
  const liveAllPayments = live
    ? operator.payments.map((p) => adaptPayment(p, merchantLabel, operatorLabel))
    : null;
  const livePayments = liveAllPayments?.filter((t) => {
    if (S.filterStatus !== "all" && t.status !== S.filterStatus) return false;
    if (!S.search) return true;
    const q = S.search.toLowerCase();
    const haystack = [t.id, t.reference ?? "", t.customer, t.title, t.status].join(" ");
    return haystack.toLowerCase().includes(q);
  });

  // Prefer the freshly-reconciled detail; fall back to the list row while it loads.
  const activeApiLink = linkDetail?.link ?? createdLink;
  const liveActiveLink = live && activeApiLink ? adaptLink(activeApiLink, openLive) : null;
  const liveLinkTxns =
    live && activeApiLink
      ? (linkDetail?.payments ??
          operator.payments.filter((p) => p.payLinkId === activeApiLink.id)
        ).map((p) => adaptPayment(p, merchantLabel, operatorLabel))
      : null;

  const liveUser = session
    ? {
        name: session.user.fullName,
        sub: session.user.branch
          ? `${session.user.title ?? "Sales"} · ${session.user.branch}`
          : (session.user.title ?? "Sales"),
        initials: session.user.initials,
      }
    : null;

  return {
    // --- live operator state -------------------------------------------
    isLive: !!live,
    isConnectGateway: v === "connect-gateway",
    isRegister: v === "register",
    isForgotPassword: v === "forgot-password",
    isSecurityQuestions: v === "security-questions",
    isMerchantRegister: v === "merchant-register",
    gatewayConnected: session?.gatewayConnected ?? false,
    requiresGateway: session?.requiresGateway ?? false,
    // Everything on screen belongs to one gateway. Shown in the top bar so a
    // rehearsal is never mistaken for real money.
    environment: session?.environment ?? "test",
    isTestMode: !!live && (session?.environment ?? "test") === "test",
    createError,
    // --- self-registration ---------------------------------------------
    reg,
    regBusy,
    regError,
    regDone,
    setReg: (patchReg: Partial<typeof reg>) => setReg((p) => ({ ...p, ...patchReg })),
    clearRegDone: () => setRegDone(""),
    shareNotice,
    shareUrl: shareURL,
    liveLoading: operator.loading,
    authError,
    authBusy,
    linkSummary: linkDetail?.summary ?? null,
    contributors: linkDetail?.contributors ?? [],
    splitInfo:
      linkDetail?.link.isSplit
        ? {
            target: linkDetail.link.targetDisplay ?? "",
            remaining: linkDetail.link.remainingDisplay ?? "",
            percent: linkDetail.link.percentPaid,
            settled: linkDetail.link.effectiveStatus === "settled",
          }
        : null,
    detailLoading,
    linkPaused: (linkDetail?.link ?? createdLink)?.status === "paused",
    view: v,
    role,
    isLogin: v === "login",
    isActivate: v === "activate",
    isOtp: v === "otp",
    isPay: v === "pay",
    isDashboard: isDash,
    isAdmin: role === "admin",
    isMerchant: role === "merchant",
    isSales: role === "sales",
    layoutSidebar: S.layout === "sidebar",
    layoutTopnav: S.layout === "topnav",
    // view flags
    isAdminDashboard: v === "admin-dashboard",
    isAdminMerchants: v === "admin-merchants",
    isAdminMerchantDetail: v === "admin-merchant-detail",
    isAdminCreateMerchant: v === "admin-create-merchant",
    isAdminTransactions: v === "admin-transactions",
    isAdminSettings: v === "admin-settings",
    isMerchDashboard: v === "merchant-dashboard",
    isMerchCreate: v === "merchant-create-link",
    isMerchCreated: v === "merchant-link-created",
    isMerchLinks: v === "merchant-links",
    isMerchLinkDetail: v === "merchant-link-detail",
    isMerchTransactions: v === "merchant-transactions",
    isMerchBranches: v === "merchant-branches",
    isMerchTeam: v === "merchant-sales",
    isMerchSettings: v === "merchant-settings",
    isBranchCreate: v === "merchant-create-branch",
    isTeamCreate: v === "merchant-create-team",
    w3: { s1: stepState(1), s2: stepState(2), s3: stepState(3) },
    w3Last: stp === 3,
    w3NotLast: stp < 3,
    wizNotFirst: stp > 1,
    branchName: S.branchName,
    branchCode: S.branchCode,
    branchCity: S.branchCity,
    branchArea: S.branchArea,
    branchMgr: S.branchMgr,
    branchMgrEmail: S.branchMgrEmail,
    branchMgrPhone: S.branchMgrPhone,
    teamFullName: S.teamFullName,
    teamEmail: S.teamEmail,
    teamPhone: S.teamPhone,
    teamBranch: S.teamBranch,
    teamRole: S.teamRole,
    branchNameD: S.branchName || "New branch",
    branchCodeD: S.branchCode || "Auto-generated",
    branchCityD: S.branchCity || "—",
    branchAreaD: S.branchArea || "—",
    branchMgrD: S.branchMgr || "Unassigned",
    teamNameD: S.teamFullName || "New user",
    teamEmailD: S.teamEmail || "—",
    teamBranchD: S.teamBranch || "—",
    teamRoleD: S.teamRole || "Sales agent",
    isSalesDashboard: v === "sales-dashboard",
    isSalesCreate: v === "sales-create-link",
    isSalesLinks: v === "sales-links",
    isSalesTransactions: v === "sales-transactions",
    isCreate: v === "merchant-create-link" || v === "sales-create-link",
    modeWizard: S.createMode === "wizard",
    modeQuick: S.createMode === "quick",
    typeStatic: S.linkType === "static",
    typeDynamic: S.linkType === "dynamic",
    typeSplit: S.linkType === "split",
    splitTarget: S.splitTarget,
    modeCharge: S.paymentMode === "purchase",
    modeReserve: S.paymentMode === "authorize",
    paymentModeSeg: {
      charge: lseg(S.paymentMode === "purchase"),
      reserve: lseg(S.paymentMode === "authorize"),
    },
    step: S.wizardStep,
    step1: S.wizardStep === 1,
    step2: S.wizardStep === 2,
    step3: S.wizardStep === 3,
    step4: S.wizardStep === 4,
    payCard: S.payVariant === "card",
    payMinimal: S.payVariant === "minimal",
    w: { s1: stepState(1), s2: stepState(2), s3: stepState(3), s4: stepState(4) },
    notStep1: stp > 1,
    notStep4: stp < 4,
    curSym,
    amountDisplay,
    titleDisplay,
    oneTime: S.oneTime,
    notOneTime: !S.oneTime,
    linkTypeLabel: S.linkType === "dynamic" ? "Dynamic amount" : "Static amount",
    maxScansLabel: S.maxScans ? S.maxScans + " uses" : "Unlimited uses",
    expiryLabel: S.expiry ? "Expires " + S.expiry : "No expiry",
    newLinkUrl: shareURL.replace(/^https?:\/\//, ""),
    // Display form (no scheme) for the UI, plus the real URL a QR must encode.
    activeLinkUrl: (liveActiveLink?.url ?? "https://pay.zemenbank.com/l/" + activeLink.slug).replace(
      /^https?:\/\//,
      "",
    ),
    activeLinkFullUrl: liveActiveLink?.url ?? "https://pay.zemenbank.com/l/" + activeLink.slug,
    typeSeg: { static: lseg(S.linkType === "static"), dynamic: lseg(S.linkType === "dynamic") },
    modeSeg: { wizard: lseg(S.createMode === "wizard"), quick: lseg(S.createMode === "quick") },
    payTab: { card: chip(S.payVariant === "card"), minimal: chip(S.payVariant === "minimal") },
    generating: S.generating,
    copied: S.copied,
    notCopied: !S.copied,
    redirecting: S.redirecting,
    sidebarOpen: S.sidebarOpen,
    // A live link's own title wins over the demo record's.
    pageTitle: liveActiveLink && v === "merchant-link-detail" ? liveActiveLink.title : pt[0],
    pageSub:
      liveActiveLink && v === "merchant-link-detail" ? "Link " + liveActiveLink.id : pt[1],
    roleLabel: roleLabels[role],
    baseCurrency: "USD base",
    user: liveUser ?? users[role],
    on,
    set,
    email: S.email,
    password: S.password,
    amount: S.amount,
    currency: S.currency,
    title: S.title,
    reference: S.reference,
    maxScans: S.maxScans,
    expiry: S.expiry,
    dynMin: S.dynMin,
    dynMax: S.dynMax,
    search: S.search,
    merchants,
    links: liveLinks ?? links,
    linksList: liveLinks ?? linksList,
    txns: livePayments ?? ftx,
    branches: branchData,
    team,
    linkTxns: liveLinkTxns ?? linkTxns,
    merchantTxns,
    isLinksList: v === "merchant-links" || v === "sales-links",
    isAnalytics:
      v === "admin-transactions" ||
      v === "merchant-transactions" ||
      v === "sales-transactions",
    activeLink: liveActiveLink ?? activeLink,
    activeMerchant,
    newLink: liveActiveLink ?? S.newLink ?? activeLink,
    filterStatus: S.filterStatus,
    dateRange: S.dateRange,
    txnCount: livePayments?.length ?? ftx.length,
    txnTotal: liveAllPayments?.length ?? base.length,
    analytics,
    analyticsLoading,
    dateChip: {
      d7: chip(S.dateRange === "7d"),
      d30: chip(S.dateRange === "30d"),
      d90: chip(S.dateRange === "90d"),
      ytd: chip(S.dateRange === "YTD"),
    },
    statChip: {
      all: chip(S.filterStatus === "all"),
      paid: chip(S.filterStatus === "Paid"),
      pending: chip(S.filterStatus === "Pending"),
      failed: chip(S.filterStatus === "Failed"),
      refunded: chip(S.filterStatus === "Refunded"),
    },
  };
}

export type AppValue = ReturnType<typeof useAppValue>;

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppValue();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}
