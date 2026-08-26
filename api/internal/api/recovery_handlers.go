package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/binary"
	"log/slog"
	"net/http"
	"strings"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
)

// Account recovery by security question.
//
// Worth being honest in the place someone will read it: OWASP ASVS 2.5.2 says
// not to use knowledge-based answers at all, and NIST 800-63B agrees. They are
// low-entropy and often researchable. This exists because an operator registers
// with no email address, so there is nothing to send a reset link to — and an
// operator locked out with no route back is its own kind of failure.
//
// Everything below is the mitigation for choosing it anyway:
//
//   - answers are bcrypt-hashed, never stored or returned readable
//   - all three must match, and a wrong one is never identified
//   - setting or changing them requires the current password
//   - unknown usernames get plausible decoy prompts, so the lookup is not an
//     account-existence oracle
//   - the reset is a single atomic call, so no intermediate reset token exists
//     to be stolen or replayed
//   - a successful reset signs every session out

type questionView struct {
	Position int    `json:"position"`
	Prompt   string `json:"prompt"`
}

type securityStatus struct {
	Configured bool           `json:"configured"`
	Questions  []questionView `json:"questions"`
	Prompts    []string       `json:"prompts"`
	Required   int            `json:"required"`
}

func (s *Server) handleGetSecurityQuestions(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	status := securityStatus{
		Prompts:   domain.RecoveryPrompts,
		Required:  domain.RequiredSecurityQuestions,
		Questions: []questionView{},
	}
	questions, err := s.store.SecurityQuestions(user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load your recovery questions.")
		return
	}
	for _, q := range questions {
		status.Questions = append(status.Questions, questionView{Position: q.Position, Prompt: q.Prompt})
	}
	status.Configured = len(questions) >= domain.RequiredSecurityQuestions
	httpx.JSON(w, http.StatusOK, status)
}

type answerInput struct {
	Prompt string `json:"prompt"`
	Answer string `json:"answer"`
}

type setQuestionsRequest struct {
	// Proving the current password is what stops a hijacked session from
	// quietly installing its own answers and owning the account for good.
	CurrentPassword string        `json:"currentPassword"`
	Questions       []answerInput `json:"questions"`
}

func (s *Server) handleSetSecurityQuestions(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	var req setQuestionsRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	if !rateLimit(s.recoveryLimit, "set:"+user.ID, w,
		"Too many attempts. Wait a moment and try again.") {
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		slog.Warn("security question change with wrong password",
			"user", user.ID, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusForbidden, "wrong_password",
			"That is not your current password.")
		return
	}
	if len(req.Questions) != domain.RequiredSecurityQuestions {
		httpx.Error(w, http.StatusBadRequest, "Choose exactly three questions.")
		return
	}

	seenPrompt := map[string]bool{}
	seenAnswer := map[string]bool{}
	questions := make([]*domain.SecurityQuestion, 0, len(req.Questions))
	for i, q := range req.Questions {
		prompt := strings.TrimSpace(q.Prompt)
		if !domain.ValidRecoveryPrompt(prompt) {
			httpx.Error(w, http.StatusBadRequest, "Choose your questions from the list offered.")
			return
		}
		if seenPrompt[prompt] {
			httpx.Error(w, http.StatusBadRequest, "Choose three different questions.")
			return
		}
		seenPrompt[prompt] = true

		if err := auth.ValidateAnswer(q.Answer); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		normalised := auth.NormaliseAnswer(q.Answer)
		// Three identical answers reduce the whole thing to one guess.
		if seenAnswer[normalised] {
			httpx.Error(w, http.StatusBadRequest, "Give a different answer to each question.")
			return
		}
		seenAnswer[normalised] = true
		// An answer that is also the password turns a recovery prompt into a
		// place the password gets typed in the clear.
		if auth.CheckPassword(user.PasswordHash, normalised) {
			httpx.Error(w, http.StatusBadRequest, "An answer cannot be your password.")
			return
		}

		hash, err := auth.HashAnswer(q.Answer)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Could not save your answers.")
			return
		}
		questions = append(questions, &domain.SecurityQuestion{
			Position: i + 1, Prompt: prompt, AnswerHash: hash,
		})
	}

	if err := s.store.SetSecurityQuestions(user.ID, questions); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not save your answers.")
		return
	}
	slog.Info("recovery questions set", "user", user.ID, "remote", s.clientIP(r))
	s.handleGetSecurityQuestions(w, r)
}

// ---------------------------------------------------------------- recovery

// decoyPrompts produces a stable, plausible set of questions for a username
// that has no account, so that asking is not a way to discover who is
// registered. Seeded by HMAC of the username under the server secret, so the
// same unknown name always yields the same questions and a refresh gives
// nothing away.
func (s *Server) decoyPrompts(username string) []questionView {
	mac := hmac.New(sha256.New, s.cfg.JWTSecret)
	mac.Write([]byte("recovery-decoy|" + strings.ToLower(username)))
	seed := mac.Sum(nil)

	prompts := append([]string(nil), domain.RecoveryPrompts...)
	// Fisher-Yates, driven by the seed rather than a random source.
	for i := len(prompts) - 1; i > 0; i-- {
		j := int(binary.BigEndian.Uint32(seed[(i*4)%(len(seed)-4):]) % uint32(i+1))
		prompts[i], prompts[j] = prompts[j], prompts[i]
	}
	out := make([]questionView, 0, domain.RequiredSecurityQuestions)
	for i := 0; i < domain.RequiredSecurityQuestions; i++ {
		out = append(out, questionView{Position: i + 1, Prompt: prompts[i]})
	}
	return out
}

type recoveryChallenge struct {
	Username  string         `json:"username"`
	Questions []questionView `json:"questions"`
}

// handleRecoveryChallenge answers with the questions to put to someone claiming
// an account. It answers for every username, real or not.
func (s *Server) handleRecoveryChallenge(w http.ResponseWriter, r *http.Request) {
	username := strings.TrimSpace(r.PathValue("username"))
	if username == "" {
		httpx.Error(w, http.StatusBadRequest, "Enter your username.")
		return
	}
	if !rateLimit(s.recoveryLimit, "challenge:"+s.clientIP(r), w,
		"Too many recovery attempts. Try again later.") {
		return
	}

	challenge := recoveryChallenge{Username: username}
	if user, err := s.store.UserByLogin(username); err == nil {
		if questions, err := s.store.SecurityQuestions(user.ID); err == nil &&
			len(questions) >= domain.RequiredSecurityQuestions {
			for _, q := range questions {
				challenge.Questions = append(challenge.Questions,
					questionView{Position: q.Position, Prompt: q.Prompt})
			}
		}
	}
	// No account, or one without recovery set up: show decoys rather than
	// admit either fact.
	if len(challenge.Questions) == 0 {
		challenge.Questions = s.decoyPrompts(username)
	}
	httpx.JSON(w, http.StatusOK, challenge)
}

type recoveryRequest struct {
	Username string   `json:"username"`
	Answers  []string `json:"answers"`
	// The new password arrives with the answers, in one call. A two-step flow
	// would need a reset ticket, and a reset ticket is one more credential to
	// leak, expire wrongly or replay. There is nothing here to steal.
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

func (s *Server) handleRecover(w http.ResponseWriter, r *http.Request) {
	var req recoveryRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	username := strings.TrimSpace(req.Username)

	account := strings.ToLower(username)

	// Same lockout as sign-in, for the same reason: recovery answers are a
	// second door into the account and a weaker one.
	if shut, remaining := s.recoveryLock.locked(account); shut {
		refuseLocked(w, remaining)
		return
	}
	// Two budgets alongside it: one stops a single source sweeping many
	// accounts, one caps a distributed attempt on a single account.
	if !rateLimit(s.recoveryLimit, "recover-ip:"+s.clientIP(r), w,
		"Too many recovery attempts. Try again later.") {
		return
	}
	if !rateLimit(s.recoveryLimit, "recover-user:"+account, w,
		"Too many recovery attempts for this account. Try again later.") {
		return
	}

	// One message covers every failure below: wrong username, no questions set,
	// wrong answers. Distinguishing them would give an attacker a map.
	const refused = "Those answers do not match our records."

	user, err := s.store.UserByLogin(username)
	if err != nil {
		// Spend comparable time, and burn a failure exactly as a real account
		// would, so neither timing nor the lockout reveals who exists.
		auth.CheckAnswer(dummyHash, "decoy")
		if shut, remaining := s.recoveryLock.fail(account); shut {
			refuseLocked(w, remaining)
			return
		}
		httpx.ErrorCode(w, http.StatusUnauthorized, "recovery_failed", refused)
		return
	}
	questions, err := s.store.SecurityQuestions(user.ID)
	if err != nil || len(questions) < domain.RequiredSecurityQuestions {
		auth.CheckAnswer(dummyHash, "decoy")
		httpx.ErrorCode(w, http.StatusUnauthorized, "recovery_failed", refused)
		return
	}
	if len(req.Answers) != len(questions) {
		httpx.ErrorCode(w, http.StatusUnauthorized, "recovery_failed", refused)
		return
	}

	// Every answer is checked even after one has failed, so the response time
	// does not reveal which one was wrong.
	correct := true
	for i, q := range questions {
		if !auth.CheckAnswer(q.AnswerHash, req.Answers[i]) {
			correct = false
		}
	}
	if !correct {
		if shut, remaining := s.recoveryLock.fail(account); shut {
			slog.Warn("recovery locked after repeated failures",
				"user", user.ID, "remote", s.clientIP(r))
			refuseLocked(w, remaining)
			return
		}
		slog.Warn("failed account recovery", "user", user.ID, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusUnauthorized, "recovery_failed", refused)
		return
	}

	// Answers were right; now the new password has to stand on its own.
	if req.NewPassword != req.ConfirmPassword {
		httpx.ErrorCode(w, http.StatusBadRequest, "password_mismatch",
			"Those passwords do not match.")
		return
	}
	if err := auth.ValidatePassword(req.NewPassword, user.Username, user.MPGSMerchantNumber); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if auth.CheckPassword(user.PasswordHash, req.NewPassword) {
		httpx.Error(w, http.StatusBadRequest, "Choose a password you have not used here before.")
		return
	}
	for _, q := range questions {
		if auth.CheckAnswer(q.AnswerHash, req.NewPassword) {
			httpx.Error(w, http.StatusBadRequest,
				"Your password cannot be one of your recovery answers.")
			return
		}
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not set your new password.")
		return
	}
	if err := s.store.SetPassword(user.ID, hash); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not set your new password.")
		return
	}

	// Whoever was signed in as this account — including anyone who should not
	// have been — is signed out. A reset that leaves an intruder's session
	// running has not recovered anything.
	revoked := s.tokens.RevokeUser(user.ID)
	// A recovered account starts clean: neither the recovery budget nor an
	// earlier sign-in lockout should keep the rightful owner out.
	s.recoveryLock.succeed(account)
	s.signInLock.succeed(strings.ToLower(user.Username))
	s.recoveryLimit.reset("recover-user:" + account)
	s.loginLimit.reset("user:" + strings.ToLower(user.Username))

	slog.Info("account recovered",
		"user", user.ID, "sessionsEnded", revoked, "remote", s.clientIP(r))
	httpx.JSON(w, http.StatusOK, map[string]any{
		"recovered": true,
		"message":   "Your password has been changed. Sign in with it now.",
	})
}
