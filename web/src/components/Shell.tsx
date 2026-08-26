"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function Shell({ children }: { children: React.ReactNode }) {
  const { baseCurrency, isAdmin, isAdminDashboard, isAdminMerchants, isAdminSettings, isAdminTransactions, isMerchBranches, isMerchDashboard, isMerchLinks, isMerchSettings, isMerchTeam, isMerchTransactions, isMerchant, isSales, isSalesDashboard, isSalesLinks, isSalesTransactions, isTestMode, layoutSidebar, layoutTopnav, on, pageSub, pageTitle, roleLabel, sidebarOpen, user } = useApp();
  return (
    <div style={s("min-height:100vh")}>
      {" "}
      {layoutSidebar && (
        <>
          <aside
            data-sidebar=""
            data-open={sidebarOpen ? "true" : undefined}
            style={s("width:250px;position:fixed;top:0;left:0;bottom:0;background:#141519;display:flex;flex-direction:column;padding:20px 14px;z-index:60")}
          >
            <div style={s("display:flex;align-items:center;gap:11px;padding:6px 8px 20px")}>
              <img src="/zemen-logo-light.png" alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
              <span style={s("width:1px;height:26px;background:rgba(255,255,255,.16)")} />
              <div>
                <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;color:#fff;letter-spacing:-.01em;line-height:1.1")}>
                  PayLink
                </div>
                <div style={s("font-size:10px;color:#71737C;letter-spacing:.12em;text-transform:uppercase;margin-top:1px")}>
                  {roleLabel}
                </div>
              </div>
            </div>
            <div data-anchor="nav" style={s("flex:1;display:flex;flex-direction:column;gap:3px;padding-top:6px")}>
              {isAdmin && (
                <>
                  <button
                    className="zx1qvdbo"
                    onClick={on.adminDash}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isAdminDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="3" width="7" height="9" rx="1.5" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" />
                      </svg>
                      <span>Overview</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.adminMerchants}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isAdminMerchants && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 9l1.5-5h15L21 9" />
                        <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                        <path d="M4 9h16" />
                        <path d="M9 21v-6h6v6" />
                      </svg>
                      <span>Merchants</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.adminTxns}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isAdminTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3v18h18" />
                        <path d="M7 14v3M12 9v8M17 5v12" />
                      </svg>
                      <span>Transactions</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.adminSettings}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isAdminSettings && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Settings</span>
                    </span>
                  </button>
                </>
              )}
              {isMerchant && (
                <>
                  <button
                    className="zxvmr3xp"
                    onClick={on.merchCreate}
                    style={s("display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:12px;margin-bottom:8px;border:none;background:#DA1E28;color:#fff;font-size:14px;font-weight:600;border-radius:11px;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.32)")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Pay-Link
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchDash}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="3" width="7" height="9" rx="1.5" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" />
                      </svg>
                      <span>Overview</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchLinks}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchLinks && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>Pay Links</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchTxns}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3v18h18" />
                        <path d="M7 14v3M12 9v8M17 5v12" />
                      </svg>
                      <span>Transactions</span>
                    </span>
                  </button>
                  {" "}
                  <div style={s("height:1px;background:rgba(255,255,255,.07);margin:9px 12px")} />
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchBranches}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchBranches && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="4" y="3" width="16" height="18" rx="1.5" />
                        <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h6" />
                      </svg>
                      <span>Branches</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchTeam}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchTeam && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13A4 4 0 0 1 16 11" />
                      </svg>
                      <span>Team</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.merchSettings}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isMerchSettings && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Settings</span>
                    </span>
                  </button>
                </>
              )}
              {isSales && (
                <>
                  <button
                    className="zxvmr3xp"
                    onClick={on.salesCreate}
                    style={s("display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:12px;margin-bottom:8px;border:none;background:#DA1E28;color:#fff;font-size:14px;font-weight:600;border-radius:11px;cursor:pointer;box-shadow:0 6px 16px rgba(218,30,40,.32)")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Pay-Link
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.salesDash}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isSalesDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="3" width="7" height="9" rx="1.5" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" />
                      </svg>
                      <span>Overview</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.salesLinks}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isSalesLinks && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>My Links</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.salesTxns}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    {isSalesTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:10px;background:rgba(218,30,40,.14)")} />
                        <span style={s("position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3v18h18" />
                        <path d="M7 14v3M12 9v8M17 5v12" />
                      </svg>
                      <span>My Payments</span>
                    </span>
                  </button>
                  {" "}
                  <button
                    className="zx1qvdbo"
                    onClick={on.connectGateway}
                    style={s("position:relative;display:flex;align-items:center;width:100%;padding:11px 14px;border:none;background:transparent;color:#A8AAB2;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
                  >
                    <span style={s("position:relative;display:flex;align-items:center;gap:12px;width:100%")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="2" y="6" width="20" height="13" rx="2" />
                        <path d="M2 10h20" />
                        <path d="M6 15h4" />
                      </svg>
                      <span>Gateway</span>
                      <span style={s("flex:1")} />
                      <span
                        style={s(
                          `font-size:10px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:20px;${
                            isTestMode
                              ? "background:rgba(232,163,61,.18);color:#E8A33D"
                              : "background:rgba(34,160,107,.18);color:#3ECF8E"
                          }`,
                        )}
                      >
                        {isTestMode ? "TEST" : "LIVE"}
                      </span>
                    </span>
                  </button>
                </>
              )}
            </div>
            <div style={s("border-top:1px solid rgba(255,255,255,.08);padding-top:12px;margin-top:8px")}>
              <button
                className="zx1qvdbo"
                onClick={on.logout}
                style={s("display:flex;align-items:center;gap:12px;width:100%;padding:11px 14px;border:none;background:transparent;color:#9A9CA5;font-size:14px;font-weight:500;border-radius:10px;cursor:pointer;text-align:left")}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}
      {" "}
      {" "}
      {layoutTopnav && (
        <>
          <header style={s("position:sticky;top:0;z-index:60;background:#141519;padding:0 26px;height:62px;display:flex;align-items:center;gap:26px")}>
            <div style={s("display:flex;align-items:center;gap:11px")}>
              <img src="/zemen-logo-light.png" alt="Zemen Bank" style={s("height:26px;width:auto;display:block")} />
              <span style={s("width:1px;height:22px;background:rgba(255,255,255,.16)")} />
              <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;color:#fff")}>PayLink</div>
            </div>
            <div
              data-anchor="topnav"
              data-topnav-links=""
              style={s("flex:1;display:flex;align-items:center;gap:4px")}
            >
              {isAdmin && (
                <>
                  <button
                    className="zx18v80m"
                    onClick={on.adminDash}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isAdminDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Overview</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.adminMerchants}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isAdminMerchants && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Merchants</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.adminTxns}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isAdminTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Transactions</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.adminSettings}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isAdminSettings && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Settings</span>
                  </button>
                </>
              )}
              {isMerchant && (
                <>
                  <button
                    className="zx18v80m"
                    onClick={on.merchDash}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isMerchDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Overview</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.merchLinks}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isMerchLinks && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Pay Links</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.merchTxns}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isMerchTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Transactions</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.merchBranches}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isMerchBranches && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Branches</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.merchTeam}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isMerchTeam && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Team</span>
                  </button>
                  {" "}
                  <button
                    className="zxvmr3xp"
                    onClick={on.merchCreate}
                    style={s("margin-left:6px;display:flex;align-items:center;gap:7px;padding:8px 14px;border:none;background:#DA1E28;color:#fff;font-size:13px;font-weight:600;border-radius:9px;cursor:pointer")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Link
                  </button>
                </>
              )}
              {isSales && (
                <>
                  <button
                    className="zx18v80m"
                    onClick={on.salesDash}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isSalesDashboard && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>Overview</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.salesLinks}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isSalesLinks && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>My Links</span>
                  </button>
                  {" "}
                  <button
                    className="zx18v80m"
                    onClick={on.salesTxns}
                    style={s("position:relative;padding:9px 14px;border:none;background:transparent;color:#B4B6BD;font-size:13.5px;font-weight:500;border-radius:9px;cursor:pointer")}
                  >
                    {isSalesTransactions && (
                      <>
                        <span style={s("position:absolute;inset:0;border-radius:9px;background:rgba(255,255,255,.08)")} />
                        <span style={s("position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:#DA1E28")} />
                      </>
                    )}
                    <span style={s("position:relative")}>My Payments</span>
                  </button>
                  {" "}
                  <button
                    className="zxvmr3xp"
                    onClick={on.salesCreate}
                    style={s("margin-left:6px;display:flex;align-items:center;gap:7px;padding:8px 14px;border:none;background:#DA1E28;color:#fff;font-size:13px;font-weight:600;border-radius:9px;cursor:pointer")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Link
                  </button>
                </>
              )}
            </div>
            <div style={s("display:flex;align-items:center;gap:10px")}>
              {isSales && (
                <button
                  className="zx1ykct0"
                  onClick={on.connectGateway}
                  title="Gateway settings"
                  style={s(
                    `display:flex;align-items:center;gap:7px;border:none;border-radius:9px;padding:8px 12px;font-size:11.5px;font-weight:700;letter-spacing:.05em;cursor:pointer;${
                      isTestMode
                        ? "background:rgba(232,163,61,.16);color:#E8A33D"
                        : "background:rgba(34,160,107,.16);color:#3ECF8E"
                    }`,
                  )}
                >
                  <span
                    style={s(
                      `width:7px;height:7px;border-radius:50%;background:${isTestMode ? "#E8A33D" : "#3ECF8E"}`,
                    )}
                  />
                  {isTestMode ? "TEST MODE" : "LIVE"}
                </button>
              )}
              <div style={s("display:flex;align-items:center;gap:9px;padding:5px 6px 5px 12px;background:rgba(255,255,255,.06);border-radius:30px")}>
                <div style={s("text-align:right")}>
                  <div style={s("font-size:12.5px;font-weight:600;color:#fff;line-height:1.1")}>{user.name}</div>
                  <div style={s("font-size:10.5px;color:#8B8D96")}>{user.sub}</div>
                </div>
                <div style={s("width:32px;height:32px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600")}>
                  {user.initials}
                </div>
              </div>
              <button
                className="zx1ykct0"
                onClick={on.logout}
                title="Sign out"
                style={s("width:34px;height:34px;border-radius:9px;border:none;background:rgba(255,255,255,.06);color:#9A9CA5;display:flex;align-items:center;justify-content:center;cursor:pointer")}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>
          </header>
        </>
      )}
      {" "}
      <div
        data-scrim=""
        data-open={sidebarOpen ? "true" : undefined}
        onClick={on.closeSidebar}
        style={s("position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:55")}
      />
      <div
        data-main={layoutSidebar ? "true" : undefined}
        style={s("min-height:100vh;display:flex;flex-direction:column")}
      >
        {layoutSidebar && (
          <>
            <header style={s("position:sticky;top:0;z-index:40;background:rgba(245,245,246,.86);backdrop-filter:blur(10px);border-bottom:1px solid #E9E9EC;padding:0 28px;height:64px;display:flex;align-items:center;gap:16px")}>
              <button
                data-only-mobile=""
                onClick={on.openSidebar}
                style={s("width:38px;height:38px;border-radius:10px;border:1px solid #E3E3E6;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141519" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:19px;letter-spacing:-.01em")}>
                  {pageTitle}
                </div>
                <div data-hide-mobile="" style={s("font-size:12.5px;color:#8B8D96")}>{pageSub}</div>
              </div>
              <div style={s("flex:1")} />
              <div
                data-hide-mobile=""
                style={s("display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7E7EA;border-radius:11px;padding:9px 13px;width:250px")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9CA5" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  placeholder="Search links, transactions…"
                  style={s("border:none;background:transparent;font-size:13.5px;width:100%")}
                />
              </div>
              {isSales && (
                <button
                  className="zxoy0gmr"
                  onClick={on.connectGateway}
                  title={
                    isTestMode
                      ? "Working against the Mastercard test gateway — nothing here moves real money. Click to open your gateway settings."
                      : "Working against the production Mastercard gateway. Click to open your gateway settings."
                  }
                  style={s(
                    isTestMode
                      ? "display:flex;align-items:center;gap:7px;background:#FEF3E2;border:1px solid #F3D9A8;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;color:#8A5A00;letter-spacing:.04em;cursor:pointer"
                      : "display:flex;align-items:center;gap:7px;background:#E6F6EE;border:1px solid #BCE6D2;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;color:#0E7A4C;letter-spacing:.04em;cursor:pointer",
                  )}
                >
                  <span
                    style={s(
                      `width:7px;height:7px;border-radius:50%;background:${isTestMode ? "#E8A33D" : "#12905A"}`,
                    )}
                  />
                  {isTestMode ? "TEST MODE" : "LIVE"}
                </button>
              )}
              <div
                data-hide-mobile=""
                style={s("display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #E7E7EA;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:600;color:#3A3B42")}
              >
                <span style={s("width:7px;height:7px;border-radius:50%;background:#22A06B")} />
                {baseCurrency}
              </div>
              <button
                className="zxoy0gmr"
                style={s("position:relative;width:40px;height:40px;border-radius:11px;border:1px solid #E7E7EA;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141519" strokeWidth="1.8">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <span style={s("position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:#DA1E28;border:1.5px solid #fff")} />
              </button>
              <div data-hide-mobile="" style={s("display:flex;align-items:center;gap:9px;padding-left:6px")}>
                <div style={s("width:38px;height:38px;border-radius:50%;background:#141519;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600")}>
                  {user.initials}
                </div>
                <div>
                  <div style={s("font-size:13px;font-weight:600;line-height:1.15")}>{user.name}</div>
                  <div style={s("font-size:11.5px;color:#8B8D96")}>{user.sub}</div>
                </div>
              </div>
            </header>
          </>
        )}
        <div data-anchor="screen" style={s("flex:1")}>{children}</div>
      </div>
    </div>
  );
}
