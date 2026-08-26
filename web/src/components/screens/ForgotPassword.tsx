"use client";

import { useState } from "react";
import { ApiError, api, type SecurityQuestion } from "@/lib/api";
import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

// Two visible steps, one request.
//
// The answers and the new password are submitted together, so no reset ticket
// is ever issued — there is nothing in between for anyone to intercept, replay,
// or leave lying around in a browser history.
export function ForgotPassword() {
  const { on } = useApp();

  const [step, setStep] = useState<"who" | "answer">("who");
  const [username, setUsername] = useState("");
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookUp() {
    setError("");
    if (!username.trim()) {
      setError("Enter your username.");
      return;
    }
    setBusy(true);
    try {
      // Answers for any username, real or not, so this step never confirms
      // whether an account exists.
      const challenge = await api.recoveryChallenge(username.trim());
      setQuestions(challenge.questions);
      setAnswers(challenge.questions.map(() => ""));
      setStep("answer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start recovery.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError("");
    if (answers.some((a) => !a.trim())) {
      setError("Answer all of the questions.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.recover({
        username: username.trim(),
        answers,
        newPassword: password,
        confirmPassword: confirm,
      });
      on.recovered();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  const label = "display:block;font-size:13px;font-weight:600;color:#3A3B42;margin-bottom:7px";
  const input =
    "width:100%;padding:12px 14px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#FAFAFB";

  return (
    <div
      data-auth=""
      style={s(
        "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141519;padding:32px",
      )}
    >
      <div
        style={s(
          "width:100%;max-width:470px;background:#fff;border-radius:20px;padding:38px 36px;animation:fadeUp .5s ease both;box-shadow:0 40px 90px rgba(0,0,0,.4)",
        )}
      >
        <div style={s("display:flex;align-items:center;gap:11px;margin-bottom:26px")}>
          <img src="/zemen-logo-dark.png" alt="Zemen Bank" style={s("height:30px;width:auto;display:block")} />
          <span style={s("width:1px;height:22px;background:#E0E0E3")} />
          <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:17px;color:#141519")}>
            PayLink
          </div>
        </div>

        <h1
          style={s(
            "font-family:'Space Grotesk';font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0 0 6px",
          )}
        >
          Reset your password
        </h1>

        {step === "who" ? (
          <>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 22px;line-height:1.6")}>
              Enter your username and we will put your recovery questions to you.
            </p>
            <label style={s(label)}>Username</label>
            <input
              className="zxq6owgx"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void lookUp();
              }}
              placeholder="your.username"
              autoComplete="username"
              style={s(input + ";margin-bottom:20px")}
            />
          </>
        ) : (
          <>
            <p style={s("color:#6B6D76;font-size:14px;margin:0 0 22px;line-height:1.6")}>
              Answer all three, then choose a new password. Capitals and extra spaces do not matter.
            </p>
            {questions.map((q, i) => (
              <div key={q.position} style={s("margin-bottom:16px")}>
                <label style={s(label)}>{q.prompt}</label>
                <input
                  className="zxq6owgx"
                  value={answers[i] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
                  }
                  placeholder="Your answer"
                  autoComplete="off"
                  style={s(input)}
                />
              </div>
            ))}

            <div style={s("height:1px;background:#EEEEF0;margin:22px 0")} />

            <label style={s(label)}>New password</label>
            <input
              className="zxq6owgx"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 12 characters"
              autoComplete="new-password"
              style={s(input + ";margin-bottom:6px")}
            />
            <div style={s("font-size:11.5px;color:#9A9CA5;margin-bottom:16px;line-height:1.6")}>
              A phrase you will remember beats a short word with symbols in it.
            </div>

            <label style={s(label)}>Confirm new password</label>
            <input
              className="zxq6owgx"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              style={s(input + ";margin-bottom:20px")}
            />
          </>
        )}

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
          onClick={() => void (step === "who" ? lookUp() : submit())}
          disabled={busy}
          style={s(
            `width:100%;padding:14px;background:${busy ? "#E86A72" : "#DA1E28"};color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:600;cursor:${busy ? "wait" : "pointer"}`,
          )}
        >
          {busy ? "Checking…" : step === "who" ? "Continue" : "Set new password"}
        </button>

        <div style={s("text-align:center;margin-top:16px")}>
          <a
            href="#"
            className="zxex49ni"
            onClick={(e) => {
              e.preventDefault();
              on.goLogin();
            }}
            style={s("font-size:13px;color:#6B6D76")}
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
