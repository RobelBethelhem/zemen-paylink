"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { s } from "@/lib/css";
import { ApiError, api, onUnauthorized, tokenStore, type Session } from "@/lib/api";

/** Why a session ended, so the sign-in screen can say so rather than just reappearing. */
export type SignedOutReason = "idle" | "expired" | "revoked" | null;

type SessionState = {
  session: Session | null;
  loading: boolean;
  signedOutReason: SignedOutReason;
  clearSignedOutReason: () => void;
  /** force takes the account over from a session signed in elsewhere. */
  signIn: (username: string, password: string, force?: boolean) => Promise<Session>;
  signOut: () => void;
  refresh: () => Promise<void>;
  /** Called after the operator connects their gateway so the gate clears. */
  markGatewayConnected: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * What counts as somebody still being here: deliberate input, nothing passive.
 *
 * mousemove and focus are deliberately excluded, and the difference is not
 * cosmetic. Measured on an idle page, mousemove fired 81 times in 30 seconds
 * with nobody touching anything — a passing overlay, a trackpad twitch or a
 * mouse-jiggler is enough. Counting it would hold a session open indefinitely
 * on an unattended machine, which is precisely the situation the idle timeout
 * exists to close, and the control would look present while doing nothing.
 *
 * Scrolling and the wheel stay: reading a long page is real use, and neither
 * happens on its own.
 */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/** How long before an idle sign-out to warn, so nobody loses a half-typed link. */
const WARN_AT_SECONDS = 30;

// Fallbacks only. The server sends its own policy on every session; these keep
// the page sane if an older API answers without one.
const DEFAULT_IDLE_SECONDS = 180;
const DEFAULT_LIFETIME_SECONDS = 900;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOutReason, setSignedOutReason] = useState<SignedOutReason>(null);
  const [idleCountdown, setIdleCountdown] = useState(0);

  // Kept in refs, not state: these change constantly and must never re-render.
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const endsAt = useRef(0);

  const endSession = useCallback((reason: SignedOutReason) => {
    // Best effort — if the session is already gone server-side this 401s, which
    // is fine. The local copy is cleared either way.
    void api.logout().catch(() => {});
    tokenStore.clear();
    setSession(null);
    setIdleCountdown(0);
    setSignedOutReason(reason);
  }, []);

  // A call refused for want of a session means it ended somewhere else: its
  // time ran out, or somebody signed in on another device and took it over.
  useEffect(() => {
    onUnauthorized(() => {
      tokenStore.clear();
      setSession(null);
      setIdleCountdown(0);
      // Never overwrite a reason we already know; the logout call above 401s
      // on its way out and would otherwise relabel every ending as "revoked".
      setSignedOutReason((prev) => prev ?? "revoked");
    });
    return () => onUnauthorized(null);
  }, []);

  // Restore an existing token on load so a refresh does not sign the user out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const restored = await api.me();
        if (!cancelled) setSession(restored);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Arm the clocks whenever a session begins or is refreshed. The absolute
  // deadline comes from the token itself where the server sent one, so a
  // reloaded page inherits the original deadline rather than starting over.
  useEffect(() => {
    if (!session) {
      endsAt.current = 0;
      return;
    }
    const lifetimeMs = (session.lifetimeSeconds || DEFAULT_LIFETIME_SECONDS) * 1000;
    const stated = session.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
    endsAt.current = Number.isFinite(stated) ? stated : Date.now() + lifetimeMs;
    lastActivity.current = Date.now();
    lastPing.current = Date.now();
    setIdleCountdown(0);
  }, [session]);

  const active = !!session;

  useEffect(() => {
    if (!active) return;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, mark, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, mark);
    };
  }, [active]);

  const idleSeconds = session?.idleSeconds || DEFAULT_IDLE_SECONDS;

  useEffect(() => {
    if (!active) return;
    const idleMs = idleSeconds * 1000;
    // Only a real request resets the server's idle clock. Without this the page
    // would count mouse movement as keeping the session alive while the server
    // quietly timed it out — and the next click would fail for no visible
    // reason. Sent only when something actually happened since the last one, so
    // a browser left alone still times out exactly as it should.
    const pingEvery = Math.max(20_000, Math.min(45_000, idleMs / 3));

    const tick = window.setInterval(() => {
      const now = Date.now();

      if (endsAt.current && now >= endsAt.current) {
        endSession("expired");
        return;
      }

      const idleFor = now - lastActivity.current;
      if (idleFor >= idleMs) {
        endSession("idle");
        return;
      }

      const remaining = Math.ceil((idleMs - idleFor) / 1000);
      // Setting the same 0 repeatedly is free — React bails on an unchanged
      // value, so this only re-renders during the warning itself.
      setIdleCountdown(remaining <= WARN_AT_SECONDS ? remaining : 0);

      if (lastActivity.current > lastPing.current && now - lastPing.current >= pingEvery) {
        lastPing.current = now;
        void api.me().catch(() => {});
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [active, idleSeconds, endSession]);

  const staySignedIn = useCallback(() => {
    lastActivity.current = Date.now();
    lastPing.current = Date.now();
    setIdleCountdown(0);
    // The request is the point: it is what resets the clock the server keeps.
    void api.me().catch(() => {});
  }, []);

  const signIn = useCallback(
    async (username: string, password: string, force = false) => {
      const next = await api.login(username, password, force);
      if (next.token) tokenStore.set(next.token);
      setSignedOutReason(null);
      setSession(next);
      return next;
    },
    [],
  );

  const signOut = useCallback(() => {
    // Tell the server first so the token stops being accepted; the local copy
    // is cleared either way, so a failed call still signs the person out here.
    void api.logout().catch(() => {});
    tokenStore.clear();
    setSession(null);
    setIdleCountdown(0);
    // Deliberate: no notice to show on the way out.
    setSignedOutReason(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setSession(await api.me());
    } catch {
      // Leave the current session in place; the next guarded call will surface it.
    }
  }, []);

  const markGatewayConnected = useCallback(() => {
    setSession((prev) =>
      prev ? { ...prev, gatewayConnected: true, requiresGateway: false } : prev,
    );
  }, []);

  const clearSignedOutReason = useCallback(() => setSignedOutReason(null), []);

  // idleCountdown is deliberately absent: it changes every second while the
  // warning shows, and including it would re-render every screen in the portal
  // once a second for nothing.
  const value = useMemo(
    () => ({
      session,
      loading,
      signedOutReason,
      clearSignedOutReason,
      signIn,
      signOut,
      refresh,
      markGatewayConnected,
    }),
    [
      session,
      loading,
      signedOutReason,
      clearSignedOutReason,
      signIn,
      signOut,
      refresh,
      markGatewayConnected,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      {active && idleCountdown > 0 && (
        <IdleWarning seconds={idleCountdown} onStay={staySignedIn} onSignOut={signOut} />
      )}
    </SessionContext.Provider>
  );
}

function IdleWarning({
  seconds,
  onStay,
  onSignOut,
}: {
  seconds: number;
  onStay: () => void;
  onSignOut: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Session about to end"
      style={s("position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:18px;z-index:60;pointer-events:none")}
    >
      <div style={s("pointer-events:auto;display:flex;align-items:center;gap:16px;background:#141519;color:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 18px 42px rgba(20,21,25,.34);max-width:560px;animation:fadeUp .2s ease both")}>
        <span style={s("width:34px;height:34px;border-radius:50%;background:rgba(218,30,40,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FF6B73" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <div style={s("flex:1;min-width:0")}>
          <div style={s("font-weight:600;font-size:14px")}>
            Signing you out in {seconds}s
          </div>
          <div style={s("font-size:12.5px;color:#A7A9B2;margin-top:2px")}>
            You have been inactive. Anything unsaved will be lost.
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={s("padding:9px 14px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#D6D7DC;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap")}
        >
          Sign out
        </button>
        <button
          onClick={onStay}
          style={s("padding:9px 16px;border:none;background:#DA1E28;color:#fff;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap")}
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
