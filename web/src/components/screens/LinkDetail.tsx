"use client";

import { Fragment, useState } from "react";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";
import { LinkQr } from "@/components/LinkQr";
import { PaymentActions } from "@/components/PaymentActions";

export function LinkDetail() {
  // Which payment's capture/refund/void panel is open, by gateway order id.
  const [openPayment, setOpenPayment] = useState<string | null>(null);
  const { activeLink, activeLinkFullUrl, activeLinkUrl, contributors, copied, detailLoading, linkPaused, linkSummary, linkTxns, notCopied, on, splitInfo } =
    useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:1200px;margin:0 auto;animation:fadeUp .45s ease both")}>
      {openPayment ? (
        <PaymentActions
          orderId={openPayment}
          onClose={() => setOpenPayment(null)}
          onChanged={on.refreshLink}
        />
      ) : null}
      <button
        className="zxoy0gmr"
        onClick={on.backToLinks}
        style={s("display:flex;align-items:center;gap:7px;padding:8px 13px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer;margin-bottom:16px")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        All links
      </button>
      {" "}
      <div style={s("display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:20px")}>
        <div style={s("flex:1;min-width:0")}>
          <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
            <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:22px;letter-spacing:-.01em")}>
              {activeLink.title}
            </span>
            {activeLink.lActive && (
              <>
                <span style={s("display:inline-flex;align-items:center;gap:6px;padding:4px 11px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:12px;font-weight:600")}>
                  <span style={s("width:6px;height:6px;border-radius:50%;background:#12905A")} />
                  Active
                </span>
              </>
            )}
            {activeLink.lLimit && (
              <>
                <span style={s("padding:4px 11px;background:#FEF3E2;color:#B77400;border-radius:20px;font-size:12px;font-weight:600")}>
                  Limit reached
                </span>
              </>
            )}
            {activeLink.lExpired && (
              <>
                <span style={s("padding:4px 11px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:12px;font-weight:600")}>
                  Expired
                </span>
              </>
            )}
            {activeLink.lPaused && (
              <>
                <span style={s("padding:4px 11px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:12px;font-weight:600")}>
                  Paused
                </span>
              </>
            )}
          </div>
          <div style={s("font-size:13px;color:#9A9CA5;font-family:'IBM Plex Mono';margin-top:5px")}>
            {activeLink.id}{" · created "}{activeLink.created}
          </div>
        </div>
        <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
          <button
            className="zxoy0gmr"
            onClick={on.copy}
            style={s("display:flex;align-items:center;gap:7px;padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
          >
            {copied && (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Copied
              </>
            )}
            {notCopied && (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link
              </>
            )}
          </button>
          <button
            className="zxoy0gmr"
            style={s("display:flex;align-items:center;gap:7px;padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="m16 6-4-4-4 4" />
              <path d="M12 2v13" />
            </svg>
            Share
          </button>
          <button
            className="zx1b5k1d"
            onClick={on.togglePause}
            style={s(`display:flex;align-items:center;gap:7px;padding:10px 15px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:${linkPaused ? "#12905A" : "#B0141C"};cursor:pointer`)}
          >
            {linkPaused ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m7 4 12 8-12 8z" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
            {linkPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.55fr 1fr;gap:20px;align-items:start")}>
        <div>
          <div
            data-grid-kpi=""
            style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px")}
          >
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12.5px;color:#6B6D76")}>Collected</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:6px")}>
                {activeLink.paid}
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12.5px;color:#6B6D76")}>Payments</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:6px")}>
                {activeLink.paidCount}
              </div>
            </div>
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
              <div style={s("font-size:12.5px;color:#6B6D76")}>Scans / uses</div>
              <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:22px;margin-top:6px;font-family:'IBM Plex Mono'")}>
                {activeLink.scans}
              </div>
            </div>
          </div>
          {splitInfo ? (
            <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04);margin-bottom:16px")}>
              <div style={s("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px")}>
                <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:14.5px")}>
                  Shared bill
                </div>
                <div style={s("font-size:12.5px;color:#6B6D76")}>
                  {splitInfo.settled ? "Settled in full" : `${splitInfo.remaining} still to collect`}
                </div>
              </div>
              <div style={s("height:10px;background:#EDEDEF;border-radius:6px;overflow:hidden;margin-bottom:10px")}>
                <div style={s(`height:100%;width:${splitInfo.percent}%;background:${splitInfo.settled ? "#12905A" : "#DA1E28"};border-radius:6px;transition:width .4s ease`)} />
              </div>
              <div style={s("display:flex;justify-content:space-between;font-size:12.5px;color:#6B6D76")}>
                <span>
                  <strong style={s("color:#141519")}>{activeLink.paid}</strong> of {splitInfo.target}
                </span>
                <span style={s("font-weight:600;color:#141519")}>{splitInfo.percent}%</span>
              </div>
              {contributors.length > 0 ? (
                <div style={s("margin-top:16px;padding-top:14px;border-top:1px solid #F0F0F2")}>
                  <div style={s("font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px")}>
                    Contributors
                  </div>
                  <div style={s("display:flex;flex-direction:column;gap:8px")}>
                    {contributors.map((c, i) => (
                      <div key={i} style={s("display:flex;align-items:center;gap:10px;font-size:13px")}>
                        <span style={s("width:26px;height:26px;border-radius:50%;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;flex-shrink:0")}>
                          {c.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                        </span>
                        <span style={s("font-weight:600")}>{c.name}</span>
                        <span style={s("flex:1")} />
                        {c.cardLast4 ? (
                          <span style={s("font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                            ····{c.cardLast4}
                          </span>
                        ) : null}
                        <span style={s("font-size:11.5px;color:#9A9CA5")}>{c.paidAt}</span>
                        <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{c.amountDisplay}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
            <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px;border-bottom:1px solid #F0F0F2")}>
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:14.5px")}>
                Payments on this link
              </div>
              {linkSummary ? (
                <div style={s("display:flex;align-items:center;gap:6px;flex-wrap:wrap")}>
                  <Outcome n={linkSummary.paid} label="paid" bg="#E6F6EE" fg="#12905A" dot="#12905A" />
                  {linkSummary.authorized > 0 ? (
                    <Outcome n={linkSummary.authorized} label="held" bg="#EAF1FB" fg="#2C5FA8" dot="#2C5FA8" />
                  ) : null}
                  <Outcome n={linkSummary.pending} label="pending" bg="#FEF3E2" fg="#B77400" dot="#F0A83A" />
                  {linkSummary.refunded > 0 ? (
                    <Outcome n={linkSummary.refunded} label="refunded" bg="#F2F2F4" fg="#5B5D66" />
                  ) : null}
                  <Outcome n={linkSummary.failed} label="failed" bg="#FDECED" fg="#B0141C" dot="#DA1E28" />
                  <Outcome n={linkSummary.abandoned} label="abandoned" bg="#F2F2F4" fg="#5B5D66" />
                </div>
              ) : null}
              <div style={s("flex:1")} />
              {linkSummary ? (
                <button
                  className="zxoy0gmr"
                  onClick={on.refreshLink}
                  disabled={detailLoading}
                  title="Re-check every attempt with the payment gateway"
                  style={s(`display:flex;align-items:center;gap:7px;padding:7px 13px;border:1px solid #E7E7EA;background:#fff;border-radius:9px;font-size:12.5px;font-weight:600;color:#3A3B42;cursor:${detailLoading ? "wait" : "pointer"}`)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={detailLoading ? s("animation:spin .9s linear infinite") : undefined}
                  >
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  {detailLoading ? "Checking…" : "Refresh"}
                </button>
              ) : null}
            </div>
            <div style={s("display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr;padding:11px 20px;font-size:11px;font-weight:600;color:#9A9CA5;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #F0F0F2")}>
              <span>Customer</span>
              <span>Method</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {" "}
            {linkTxns.map((t, i) => (
              <Fragment key={i}>
                <div
                  className={t.orderId ? "zxxbkkbw" : undefined}
                  onClick={t.orderId ? () => setOpenPayment(t.orderId!) : undefined}
                  style={s(`display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr;align-items:center;padding:13px 20px;border-bottom:1px solid #F5F5F6${t.orderId ? ";cursor:pointer" : ""}`)}
                >
                  <div style={s("min-width:0")}>
                    <span style={s("display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>
                      {t.customer}
                    </span>
                    <span style={s("display:block;font-size:11.5px;color:#9A9CA5;font-family:'IBM Plex Mono'")}>
                      {t.date}{" · "}{t.time}
                    </span>
                    {t.reference ? (
                      <span
                        title="Gateway receipt — quote this when reconciling"
                        style={s("display:block;font-size:11px;color:#B4B6BD;font-family:'IBM Plex Mono';margin-top:2px")}
                      >
                        Ref {t.reference}
                      </span>
                    ) : null}
                  </div>
                  <div style={s("display:flex;align-items:center;gap:8px;font-size:12.5px;color:#5B5D66")}>
                    {t.mc && (
                      <>
                        <span style={s("display:inline-flex;align-items:center;flex-shrink:0")}>
                          <span style={s("width:15px;height:15px;border-radius:50%;background:#EB001B")} />
                          <span style={s("width:15px;height:15px;border-radius:50%;background:#F79E1B;margin-left:-6px")} />
                        </span>
                      </>
                    )}
                    {t.visa && (
                      <>
                        <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:11px;color:#1A1F71;flex-shrink:0")}>
                          VISA
                        </span>
                      </>
                    )}
                    <span style={s("font-family:'IBM Plex Mono';color:#9A9CA5;font-size:11.5px")}>
                      {"••"}{t.last4}
                    </span>
                  </div>
                  <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>{t.amount}</span>
                  <span style={s("display:flex;align-items:center;gap:8px;justify-content:flex-end")}>
                    {t.badge ? (
                      <span
                        style={s(`display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${t.badge.bg};color:${t.badge.fg}`)}
                      >
                        {t.badge.dot ? (
                          <span style={s(`width:5px;height:5px;border-radius:50%;background:${t.badge.dot}`)} />
                        ) : null}
                        {t.badge.label}
                      </span>
                    ) : (
                      <span style={s("padding:3px 9px;background:#F2F2F4;color:#5B5D66;border-radius:20px;font-size:11px;font-weight:600")}>
                        {t.status}
                      </span>
                    )}
                    {t.orderId ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C7C8CE" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    ) : null}
                  </span>
                </div>
              </Fragment>
            ))}
            {linkTxns.length === 0 ? (
              <div style={s("padding:38px 20px;text-align:center")}>
                <div
                  style={s("width:46px;height:46px;border-radius:13px;background:#F5F5F6;display:flex;align-items:center;justify-content:center;margin:0 auto 12px")}
                >
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#A9ABB3" strokeWidth="1.8">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <div style={s("font-size:13.5px;font-weight:600;color:#3A3B42;margin-bottom:4px")}>
                  No payments yet
                </div>
                <div style={s("font-size:12.5px;color:#9A9CA5;line-height:1.6")}>
                  Attempts appear here as soon as a customer opens the link —
                  <br />
                  successful or not.
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:20px;box-shadow:0 1px 2px rgba(20,21,25,.04);text-align:center;margin-bottom:16px")}>
            <div style={s("display:inline-block;padding:12px;border:1px solid #EEE;border-radius:14px")}>
              <LinkQr url={activeLinkFullUrl} size={130} />
            </div>
            {" "}
            <div style={s("display:flex;align-items:center;gap:8px;background:#FAFAFB;border:1px solid #E7E7EA;border-radius:10px;padding:9px 12px;margin-top:14px")}>
              <span style={s("flex:1;font-family:'IBM Plex Mono';font-size:12px;color:#3A3B42;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left")}>
                {activeLinkUrl}
              </span>
              <button
                className="zxex49ni"
                onClick={on.copy}
                style={s("border:none;background:transparent;color:#DA1E28;cursor:pointer;display:flex")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:6px 20px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Type</span>
              <span style={s("font-weight:600")}>{activeLink.type}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Amount</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{activeLink.amount}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Max uses</span>
              <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{activeLink.max}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Expiry</span>
              <span style={s("font-weight:600")}>{activeLink.expiry}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #F2F2F4;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Branch</span>
              <span style={s("font-weight:600")}>{activeLink.branch}</span>
            </div>
            <div style={s("display:flex;justify-content:space-between;padding:12px 0;font-size:13px")}>
              <span style={s("color:#8B8D96")}>Created by</span>
              <span style={s("font-weight:600")}>{activeLink.sales}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// One outcome count. Rendered muted at zero so the row reads as a full picture
// rather than hiding the categories that happen to be empty.
function Outcome({
  n,
  label,
  bg,
  fg,
  dot,
}: {
  n: number;
  label: string;
  bg: string;
  fg: string;
  dot?: string;
}) {
  const muted = n === 0;
  return (
    <span
      style={s(
        `display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:${muted ? "#F7F7F8" : bg};color:${muted ? "#A9ABB3" : fg}`,
      )}
    >
      {dot ? (
        <span
          style={s(
            `width:6px;height:6px;border-radius:50%;background:${muted ? "#D3D3D7" : dot}`,
          )}
        />
      ) : null}
      {n} {label}
    </span>
  );
}
