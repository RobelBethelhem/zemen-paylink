"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type SecurityStatus } from "@/lib/api";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";
import { useSession } from "@/store/SessionProvider";

// Set once, right after signing in. Recovery has to be arranged before it is
// needed — an operator who has already lost their password cannot set this up.
//
// The current password is required to save: without it, a session someone else
// had got hold of could quietly install its own answers and keep the account.
export function SecurityQuestions() {
  const { on } = useApp();
  const { session, refresh } = useSession();

  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [picked, setPicked] = useState<string[]>(["", "", ""]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .securityQuestions()
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        // Prefill distinct defaults so the three selects never start identical.
        setPicked(
          next.questions.length
            ? next.questions.map((q) => q.prompt)
            : next.prompts.slice(0, 3),
        );
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the recovery questions.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function choose(index: number, prompt: string) {
    setPicked((prev) => prev.map((p, i) => (i === index ? prompt : p)));
  }

  function answer(index: number, value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  const duplicate = new Set(picked.filter(Boolean)).size !== picked.filter(Boolean).length;

  async function submit() {
    setError("");
    if (duplicate) {
      setError("Choose three different questions.");
      return;
    }
    if (picked.some((p) => !p) || answers.some((a) => a.trim().length < 2)) {
      setError("Answer all three questions.");
      return;
    }
    setBusy(true);
    try {
      await api.setSecurityQuestions({
        currentPassword,
        questions: picked.map((prompt, i) => ({ prompt, answer: answers[i] })),
      });
      setDone(true);
      setAnswers(["", "", ""]);
      setCurrentPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your answers.");
    } finally {
      setBusy(false);
    }
  }

  const label = "display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px";
  const input =
    "width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#FAFAFB";
  const select =
    "width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:13.5px;background:#fff;cursor:pointer";

  return (
    <div
      data-pad=""
      style={s(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px",
      )}
    >
      <div
        style={s(
          "width:100%;max-width:560px;background:#fff;border-radius:20px;padding:38px 36px;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)",
        )}
      >
        <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:26px")}>
          <img src="/zemen-logo-dark.png" alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>
            PayLink
          </div>
        </div>

        {done ? (
          <>
            <div
              style={s(
                "width:56px;height:56px;border-radius:16px;background:#E6F6EE;display:flex;align-items:center;justify-content:center;margin-bottom:20px;animation:pop .4s ease both",
              )}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#12905A" strokeWidth="2.2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1
              style={s(
                "font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0 0 6px",
              )}
            >
              Recovery is set up
            </h1>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 24px;line-height:1.6")}>
              If you ever forget your password, answer these three questions on the sign-in page to
              set a new one. Your answers are stored scrambled and cannot be read back by anyone
              here, so keep them somewhere you will remember.
            </p>
            <button
              className="zxvmr3xp"
              onClick={() => window.location.reload()}
              style={s(
                "width:100%;padding:14px;background:#DA1E28;color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer",
              )}
            >
              Continue to your workspace
            </button>
          </>
        ) : (
          <>
            <div
              style={s(
                "display:inline-flex;align-items:center;gap:8px;background:#FDECED;color:#B0141C;font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;margin-bottom:16px",
              )}
            >
              Account recovery · {session?.user.fullName ?? ""}
            </div>
            <h1
              style={s(
                "font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0 0 6px",
              )}
            >
              {status?.configured ? "Change your recovery questions" : "Set up account recovery"}
            </h1>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 22px;line-height:1.6")}>
              Choose three questions and answer each one. These are what let you set a new password
              if you forget it — nobody at the bank can look your answers up, so pick things you
              will still know in a year.
            </p>

            {[0, 1, 2].map((i) => (
              <div key={i} style={s("margin-bottom:16px")}>
                <label style={s(label)}>Question {i + 1}</label>
                <select
                  value={picked[i] ?? ""}
                  onChange={(e) => choose(i, e.target.value)}
                  style={s(select + ";margin-bottom:8px")}
                >
                  {(status?.prompts ?? []).map((prompt) => (
                    <option key={prompt} value={prompt}>
                      {prompt}
                    </option>
                  ))}
                </select>
                <input
                  className="zxq6owgx"
                  value={answers[i]}
                  onChange={(e) => answer(i, e.target.value)}
                  placeholder="Your answer"
                  autoComplete="off"
                  style={s(input)}
                />
              </div>
            ))}

            <div style={s("font-size:11.5px;color:#9A9CA5;margin-bottom:18px;line-height:1.6")}>
              Capitals and extra spaces are ignored when you answer, so you do not have to match
              your typing exactly.
            </div>

            <label style={s(label)}>Your current password</label>
            <input
              className="zxq6owgx"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Confirm it is you"
              autoComplete="current-password"
              style={s(input + ";margin-bottom:6px")}
            />
            <div style={s("font-size:11.5px;color:#9A9CA5;margin-bottom:20px;line-height:1.6")}>
              Required so that nobody who found your screen unlocked can change these.
            </div>

            {error ? (
              <div
                style={s(
                  "display:flex;gap:10px;background:#FDECED;border:1px solid #F5C6C9;color:#B0141C;border-radius:11px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:18px",
                )}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s("flex-shrink:0;margin-top:1px")}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              className="zxvmr3xp"
              onClick={() => void submit()}
              disabled={busy}
              style={s(
                `width:100%;padding:14px;background:${busy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:${busy ? "wait" : "pointer"}`,
              )}
            >
              {busy ? "Saving…" : "Save recovery questions"}
            </button>

            {status?.configured ? (
              <div style={s("text-align:center;margin-top:16px")}>
                <a
                  href="#"
                  className="zxex49ni"
                  onClick={(e) => {
                    e.preventDefault();
                    on.salesDash();
                  }}
                  style={s("font-size:13px;color:#6B6D76")}
                >
                  Back to your workspace
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
