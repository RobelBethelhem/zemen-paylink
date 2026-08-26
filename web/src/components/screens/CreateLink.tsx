"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function CreateLink() {
  const { amount, amountDisplay, createError, currency, paymentModeSeg, typeSplit, splitTarget, dynMax, dynMin, expiry, expiryLabel, generating, linkTypeLabel, maxScans, maxScansLabel, modeQuick, modeSeg, modeWizard, notOneTime, notStep1, notStep4, on, oneTime, reference, set, step1, step2, step3, step4, title, titleDisplay, typeDynamic, typeSeg, typeStatic, w } = useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:1120px;margin:0 auto;animation:fadeUp .45s ease both")}>
      {createError ? (
        <div
          style={s("display:flex;gap:10px;align-items:flex-start;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;margin-bottom:18px")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <span>{createError}</span>
        </div>
      ) : null}
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap")}>
        <button
          className="zxoy0gmr"
          onClick={on.backToLinks}
          style={s("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Cancel
        </button>
        <div style={s("flex:1")} />
        <div style={s("font-size:12px;color:#8B8D96;font-weight:500;margin-right:2px")}>Form style</div>
        <div style={s("display:flex;gap:6px;background:#F0F0F2;padding:4px;border-radius:11px")}>
          <button onClick={on.modeWizard} style={modeSeg.wizard}>Guided wizard</button>
          <button onClick={on.modeQuick} style={modeSeg.quick}>Quick form</button>
        </div>
      </div>
      <div data-grid-2="" style={s("display:grid;grid-template-columns:1.55fr 1fr;gap:22px;align-items:start")}>
        <div>
          {" "}
          {modeWizard && (
            <>
              <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:16px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
                <div style={s("display:flex;align-items:center;gap:6px;padding:18px 22px;border-bottom:1px solid #F0F0F2")}>
                  <div style={s("display:flex;align-items:center;gap:9px;flex:1")}>
                    <span style={s("width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                      {w.s1.done && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center")}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        </>
                      )}
                      {w.s1.active && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center")}>
                            1
                          </span>
                        </>
                      )}
                    </span>
                    <span style={s("font-size:13px;font-weight:600;color:#141519")}>Type</span>
                  </div>
                  <span style={s("width:26px;height:2px;background:#EDEDEF")} />
                  <div style={s("display:flex;align-items:center;gap:9px;flex:1")}>
                    <span style={s("width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                      {w.s2.done && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center")}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        </>
                      )}
                      {w.s2.active && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center")}>
                            2
                          </span>
                        </>
                      )}
                      {w.s2.todo && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#F2F2F4;color:#A9ABB3;display:flex;align-items:center;justify-content:center")}>
                            2
                          </span>
                        </>
                      )}
                    </span>
                    <span style={s("font-size:13px;font-weight:600;color:#141519")}>Details</span>
                  </div>
                  <span style={s("width:26px;height:2px;background:#EDEDEF")} />
                  <div style={s("display:flex;align-items:center;gap:9px;flex:1")}>
                    <span style={s("width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                      {w.s3.done && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center")}>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        </>
                      )}
                      {w.s3.active && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center")}>
                            3
                          </span>
                        </>
                      )}
                      {w.s3.todo && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#F2F2F4;color:#A9ABB3;display:flex;align-items:center;justify-content:center")}>
                            3
                          </span>
                        </>
                      )}
                    </span>
                    <span style={s("font-size:13px;font-weight:600;color:#141519")}>Limits</span>
                  </div>
                  <span style={s("width:26px;height:2px;background:#EDEDEF")} />
                  <div style={s("display:flex;align-items:center;gap:9px")}>
                    <span style={s("width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                      {w.s4.active && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center")}>
                            4
                          </span>
                        </>
                      )}
                      {w.s4.todo && (
                        <>
                          <span style={s("width:26px;height:26px;border-radius:50%;background:#F2F2F4;color:#A9ABB3;display:flex;align-items:center;justify-content:center")}>
                            4
                          </span>
                        </>
                      )}
                    </span>
                    <span style={s("font-size:13px;font-weight:600;color:#141519")}>Review</span>
                  </div>
                </div>
                <div style={s("padding:24px 22px;min-height:280px")}>
                  {" "}
                  {step1 && (
                    <>
                      <div style={s("animation:fadeIn .3s ease both")}>
                        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:3px")}>
                          What kind of payment link?
                        </div>
                        <div style={s("font-size:13px;color:#8B8D96;margin-bottom:18px")}>
                          Choose whether the amount is fixed, entered by the payer, or a bill
                          several people share.
                        </div>
                        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
                          <button
                            className="zxoy0gmr"
                            onClick={on.typeStatic}
                            style={s("text-align:left;padding:18px;border-radius:13px;cursor:pointer;background:#fff;position:relative")}
                          >
                            {typeStatic && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:13px;border:2px solid #DA1E28")} />
                                <span style={s("position:absolute;top:14px;right:14px;width:20px;height:20px;border-radius:50%;background:#DA1E28;display:flex;align-items:center;justify-content:center")}>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="3"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                </span>
                              </>
                            )}
                            {" "}
                            {typeDynamic && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:13px;border:1.5px solid #E7E7EA")} />
                              </>
                            )}
                            {" "}
                            <span style={s("position:relative")}>
                              <span style={s("width:40px;height:40px;border-radius:10px;background:#FDECED;display:flex;align-items:center;justify-content:center;margin-bottom:12px")}>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#DA1E28"
                                  strokeWidth="1.8"
                                >
                                  <rect x="2" y="5" width="20" height="14" rx="2" />
                                  <path d="M2 10h20" />
                                </svg>
                              </span>
                              <span style={s("display:block;font-size:14.5px;font-weight:600;margin-bottom:3px")}>
                                Static amount
                              </span>
                              <span style={s("display:block;font-size:12.5px;color:#8B8D96;line-height:1.5")}>
                                Fixed price set by you. Best for invoices, tickets, memberships.
                              </span>
                            </span>
                          </button>
                          <button
                            className="zxoy0gmr"
                            onClick={on.typeDynamic}
                            style={s("text-align:left;padding:18px;border-radius:13px;cursor:pointer;background:#fff;position:relative")}
                          >
                            {typeDynamic && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:13px;border:2px solid #DA1E28")} />
                                <span style={s("position:absolute;top:14px;right:14px;width:20px;height:20px;border-radius:50%;background:#DA1E28;display:flex;align-items:center;justify-content:center")}>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="3"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                </span>
                              </>
                            )}
                            {" "}
                            {typeStatic && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:13px;border:1.5px solid #E7E7EA")} />
                              </>
                            )}
                            {" "}
                            <span style={s("position:relative")}>
                              <span style={s("width:40px;height:40px;border-radius:10px;background:#FDECED;display:flex;align-items:center;justify-content:center;margin-bottom:12px")}>
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#DA1E28"
                                  strokeWidth="1.8"
                                >
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                              </span>
                              <span style={s("display:block;font-size:14.5px;font-weight:600;margin-bottom:3px")}>
                                Dynamic amount
                              </span>
                              <span style={s("display:block;font-size:12.5px;color:#8B8D96;line-height:1.5")}>
                                Payer enters the amount. Best for donations, top-ups, open bills.
                              </span>
                            </span>
                          </button>
                        </div>
                        <button
                          className="zxoy0gmr"
                          onClick={on.typeSplit}
                          style={s("width:100%;text-align:left;padding:18px;border-radius:13px;cursor:pointer;background:#fff;position:relative;margin-top:14px;display:flex;align-items:flex-start;gap:14px")}
                        >
                          {typeSplit ? (
                            <>
                              <span style={s("position:absolute;inset:0;border-radius:13px;border:2px solid #DA1E28")} />
                              <span style={s("position:absolute;top:14px;right:14px;width:20px;height:20px;border-radius:50%;background:#DA1E28;display:flex;align-items:center;justify-content:center")}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </span>
                            </>
                          ) : (
                            <span style={s("position:absolute;inset:0;border-radius:13px;border:1.5px solid #E7E7EA")} />
                          )}
                          <span style={s("position:relative;width:40px;height:40px;border-radius:10px;background:#FDECED;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DA1E28" strokeWidth="1.8">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
                            </svg>
                          </span>
                          <span style={s("position:relative;min-width:0")}>
                            <span style={s("display:block;font-size:14.5px;font-weight:600;margin-bottom:3px")}>
                              Split a bill
                            </span>
                            <span style={s("display:block;font-size:12.5px;color:#8B8D96;line-height:1.5")}>
                              One total, shared by several payers. Everyone sees what is left, and
                              the link closes itself once the bill is settled.
                            </span>
                          </span>
                        </button>
                        {typeSplit ? (
                          <div style={s("margin-top:18px;animation:fadeIn .25s ease both")}>
                            <label style={s("display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                              Total bill amount
                            </label>
                            <div style={s("display:flex;gap:10px")}>
                              <select
                                value={currency}
                                onChange={set.currency}
                                style={s("width:110px;padding:12px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;font-weight:600;cursor:pointer")}
                              >
                                <option value="USD">USD $</option>
                                <option value="ETB">ETB Br</option>
                                <option value="EUR">EUR €</option>
                                <option value="GBP">GBP £</option>
                              </select>
                              <input
                                className="zxq6owgx"
                                value={splitTarget}
                                onChange={set.splitTarget}
                                inputMode="decimal"
                                placeholder="1,000.00"
                                style={s("flex:1;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:16px;font-family:'IBM Plex Mono';background:#FAFAFB")}
                              />
                            </div>
                            <div style={s("font-size:12px;color:#9A9CA5;margin-top:8px;line-height:1.55")}>
                              Contributions are capped at whatever is still owed, so the bill can
                              never be overpaid.
                            </div>
                          </div>
                        ) : null}
                        <div style={s("margin-top:26px")}>
                          <div style={s("font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:4px")}>
                            When should the customer be charged?
                          </div>
                          <div style={s("font-size:12.5px;color:#8B8D96;line-height:1.55;margin-bottom:12px")}>
                            Reserving holds the funds on the card so you can take them later — in one
                            go, or in parts as you deliver.
                          </div>
                          <div style={s("display:flex;gap:10px")}>
                            <button onClick={on.modeCharge} style={paymentModeSeg.charge}>
                              Charge immediately
                            </button>
                            <button onClick={on.modeReserve} style={paymentModeSeg.reserve}>
                              Reserve now, charge later
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {" "}
                  {" "}
                  {step2 && (
                    <>
                      <div style={s("animation:fadeIn .3s ease both")}>
                        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                          Payment details
                        </div>
                        {" "}
                        {typeStatic && (
                          <>
                            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                              Amount
                            </label>
                            {" "}
                            <div style={s("display:flex;gap:10px;margin-bottom:16px")}>
                              <select
                                value={currency}
                                onChange={set.currency}
                                style={s("width:110px;padding:12px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;font-weight:600;cursor:pointer")}
                              >
                                <option value="USD">USD $</option>
                                <option value="ETB">ETB Br</option>
                                <option value="EUR">EUR €</option>
                                <option value="GBP">GBP £</option>
                                <option value="KES">KES</option>
                                <option value="AED">AED</option>
                              </select>
                              <input
                                className="zx20fx8r"
                                onChange={set.amount}
                                inputMode="decimal"
                                placeholder="0.00"
                                value={amount}
                                style={s("flex:1;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:15px;font-family:'IBM Plex Mono';font-weight:600")}
                              />
                            </div>
                          </>
                        )}
                        {" "}
                        {typeDynamic && (
                          <>
                            <div style={s("display:flex;align-items:center;gap:9px;background:#FDECED;border-radius:11px;padding:12px 14px;margin-bottom:16px")}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#B0141C"
                                strokeWidth="1.8"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                              </svg>
                              <span style={s("font-size:12.5px;color:#B0141C")}>
                                The payer will enter the amount on the payment page. Set optional limits below.
                              </span>
                            </div>
                            <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px")}>
                              <div>
                                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                                  Minimum (optional)
                                </label>
                                <input
                                  className="zx20fx8r"
                                  onChange={set.dynMin}
                                  placeholder="0.00"
                                  value={dynMin}
                                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                                />
                              </div>
                              <div>
                                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                                  Maximum (optional)
                                </label>
                                <input
                                  className="zx20fx8r"
                                  onChange={set.dynMax}
                                  placeholder="No limit"
                                  value={dynMax}
                                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        {" "}
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Title / what's this for?
                        </label>
                        {" "}
                        <input
                          className="zx20fx8r"
                          onChange={set.title}
                          placeholder="e.g. Invoice #INV-2044"
                          value={title}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;margin-bottom:16px")}
                        />
                        {" "}
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          {"Reference / note "}
                          <span style={s("color:#A9ABB3;font-weight:400")}>(optional)</span>
                        </label>
                        {" "}
                        <input
                          className="zx20fx8r"
                          onChange={set.reference}
                          placeholder="Internal reference shown on the receipt"
                          value={reference}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                    </>
                  )}
                  {" "}
                  {" "}
                  {step3 && (
                    <>
                      <div style={s("animation:fadeIn .3s ease both")}>
                        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                          Limits & security
                        </div>
                        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px")}>
                          <div>
                            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                              Maximum scans / uses
                            </label>
                            <input
                              className="zx20fx8r"
                              onChange={set.maxScans}
                              inputMode="numeric"
                              placeholder="Unlimited"
                              value={maxScans}
                              style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                            />
                            <span style={s("display:block;font-size:11.5px;color:#9A9CA5;margin-top:6px")}>
                              Link stops accepting payments after this many.
                            </span>
                          </div>
                          <div>
                            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                              Expires on
                            </label>
                            <input
                              className="zx20fx8r"
                              onChange={set.expiry}
                              type="date"
                              value={expiry}
                              style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;color:#3A3B42")}
                            />
                            <span style={s("display:block;font-size:11.5px;color:#9A9CA5;margin-top:6px")}>
                              Leave empty for no expiry.
                            </span>
                          </div>
                        </div>
                        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:1px solid #E7E7EA;border-radius:12px;margin-bottom:12px")}>
                          <div>
                            <div style={s("font-size:13.5px;font-weight:600")}>One-time use</div>
                            <div style={s("font-size:12px;color:#8B8D96")}>
                              Link closes after the first successful payment.
                            </div>
                          </div>
                          <button
                            onClick={on.toggleOneTime}
                            style={s("width:46px;height:26px;border-radius:14px;border:none;cursor:pointer;position:relative;flex-shrink:0")}
                          >
                            {oneTime && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:14px;background:#DA1E28")} />
                                <span style={s("position:absolute;top:3px;left:23px;width:20px;height:20px;border-radius:50%;background:#fff")} />
                              </>
                            )}
                            {notOneTime && (
                              <>
                                <span style={s("position:absolute;inset:0;border-radius:14px;background:#D8D8DC")} />
                                <span style={s("position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff")} />
                              </>
                            )}
                          </button>
                        </div>
                        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:1px solid #E7E7EA;border-radius:12px;background:#FAFAFB")}>
                          <div style={s("display:flex;align-items:center;gap:11px")}>
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#12905A"
                              strokeWidth="1.8"
                            >
                              <rect x="4" y="10" width="16" height="11" rx="2" />
                              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </svg>
                            <div>
                              <div style={s("font-size:13.5px;font-weight:600")}>3-D Secure authentication</div>
                              <div style={s("font-size:12px;color:#8B8D96")}>
                                Mastercard MPGS card verification — always on.
                              </div>
                            </div>
                          </div>
                          <span style={s("display:inline-flex;align-items:center;gap:6px;padding:5px 11px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:11.5px;font-weight:600")}>
                            Enabled
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  {" "}
                  {" "}
                  {step4 && (
                    <>
                      <div style={s("animation:fadeIn .3s ease both")}>
                        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                          Review & generate
                        </div>
                        <div style={s("border:1px solid #EEE;border-radius:13px;overflow:hidden")}>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Type</span>
                            <span style={s("font-weight:600")}>{linkTypeLabel}</span>
                          </div>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Amount</span>
                            <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{amountDisplay}</span>
                          </div>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Title</span>
                            <span style={s("font-weight:600")}>{titleDisplay}</span>
                          </div>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Max uses</span>
                            <span style={s("font-weight:600")}>{maxScansLabel}</span>
                          </div>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Expiry</span>
                            <span style={s("font-weight:600")}>{expiryLabel}</span>
                          </div>
                          <div style={s("display:flex;justify-content:space-between;padding:13px 16px;font-size:13.5px")}>
                            <span style={s("color:#8B8D96")}>Gateway</span>
                            <span style={s("font-weight:600;display:flex;align-items:center;gap:6px")}>
                              <span style={s("display:inline-flex")}>
                                <span style={s("width:14px;height:14px;border-radius:50%;background:#EB001B")} />
                                <span style={s("width:14px;height:14px;border-radius:50%;background:#F79E1B;margin-left:-6px")} />
                              </span>
                              Mastercard MPGS
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div style={s("display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-top:1px solid #F0F0F2;background:#FAFAFB")}>
                  {notStep1 && (
                    <>
                      <button
                        className="zxoy0gmr"
                        onClick={on.wizBack}
                        style={s("display:flex;align-items:center;gap:7px;padding:11px 18px;border:1px solid #E3E3E6;background:#fff;border-radius:11px;font-size:13.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                        Back
                      </button>
                    </>
                  )}
                  {step1 && (
                    <>
                      <span />
                    </>
                  )}
                  {notStep4 && (
                    <>
                      <button
                        className="zx15p5ni"
                        onClick={on.wizNext}
                        style={s("display:flex;align-items:center;gap:8px;padding:11px 22px;border:none;background:#141519;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer")}
                      >
                        Continue
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </>
                  )}
                  {step4 && (
                    <>
                      <button
                        className="zxvmr3xp"
                        onClick={on.generate}
                        style={s("display:flex;align-items:center;gap:9px;padding:11px 24px;border:none;background:#DA1E28;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3)")}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Generate link
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          {" "}
          {" "}
          {modeQuick && (
            <>
              <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:16px;box-shadow:0 1px 2px rgba(20,21,25,.04);padding:24px 22px")}>
                <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                  New payment link
                </div>
                {" "}
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Amount type
                </label>
                {" "}
                <div style={s("display:flex;gap:10px;margin-bottom:16px")}>
                  <button onClick={on.typeStatic} style={typeSeg.static}>Static amount</button>
                  <button onClick={on.typeDynamic} style={typeSeg.dynamic}>Dynamic amount</button>
                </div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Charge timing
                </label>
                <div style={s("display:flex;gap:10px;margin-bottom:16px")}>
                  <button onClick={on.modeCharge} style={paymentModeSeg.charge}>Charge now</button>
                  <button onClick={on.modeReserve} style={paymentModeSeg.reserve}>Reserve now</button>
                </div>
                {" "}
                {typeStatic && (
                  <>
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Amount
                    </label>
                    {" "}
                    <div style={s("display:flex;gap:10px;margin-bottom:16px")}>
                      <select
                        value={currency}
                        onChange={set.currency}
                        style={s("width:110px;padding:12px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;font-weight:600;cursor:pointer")}
                      >
                        <option value="USD">USD $</option>
                        <option value="ETB">ETB Br</option>
                        <option value="EUR">EUR €</option>
                        <option value="GBP">GBP £</option>
                        <option value="KES">KES</option>
                        <option value="AED">AED</option>
                      </select>
                      <input
                        className="zx20fx8r"
                        onChange={set.amount}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        style={s("flex:1;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:15px;font-family:'IBM Plex Mono';font-weight:600")}
                      />
                    </div>
                  </>
                )}
                {" "}
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Title
                </label>
                {" "}
                <input
                  className="zx20fx8r"
                  onChange={set.title}
                  placeholder="e.g. Invoice #INV-2044"
                  value={title}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;margin-bottom:16px")}
                />
                {" "}
                <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px")}>
                  <div>
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Max scans / uses
                    </label>
                    <input
                      className="zx20fx8r"
                      onChange={set.maxScans}
                      inputMode="numeric"
                      placeholder="Unlimited"
                      value={maxScans}
                      style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                    />
                  </div>
                  <div>
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Expires on
                    </label>
                    <input
                      className="zx20fx8r"
                      onChange={set.expiry}
                      type="date"
                      value={expiry}
                      style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;color:#3A3B42")}
                    />
                  </div>
                </div>
                <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border:1px solid #E7E7EA;border-radius:12px;margin-bottom:20px")}>
                  <div style={s("font-size:13.5px;font-weight:600")}>One-time use</div>
                  <button
                    onClick={on.toggleOneTime}
                    style={s("width:46px;height:26px;border-radius:14px;border:none;cursor:pointer;position:relative")}
                  >
                    {oneTime && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:14px;background:#DA1E28")} />
                        <span style={s("position:absolute;top:3px;left:23px;width:20px;height:20px;border-radius:50%;background:#fff")} />
                      </>
                    )}
                    {notOneTime && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:14px;background:#D8D8DC")} />
                        <span style={s("position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff")} />
                      </>
                    )}
                  </button>
                </div>
                {" "}
                <button
                  className="zxvmr3xp"
                  onClick={on.generate}
                  style={s("width:100%;display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;border:none;background:#DA1E28;color:#fff;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3)")}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Generate link
                </button>
              </div>
            </>
          )}
        </div>
        <div style={s("position:sticky;top:84px")}>
          <div style={s("font-size:11px;color:#9A9CA5;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:10px")}>
            Live customer preview
          </div>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:18px;box-shadow:0 12px 34px rgba(20,21,25,.1);overflow:hidden")}>
            <div style={s("background:#141519;padding:14px 18px;display:flex;align-items:center;justify-content:space-between")}>
              <div style={s("display:flex;align-items:center;gap:9px")}>
                <img src="/zemen-logo-light.png" alt="Zemen Bank" style={s("height:22px;width:auto;display:block")} />
                <span style={s("width:1px;height:18px;background:rgba(255,255,255,.18)")} />
                <span style={s("font-family:'Space Grotesk';font-weight:600;font-size:13px;color:#fff")}>
                  PayLink
                </span>
              </div>
              <span style={s("display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#8FE3B8")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                Secure
              </span>
            </div>
            <div style={s("padding:22px 20px")}>
              <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:18px")}>
                <span style={s("width:38px;height:38px;border-radius:10px;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600")}>
                  ST
                </span>
                <div>
                  <div style={s("font-size:13.5px;font-weight:600")}>Sheba Trading PLC</div>
                  <div style={s("font-size:11.5px;color:#9A9CA5")}>Bole Branch · Addis Ababa</div>
                </div>
              </div>
              <div style={s("text-align:center;padding:8px 0 18px")}>
                <div style={s("font-size:12px;color:#8B8D96;margin-bottom:6px")}>Amount due</div>
                <div style={s("font-family:'Space Grotesk';font-weight:700;font-size:38px;letter-spacing:-.02em;color:#141519")}>
                  {amountDisplay}
                </div>
                <div style={s("font-size:13px;color:#5B5D66;margin-top:6px")}>{titleDisplay}</div>
              </div>
              {" "}
              <button style={s("width:100%;padding:14px;border:none;background:#DA1E28;color:#fff;border-radius:12px;font-size:14.5px;font-weight:600;cursor:default")}>
                Pay securely
              </button>
              {" "}
              <div style={s("display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px")}>
                <span style={s("display:inline-flex;align-items:center")}>
                  <span style={s("width:19px;height:19px;border-radius:50%;background:#EB001B")} />
                  <span style={s("width:19px;height:19px;border-radius:50%;background:#F79E1B;margin-left:-8px")} />
                </span>
                <span style={s("font-family:'Space Grotesk';font-weight:700;font-style:italic;font-size:15px;color:#1A1F71")}>
                  VISA
                </span>
                <span style={s("font-size:11px;color:#B4B6BD")}>·</span>
                <span style={s("font-size:11px;color:#9A9CA5")}>MPGS</span>
              </div>
            </div>
          </div>
          <div style={s("display:flex;gap:8px;margin-top:14px;flex-wrap:wrap")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:#fff;border:1px solid #E7E7EA;border-radius:9px;font-size:12px;color:#5B5D66")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B8D96" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {expiryLabel}
            </span>
            <span style={s("display:inline-flex;align-items:center;gap:6px;padding:7px 12px;background:#fff;border:1px solid #E7E7EA;border-radius:9px;font-size:12px;color:#5B5D66")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B8D96" strokeWidth="1.8">
                <path d="M3 3v18h18" />
              </svg>
              {maxScansLabel}
            </span>
          </div>
        </div>
      </div>
      {" "}
      {generating && (
        <>
          <div style={s("position:fixed;inset:0;background:rgba(20,21,25,.55);backdrop-filter:blur(4px);z-index:150;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease both")}>
            <div style={s("background:#fff;border-radius:18px;padding:34px 40px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.4)")}>
              <div style={s("width:52px;height:52px;border-radius:50%;border:3px solid #F0F0F2;border-top-color:#DA1E28;margin:0 auto 18px;animation:spin .8s linear infinite")} />
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px")}>
                Creating your secure link…
              </div>
              <div style={s("font-size:13px;color:#8B8D96;margin-top:5px")}>Registering with Mastercard MPGS</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
