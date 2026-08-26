"use client";

import { s } from "@/lib/css";

export function AdminSettings() {
  return (
    <div
      data-pad=""
      style={s("padding:26px 30px;max-width:820px;margin:0 auto;animation:fadeUp .45s ease both;display:flex;flex-direction:column;gap:16px")}
    >
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:16px")}>
          Platform defaults
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#FAFAFB;border:1px solid #EEE;border-radius:11px;margin-bottom:12px")}>
          <div>
            <div style={s("font-size:13.5px;font-weight:600")}>Default currency for new merchants</div>
            <div style={s("font-size:12px;color:#8B8D96")}>Applied as the display & reporting base currency</div>
          </div>
          <select style={s("padding:9px 12px;border:1px solid #E3E3E6;border-radius:9px;font-size:13px;font-weight:600;background:#fff;cursor:pointer;font-family:'IBM Plex Mono'")}>
            <option>USD $</option>
            <option>ETB Br</option>
            <option>EUR €</option>
          </select>
        </div>
        <div style={s("display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#FAFAFB;border:1px solid #EEE;border-radius:11px")}>
          <div>
            <div style={s("font-size:13.5px;font-weight:600")}>Time zone</div>
            <div style={s("font-size:12px;color:#8B8D96")}>East Africa Time (EAT, UTC+3)</div>
          </div>
          <span style={s("font-size:13px;font-weight:600;font-family:'IBM Plex Mono'")}>UTC+3</span>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:6px")}>
          Supported currencies
        </div>
        <div style={s("font-size:12.5px;color:#8B8D96;margin-bottom:14px")}>
          Currencies merchants can price links in.
        </div>
        <div style={s("display:flex;gap:8px;flex-wrap:wrap")}>
          <span style={s("padding:7px 13px;background:#141519;color:#fff;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            USD $ · default
          </span>
          <span style={s("padding:7px 13px;background:#F2F2F4;color:#3A3B42;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            ETB Br
          </span>
          <span style={s("padding:7px 13px;background:#F2F2F4;color:#3A3B42;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            EUR €
          </span>
          <span style={s("padding:7px 13px;background:#F2F2F4;color:#3A3B42;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            GBP £
          </span>
          <span style={s("padding:7px 13px;background:#F2F2F4;color:#3A3B42;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            KES
          </span>
          <span style={s("padding:7px 13px;background:#F2F2F4;color:#3A3B42;border-radius:9px;font-size:12.5px;font-weight:600;font-family:'IBM Plex Mono'")}>
            AED
          </span>
          <button style={s("padding:7px 13px;border:1px dashed #C7C8CE;background:#fff;color:#6B6D76;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer")}>
            + Add
          </button>
        </div>
      </div>
      <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:15px;padding:22px;box-shadow:0 1px 2px rgba(20,21,25,.04)")}>
        <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:15px;margin-bottom:16px")}>
          Mastercard MPGS gateway
        </div>
        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Merchant ID
            </label>
            <input
              defaultValue="ZEMEN_MPGS_9920"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:14px;background:#FAFAFB;font-family:'IBM Plex Mono'")}
            />
          </div>
          <div>
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Environment
            </label>
            <input
              defaultValue="Production · api-gateway.mastercard.com"
              style={s("width:100%;padding:11px 14px;border:1px solid #E3E3E6;border-radius:10px;font-size:13px;background:#FAFAFB;font-family:'IBM Plex Mono'")}
            />
          </div>
        </div>
        {" "}
        <div style={s("display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:6px 12px;background:#E6F6EE;color:#12905A;border-radius:20px;font-size:12px;font-weight:600")}>
          <span style={s("width:7px;height:7px;border-radius:50%;background:#12905A")} />
          Connected · API v75
        </div>
      </div>
    </div>
  );
}
