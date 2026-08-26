"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { s } from "@/lib/css";

// Renders a QR that actually encodes the payment link, so "scan to pay" works
// from a printed receipt or a phone held up at a counter.
export function LinkQr({ url, size = 158 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size * 3, // oversampled so it stays crisp when scaled or printed
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#141519", light: "#FFFFFF" },
    })
      .then((generated) => {
        if (!cancelled) setDataUrl(generated);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        style={s(
          `width:${size}px;height:${size}px;border-radius:6px;background:#F5F5F6;display:flex;align-items:center;justify-content:center`,
        )}
      >
        <span
          style={s(
            "width:20px;height:20px;border:2px solid #E0E0E3;border-top-color:#DA1E28;border-radius:50%;animation:spin .8s linear infinite",
          )}
        />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${url}`}
      style={s(`width:${size}px;height:${size}px;display:block;border-radius:6px`)}
    />
  );
}
