"use client";

import { useCallback, useEffect, useState } from "react";
import { s } from "@/lib/css";
import { ApiError, api, type LiveRequest } from "@/lib/api";

const card =
  "background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04)";

type Tab = "pending" | "approved" | "rejected";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={s("font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em")}>
        {label}
      </div>
      <div style={s("font-size:13.5px;margin-top:3px;word-break:break-word")}>{value || "—"}</div>
    </div>
  );
}

/**
 * The evidence, stated plainly.
 *
 * An approval here hands a system the ability to move real money, so the figures
 * it rests on are the ones the database actually holds — not what the integrator
 * said about themselves in their note.
 */
function Evidence({ request }: { request: LiveRequest }) {
  const taken = request.testPayments ?? 0;
  const settled = request.testPaymentsSettled ?? 0;

  const tone =
    settled > 0
      ? "background:#E6F6EE;border-color:#BFE6D2;color:#0B6E45"
      : "background:#FDECED;border-color:#F5C6C9;color:#B0141C";

  return (
    <div style={s(`border:1px solid;border-radius:11px;padding:12px 14px;font-size:12.5px;line-height:1.6;${tone}`)}>
      <strong>
        {taken} test {taken === 1 ? "payment" : "payments"}, {settled} settled.
      </strong>{" "}
      {settled > 0
        ? "Money moved through this integration on the test gateway."
        : taken > 0
          ? "Attempts were made but nothing settled. Check with them before approving."
          : "Nothing has been taken through it. Approving this approves something nobody has seen work."}
    </div>
  );
}

function RequestCard({ request, onDone }: { request: LiveRequest; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<"approved" | "rejected" | null>(null);

  const decide = async (decision: "approved" | "rejected") => {
    setBusy(decision);
    setError("");
    try {
      await api.reviewLiveRequest(request.id, decision, note.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record that decision.");
      setConfirming(null);
    } finally {
      setBusy("");
    }
  };

  const decided = request.status !== "pending";

  return (
    <div style={s(`${card};padding:20px 22px;margin-bottom:14px`)}>
      <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px")}>
        <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px")}>
          {request.integration ?? "Integration"}
        </span>
        <span style={s("padding:4px 10px;border-radius:20px;background:#F2F2F4;color:#5B5D66;font-size:11.5px;font-weight:600")}>
          {request.integrationId}
        </span>
        <span style={s("flex:1")} />
        <span style={s("font-size:12px;color:#9A9CA5")}>
          {new Date(request.requestedAt).toLocaleString()}
        </span>
      </div>

      <div data-grid-2="" style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px")}>
        <Field label="Merchant" value={`${request.merchant ?? "—"}`} />
        <Field label="Merchant number" value={request.merchantId ?? "—"} />
        <Field
          label="Requested by"
          value={
            request.requestedBy
              ? `${request.requestedBy}${request.requestedByUsername ? ` (${request.requestedByUsername})` : ""}`
              : "—"
          }
        />
      </div>

      {request.webhookUrl && (
        <div style={s("margin-bottom:16px")}>
          <Field label="Webhook" value={request.webhookUrl} />
        </div>
      )}

      <div style={s("margin-bottom:16px")}>
        <Evidence request={request} />
      </div>

      {request.note && (
        <div style={s("background:#F7F7F8;border:1px solid #ECECEE;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.6;margin-bottom:16px")}>
          <div style={s("font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px")}>
            {decided ? "Reviewer note" : "From the integrator"}
          </div>
          {request.note}
        </div>
      )}

      {decided ? (
        <div
          style={s(
            `padding:11px 14px;border-radius:11px;font-size:13px;font-weight:600;${
              request.status === "approved"
                ? "background:#E6F6EE;color:#12905A"
                : "background:#FDECED;color:#B0141C"
            }`,
          )}
        >
          {request.status === "approved" ? "Approved — live credentials issued" : "Rejected"}
        </div>
      ) : (
        <>
          {error && (
            <div style={s("background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:11px 13px;font-size:12.5px;margin-bottom:14px")}>
              {error}
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Your note. Required when rejecting — they need to know what to fix."
            rows={2}
            style={s("width:100%;padding:11px 13px;border:1px solid #E3E3E6;border-radius:10px;font-size:13px;background:#FAFAFB;font-family:inherit;resize:vertical;margin-bottom:14px")}
          />

          {confirming === "approved" ? (
            <div style={s("background:#FEF3E2;border:1px solid #F5DCB0;border-radius:11px;padding:14px 16px")}>
              <div style={s("font-size:13px;color:#8A5800;line-height:1.6;margin-bottom:12px")}>
                <strong>This lets {request.integration} move real money.</strong> Live
                credentials will be created for {request.merchant}, and the integrator
                collects them from their own screen. Approving cannot be undone here —
                access is withdrawn by suspending the integration afterwards.
              </div>
              <div style={s("display:flex;gap:9px")}>
                <button
                  onClick={() => void decide("approved")}
                  disabled={busy !== ""}
                  style={s("padding:10px 18px;border:none;background:#12905A;color:#fff;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit")}
                >
                  {busy ? "Approving…" : "Yes, issue live credentials"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  style={s("padding:10px 16px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:13px;font-weight:600;color:#6B6D76;cursor:pointer;font-family:inherit")}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={s("display:flex;gap:9px")}>
              <button
                onClick={() => setConfirming("approved")}
                disabled={busy !== ""}
                style={s("padding:11px 18px;border:none;background:#12905A;color:#fff;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit")}
              >
                Approve
              </button>
              <button
                onClick={() => void decide("rejected")}
                disabled={busy !== "" || note.trim() === ""}
                title={note.trim() === "" ? "Say why, so they know what to fix" : undefined}
                style={s(`padding:11px 18px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;font-family:inherit;color:${note.trim() === "" ? "#C6C7CD" : "#B0141C"};cursor:${note.trim() === "" ? "not-allowed" : "pointer"}`)}
              >
                {busy === "rejected" ? "Rejecting…" : "Reject"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AdminLiveRequests() {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<LiveRequest[] | null>(null);

  const load = useCallback(async (which: Tab) => {
    setRequests(null);
    try {
      const result = await api.liveRequests(which);
      setRequests(result.requests);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const chip = (active: boolean) =>
    active
      ? "padding:8px 14px;border-radius:9px;border:1px solid #DA1E28;background:#FDECED;color:#B0141C;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit"
      : "padding:8px 14px;border-radius:9px;border:1px solid #E7E7EA;background:#fff;color:#6B6D76;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit";

  return (
    <div data-pad="" style={s("padding:26px 30px;max-width:1000px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("margin-bottom:18px")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:21px;letter-spacing:-.01em")}>
          Go-live requests
        </div>
        <div style={s("color:#6B6D76;font-size:13.5px;margin-top:5px;line-height:1.6;max-width:66ch")}>
          An integration asking to move real money. Each one shows the merchant it
          trades under and what its test traffic actually did — approve on the
          evidence, not on the request.
        </div>
      </div>

      <div style={s("display:flex;gap:8px;margin-bottom:16px")}>
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={s(chip(tab === t))}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {requests === null && (
        <div style={s(`${card};padding:30px;text-align:center;color:#9A9CA5;font-size:13.5px`)}>
          Loading…
        </div>
      )}
      {requests?.length === 0 && (
        <div style={s(`${card};padding:36px 30px;text-align:center`)}>
          <div style={s("font-size:14px;font-weight:600;margin-bottom:6px")}>
            {tab === "pending" ? "Nothing waiting" : `No ${tab} requests`}
          </div>
          <div style={s("font-size:13px;color:#8B8D96")}>
            {tab === "pending"
              ? "Requests appear here when an integrator asks to go live."
              : "Decisions you have made will be listed here."}
          </div>
        </div>
      )}
      {requests?.map((r) => (
        <RequestCard key={r.id} request={r} onDone={() => void load(tab)} />
      ))}
    </div>
  );
}
