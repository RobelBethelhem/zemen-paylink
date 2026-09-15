"use client";

import { useCallback, useEffect, useState } from "react";
import { s } from "@/lib/css";
import {
  ApiError,
  api,
  type Integration,
  type IssuedCredentials,
  type WebhookDelivery,
} from "@/lib/api";
import { useApp } from "@/store/AppProvider";

const card =
  "background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04)";
const input =
  "width:100%;padding:11px 13px;border:1px solid #E3E3E6;border-radius:10px;font-size:13.5px;background:#FAFAFB;font-family:inherit";
const label = "display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:6px";

/**
 * The credentials panel, shown once and never again.
 *
 * Deliberately hard to dismiss by accident: nothing on the server can produce
 * these a second time, so a stray click here costs the integrator a rotation
 * and a redeploy.
 */
function CredentialsPanel({
  credentials,
  notice,
  onDone,
}: {
  credentials: IssuedCredentials;
  notice: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const copy = async (what: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  };

  const rows: Array<[string, string, string]> = [
    ["API key", credentials.apiKey, "Identifies you. Safe to log."],
    ["Secret key", credentials.secretKey, "Signs every request."],
    ["Encryption key", credentials.payloadKey, "Seals request and response bodies."],
  ];

  return (
    <div style={s("position:fixed;inset:0;background:rgba(20,21,25,.55);display:flex;align-items:center;justify-content:center;padding:24px;z-index:80")}>
      <div style={s(`${card};max-width:680px;width:100%;max-height:90vh;overflow:auto;padding:26px 28px`)}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:19px;margin-bottom:6px")}>
          Your credentials
        </div>
        <div style={s("display:flex;gap:10px;background:#FEF3E2;border:1px solid #F5DCB0;color:#8A5800;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:20px")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>{notice}</span>
        </div>

        {rows.map(([name, value, hint]) => (
          <div key={name} style={s("margin-bottom:16px")}>
            <div style={s("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px")}>
              <span style={s("font-size:12.5px;font-weight:600;color:#3A3B42")}>{name}</span>
              <span style={s("font-size:11.5px;color:#9A9CA5")}>{hint}</span>
            </div>
            <div style={s("display:flex;gap:8px")}>
              <code style={s("flex:1;min-width:0;padding:11px 13px;background:#141519;color:#E6E7EA;border-radius:10px;font-family:'IBM Plex Mono';font-size:12.5px;word-break:break-all;line-height:1.5")}>
                {value}
              </code>
              <button
                onClick={() => void copy(name, value)}
                style={s("padding:0 14px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:12.5px;font-weight:600;color:#3A3B42;cursor:pointer;font-family:inherit;white-space:nowrap")}
              >
                {copied === name ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ))}

        <label style={s("display:flex;align-items:flex-start;gap:9px;margin:22px 0 16px;font-size:13px;color:#3A3B42;cursor:pointer")}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={s("margin-top:2px;width:15px;height:15px;cursor:pointer")}
          />
          <span>
            I have copied all three. I understand the secret and encryption keys
            cannot be shown again.
          </span>
        </label>

        <button
          onClick={onDone}
          disabled={!acknowledged}
          style={s(`width:100%;padding:13px;border:none;border-radius:11px;font-size:14.5px;font-weight:600;font-family:inherit;color:#fff;background:${acknowledged ? "#DA1E28" : "#E3A2A6"};cursor:${acknowledged ? "pointer" : "not-allowed"}`)}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function StatusChip({ integration }: { integration: Integration }) {
  const live = integration.environment === "live";
  const tone = live
    ? "background:#E6F6EE;color:#12905A"
    : "background:#FEF3E2;color:#B77400";
  return (
    <span style={s(`padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:600;${tone}`)}>
      {live ? "Live" : "Test"}
    </span>
  );
}

function DeliveryList({ id }: { id: string }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .deliveries(id)
      .then((r) => {
        if (!cancelled) setDeliveries(r.deliveries);
      })
      .catch(() => {
        if (!cancelled) setDeliveries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (deliveries === null) {
    return <div style={s("font-size:13px;color:#9A9CA5;padding:10px 0")}>Loading…</div>;
  }
  if (deliveries.length === 0) {
    return (
      <div style={s("font-size:13px;color:#9A9CA5;padding:10px 0")}>
        Nothing sent yet. Deliveries appear here once a payment resolves.
      </div>
    );
  }
  return (
    <div style={s("margin-top:8px")}>
      {deliveries.map((d) => {
        const tone =
          d.status === "delivered"
            ? "background:#E6F6EE;color:#12905A"
            : d.status === "exhausted"
              ? "background:#FDECED;color:#B0141C"
              : "background:#FEF3E2;color:#B77400";
        return (
          <div
            key={d.id}
            style={s("display:grid;grid-template-columns:1.4fr 1.4fr auto auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #F5F5F6;font-size:12.5px")}
          >
            <span style={s("font-weight:600")}>{d.event}</span>
            <span style={s("font-family:'IBM Plex Mono';color:#6B6D76;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
              {d.paymentId}
            </span>
            <span style={s("color:#9A9CA5")}>
              {d.attempts} {d.attempts === 1 ? "try" : "tries"}
              {d.responseCode > 0 ? ` · ${d.responseCode}` : ""}
            </span>
            <span style={s(`padding:3px 9px;border-radius:20px;font-weight:600;font-size:11px;${tone}`)}>
              {d.status}
            </span>
            {d.lastError && (
              <span style={s("grid-column:1/-1;font-size:11.5px;color:#B0141C")}>{d.lastError}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IntegrationCard({
  integration,
  onChanged,
}: {
  integration: Integration;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ credentials: IssuedCredentials; notice: string } | null>(null);

  const [success, setSuccess] = useState(integration.callbackSuccessUrl);
  const [failure, setFailure] = useState(integration.callbackFailureUrl);
  const [webhook, setWebhook] = useState(integration.webhookUrl);
  const [note, setNote] = useState("");

  const act = async (what: string, run: () => Promise<void>) => {
    setBusy(what);
    setError("");
    try {
      await run();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work. Try again.");
    } finally {
      setBusy("");
    }
  };

  const saveEndpoints = () =>
    act("endpoints", async () => {
      await api.updateIntegrationEndpoints(integration.id, {
        callbackSuccessUrl: success,
        callbackFailureUrl: failure,
        webhookUrl: webhook,
      });
      onChanged();
    });

  const rotate = () =>
    act("rotate", async () => {
      const result = await api.rotateIntegration(integration.id);
      setIssued({ credentials: result.credentials, notice: result.notice });
      onChanged();
    });

  const goLive = () =>
    act("live", async () => {
      await api.requestLive(integration.id, note);
      setNote("");
      onChanged();
    });

  const liveBanner = () => {
    if (integration.environment === "live") return null;
    if (integration.liveStatus === "pending") {
      return (
        <div style={s("background:#FEF3E2;border:1px solid #F5DCB0;color:#8A5800;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-top:14px")}>
          Waiting for the bank to review this. They look at the merchant and at what
          your test payments actually did.
        </div>
      );
    }
    if (integration.liveStatus === "rejected") {
      return (
        <div style={s("background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-top:14px")}>
          Not approved{integration.liveNote ? `: ${integration.liveNote}` : "."} Fix that and ask again.
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {issued && (
        <CredentialsPanel
          credentials={issued.credentials}
          notice={issued.notice}
          onDone={() => setIssued(null)}
        />
      )}
      <div style={s(`${card};padding:20px 22px;margin-bottom:14px`)}>
        <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
          <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px")}>
            {integration.name}
          </span>
          <StatusChip integration={integration} />
          {integration.status === "suspended" && (
            <span style={s("padding:4px 10px;border-radius:20px;background:#FDECED;color:#B0141C;font-size:11.5px;font-weight:600")}>
              Suspended
            </span>
          )}
          <span style={s("flex:1")} />
          <button
            onClick={() => setOpen(!open)}
            style={s("padding:8px 14px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:12.5px;font-weight:600;color:#3A3B42;cursor:pointer;font-family:inherit")}
          >
            {open ? "Close" : "Manage"}
          </button>
        </div>

        <div style={s("display:flex;gap:8px;align-items:center;margin-top:12px")}>
          <code style={s("flex:1;min-width:0;padding:9px 12px;background:#F7F7F8;border:1px solid #ECECEE;border-radius:9px;font-family:'IBM Plex Mono';font-size:12px;word-break:break-all;color:#3A3B42")}>
            {integration.apiKey}
          </code>
          <span style={s("font-size:11.5px;color:#9A9CA5;white-space:nowrap")}>
            secret {integration.secretHint}
          </span>
        </div>

        {!integration.gatewayConnected && (
          <div style={s("background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-top:14px")}>
            No {integration.environment} gateway is connected, so link creation will be
            refused. Connect it before your system calls the API.
          </div>
        )}
        {liveBanner()}

        {open && (
          <div style={s("margin-top:20px;padding-top:20px;border-top:1px solid #F0F0F2")}>
            {error && (
              <div style={s("background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-bottom:16px")}>
                {error}
              </div>
            )}

            <div style={s("font-weight:600;font-size:13.5px;margin-bottom:12px")}>Endpoints</div>
            <div style={s("margin-bottom:12px")}>
              <label style={s(label)}>Webhook URL — where we report payments, server to server</label>
              <input
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://your-system.et/hooks/paylink"
                style={s(input)}
              />
            </div>
            <div data-grid-2="" style={s("display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px")}>
              <div>
                <label style={s(label)}>Default success return</label>
                <input
                  value={success}
                  onChange={(e) => setSuccess(e.target.value)}
                  placeholder="https://your-system.et/thanks"
                  style={s(input)}
                />
              </div>
              <div>
                <label style={s(label)}>Default failure return</label>
                <input
                  value={failure}
                  onChange={(e) => setFailure(e.target.value)}
                  placeholder="https://your-system.et/retry"
                  style={s(input)}
                />
              </div>
            </div>
            <div style={s("font-size:12px;color:#8B8D96;margin-bottom:14px;line-height:1.5")}>
              A link can override the return URLs when it is created, so one campaign
              can send its payer somewhere different from another.
            </div>
            <button
              onClick={saveEndpoints}
              disabled={busy === "endpoints"}
              style={s("padding:10px 16px;border:none;background:#DA1E28;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit")}
            >
              {busy === "endpoints" ? "Saving…" : "Save endpoints"}
            </button>

            <div style={s("font-weight:600;font-size:13.5px;margin:24px 0 8px")}>Recent deliveries</div>
            <DeliveryList id={integration.id} />

            <div style={s("font-weight:600;font-size:13.5px;margin:24px 0 8px")}>Credentials</div>
            <div style={s("font-size:12.5px;color:#6B6D76;line-height:1.6;margin-bottom:12px")}>
              Rotating issues a new secret and encryption key and keeps the API key, so
              your configuration does not change. The old pair stops working the moment
              the new one is issued — update your system before its next call.
            </div>
            <button
              onClick={rotate}
              disabled={busy === "rotate"}
              style={s("padding:10px 16px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer;font-family:inherit")}
            >
              {busy === "rotate" ? "Rotating…" : "Rotate secret and encryption key"}
            </button>

            {integration.environment === "test" &&
              integration.liveStatus !== "pending" &&
              integration.liveStatus !== "live" && (
                <>
                  <div style={s("font-weight:600;font-size:13.5px;margin:24px 0 8px")}>Going live</div>
                  <div style={s("font-size:12.5px;color:#6B6D76;line-height:1.6;margin-bottom:12px")}>
                    Live credentials are the outcome of a review, not a request. The bank
                    looks at the merchant and at what your test payments did. Take at
                    least one test payment first — otherwise there is nothing to review.
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything the reviewer should know — what this integration does, expected volumes."
                    rows={3}
                    style={s(`${input};resize:vertical;margin-bottom:12px`)}
                  />
                  <button
                    onClick={goLive}
                    disabled={busy === "live"}
                    style={s("padding:10px 16px;border:none;background:#141519;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit")}
                  >
                    {busy === "live" ? "Sending…" : "Ask to go live"}
                  </button>
                </>
              )}
          </div>
        )}
      </div>
    </>
  );
}

export function Integrations() {
  const { on } = useApp();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ credentials: IssuedCredentials; notice: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.integrations();
      setIntegrations(result.integrations);
    } catch {
      setIntegrations([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const result = await api.createIntegration(name.trim());
      setIssued({ credentials: result.credentials, notice: result.notice });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the integration.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1000px;margin:0 auto;animation:fadeUp .45s ease both")}>
      {issued && (
        <CredentialsPanel
          credentials={issued.credentials}
          notice={issued.notice}
          onDone={() => setIssued(null)}
        />
      )}

      <div style={s("display:flex;align-items:flex-start;gap:20px;background:linear-gradient(100deg,#141519,#301316 78%);border-radius:16px;padding:22px 26px;margin-bottom:16px;position:relative;overflow:hidden")}>
        <div style={s("position:absolute;right:-40px;top:-70px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#DA1E28 0,rgba(218,30,40,0) 70%);opacity:.45")} />
        <div style={s("flex:1;position:relative;min-width:0")}>
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:20px;color:#fff;letter-spacing:-.01em")}>
            Integrations
          </div>
          <div style={s("color:#A7A9B2;font-size:13.5px;margin-top:5px;line-height:1.6;max-width:62ch")}>
            Credentials for a system that creates payment links through the API
            instead of through this portal. Test credentials are issued straight
            away; live ones follow a review.
          </div>
        </div>
        <button
          onClick={on.developerDocs}
          style={s("position:relative;padding:11px 16px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#E6E7EA;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap")}
        >
          Developer docs
        </button>
      </div>

      <div style={s(`${card};padding:20px 22px;margin-bottom:18px`)}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:4px")}>
          New integration
        </div>
        <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:14px")}>
          Name it after the system it belongs to, such as Z-Care.
        </div>
        {error && (
          <div style={s("background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-bottom:14px")}>
            {error}
          </div>
        )}
        <div style={s("display:flex;gap:10px")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Z-Care"
            style={s(input)}
          />
          <button
            onClick={create}
            disabled={creating || name.trim() === ""}
            style={s(`padding:0 20px;border:none;border-radius:10px;font-size:13.5px;font-weight:600;color:#fff;font-family:inherit;white-space:nowrap;background:${creating || name.trim() === "" ? "#E3A2A6" : "#DA1E28"};cursor:${creating || name.trim() === "" ? "not-allowed" : "pointer"}`)}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {integrations === null && (
        <div style={s(`${card};padding:30px;text-align:center;color:#9A9CA5;font-size:13.5px`)}>
          Loading…
        </div>
      )}
      {integrations?.length === 0 && (
        <div style={s(`${card};padding:36px 30px;text-align:center`)}>
          <div style={s("font-size:14px;font-weight:600;margin-bottom:6px")}>
            No integrations yet
          </div>
          <div style={s("font-size:13px;color:#8B8D96;line-height:1.6;max-width:46ch;margin:0 auto")}>
            Create one above to get a test API key, a signing secret and an
            encryption key.
          </div>
        </div>
      )}
      {integrations?.map((i) => (
        <IntegrationCard key={i.id} integration={i} onChanged={() => void load()} />
      ))}
    </div>
  );
}
