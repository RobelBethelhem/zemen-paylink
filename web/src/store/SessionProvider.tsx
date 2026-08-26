"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, api, tokenStore, type Session } from "@/lib/api";

type SessionState = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => void;
  refresh: () => Promise<void>;
  /** Called after the operator connects their gateway so the gate clears. */
  markGatewayConnected: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await api.login(email, password);
    if (next.token) tokenStore.set(next.token);
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    // Tell the server first so the token stops being accepted; the local copy
    // is cleared either way, so a failed call still signs the person out here.
    void api.logout().catch(() => {});
    tokenStore.clear();
    setSession(null);
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

  const value = useMemo(
    () => ({ session, loading, signIn, signOut, refresh, markGatewayConnected }),
    [session, loading, signIn, signOut, refresh, markGatewayConnected],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
