package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/store"
)

type sessionUser struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	// The registered merchant this operator trades under. Fixed at
	// registration, which is why connecting a gateway never asks for it.
	MPGSMerchantNumber string      `json:"mpgsMerchantNumber,omitempty"`
	MPGSMerchantName   string      `json:"mpgsMerchantName,omitempty"`
	Role               domain.Role `json:"role"`
	FullName           string      `json:"fullName"`
	Title              string      `json:"title,omitempty"`
	MerchantID         string      `json:"merchantId,omitempty"`
	Merchant           string      `json:"merchant,omitempty"`
	BranchID           string      `json:"branchId,omitempty"`
	Branch             string      `json:"branch,omitempty"`
	Initials           string      `json:"initials"`
}

type sessionPayload struct {
	Token     string      `json:"token,omitempty"`
	ExpiresAt string      `json:"expiresAt,omitempty"`
	User      sessionUser `json:"user"`

	// GatewayConnected is false until an operator has stored verified MPGS
	// credentials; RequiresGateway tells the client to collect them before
	// letting the operator create links.
	GatewayConnected bool `json:"gatewayConnected"`
	RequiresGateway  bool `json:"requiresGateway"`
	// Environment is the gateway this session's screens are showing: test or
	// live. Everything the operator sees is scoped to it.
	Environment string `json:"environment"`
	// RequiresRecovery is true until the account can be recovered without an
	// administrator. Setting it up afterwards is too late to be useful.
	RequiresRecovery bool `json:"requiresRecovery"`

	// The session policy, in seconds, so the browser ends the session at the
	// same moment the server does instead of leaving a screen up whose next
	// click will fail. The server remains the only enforcer; these let the
	// client be honest about it rather than being trusted with it.
	IdleSeconds     int `json:"idleSeconds"`
	LifetimeSeconds int `json:"lifetimeSeconds"`
}

func initials(name string) string {
	parts := strings.Fields(name)
	out := ""
	for i, p := range parts {
		if i == 2 {
			break
		}
		out += strings.ToUpper(p[:1])
	}
	if out == "" {
		return "?"
	}
	return out
}

func (s *Server) sessionFor(u *domain.User, token, expiresAt string) sessionPayload {
	su := sessionUser{
		ID:                 u.ID,
		Username:           u.Username,
		Email:              u.Email,
		MPGSMerchantNumber: u.MPGSMerchantNumber,
		FullName:           u.FullName,
		Role:               u.Role,
		Title:              u.Title,
		MerchantID:         u.MerchantID,
		BranchID:           u.BranchID,
		Initials:           initials(u.FullName),
	}
	// The name the operator's payments are made to comes from the register, not
	// from anything they typed.
	if m, err := s.store.MPGSMerchantByNumber(u.MPGSMerchantNumber); err == nil {
		su.MPGSMerchantName = m.Name
	}
	if u.MerchantID != "" {
		if m, err := s.store.MerchantByID(u.MerchantID); err == nil {
			su.Merchant = m.Name
		}
	}
	if u.BranchID != "" {
		if branches, err := s.store.BranchesByMerchant(u.MerchantID); err == nil {
			for _, b := range branches {
				if b.ID == u.BranchID {
					su.Branch = b.Name
					break
				}
			}
		}
	}

	connected, _ := s.store.HasVerifiedCredential(u.ID)
	hasRecovery, _ := s.store.HasSecurityQuestions(u.ID)
	return sessionPayload{
		Token:            token,
		ExpiresAt:        expiresAt,
		User:             su,
		GatewayConnected: connected,
		// Which gateway this session is working against. The portal shows it on
		// every screen: a test payment must never be read as real money.
		Environment: string(s.environmentFor(u)),
		// The roles that transact against MPGS directly. An integrator does it
		// through the API rather than by hand, but the link still has to settle
		// somewhere — without a gateway their first API call would be refused,
		// so they are asked for it on the way in rather than at that point.
		RequiresGateway: (u.Role == domain.RoleSales || u.Role == domain.RoleIntegrator) &&
			!connected,
		RequiresRecovery: !hasRecovery,
		IdleSeconds:      int(s.tokens.Idle().Seconds()),
		LifetimeSeconds:  int(s.tokens.TTL().Seconds()),
	}
}

// lastUsed says how long ago a session was used, in the terms a person would
// use out loud. Rounded, because the exact second is noise to the reader and
// tells anyone watching more than they need about the other session.
func lastUsed(at time.Time) string {
	switch d := time.Since(at); {
	case d < 45*time.Second:
		return "in use just now"
	case d < 90*time.Second:
		return "last used a minute ago"
	default:
		return fmt.Sprintf("last used %d minutes ago", int(d.Minutes()+0.5))
	}
}

type loginRequest struct {
	// Username is what the sign-in box collects. Email is still accepted so
	// accounts that predate username sign-in keep working.
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	// Force answers the "already signed in elsewhere" refusal: sign that
	// session out and take the account over. Only ever acted on after the
	// password has been proved, so it grants nothing a plain sign-in would not.
	Force bool `json:"force,omitempty"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	login := strings.TrimSpace(req.Username)
	if login == "" {
		login = strings.TrimSpace(req.Email)
	}
	if login == "" || req.Password == "" {
		httpx.Error(w, http.StatusBadRequest, "Username and password are required.")
		return
	}

	account := strings.ToLower(login)

	// The lockout is checked before anything else, including the password, so a
	// locked account costs an attacker a request and tells them nothing.
	if shut, remaining := s.signInLock.locked(account); shut {
		refuseLocked(w, remaining)
		return
	}
	// Two budgets alongside it: one per address, so a single source cannot
	// sweep many accounts, and one per username, so a distributed attempt on
	// one account is capped even before the lockout closes it.
	if !rateLimit(s.loginLimit, "ip:"+s.clientIP(r), w,
		"Too many sign-in attempts. Wait a moment and try again.") {
		return
	}
	if !rateLimit(s.loginLimit, "user:"+account, w,
		"Too many sign-in attempts for this account. Wait a moment and try again.") {
		return
	}

	user, err := s.store.UserByLogin(login)
	// The password is always checked, even when no such account exists, against
	// a hash of the same cost. Returning early on an unknown username would
	// answer in a fraction of the time and hand out a list of who is registered.
	if err != nil {
		auth.CheckPassword(dummyHash, req.Password)
		// Counted even though no such account exists: an unknown name must
		// behave exactly like a known one.
		s.noteFailedSignIn(w, account, login, r)
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		s.noteFailedSignIn(w, account, login, r)
		return
	}
	if user.Status == domain.UserInvited {
		httpx.ErrorCode(w, http.StatusForbidden, "not_activated",
			"This account has not been activated yet.")
		return
	}
	if user.Status == domain.UserSuspended {
		httpx.ErrorCode(w, http.StatusForbidden, "suspended", "This account has been suspended.")
		return
	}

	// Proved they are who they say; the budget and the failure count they spent
	// getting here are theirs back, so a few typos cost nothing.
	s.signInLock.succeed(account)
	s.loginLimit.reset("user:" + account)
	s.loginLimit.reset("ip:" + s.clientIP(r))

	// One account, one session.
	//
	// Deliberately checked only once the password has been proved: asked any
	// earlier it would tell an unauthenticated caller whether someone is
	// currently signed in, which is a detail worth guessing at.
	if lastSeen, active := s.tokens.ActiveSession(user.ID); active && !req.Force {
		slog.Info("sign-in refused: account already signed in",
			"user", user.ID, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusConflict, "session_active",
			"This account is already signed in on another device or browser "+
				"("+lastUsed(lastSeen)+"). Continuing here will sign that session out.")
		return
	}
	if req.Force {
		// They hold the password, so they may take the account back — from a
		// browser they walked away from, or from someone who should not have it.
		if n := s.tokens.RevokeUser(user.ID); n > 0 {
			slog.Warn("existing session ended by a new sign-in",
				"user", user.ID, "ended", n, "remote", s.clientIP(r))
		}
	}

	token, expires, err := s.tokens.Issue(user)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not start a session.")
		return
	}
	slog.Info("signed in", "user", user.ID, "role", user.Role, "remote", s.clientIP(r))
	httpx.JSON(w, http.StatusOK, s.sessionFor(user, token, expires.UTC().Format("2006-01-02T15:04:05Z")))
}

// noteFailedSignIn records a wrong answer and refuses, closing the account once
// too many have piled up. The message never distinguishes a wrong password from
// an unknown username.
func (s *Server) noteFailedSignIn(w http.ResponseWriter, account, login string, r *http.Request) {
	shut, remaining := s.signInLock.fail(account)
	if shut {
		slog.Warn("account locked after repeated failures",
			"login", login, "remote", s.clientIP(r), "minutes", int(remaining.Minutes()))
		refuseLocked(w, remaining)
		return
	}
	slog.Warn("failed sign-in", "login", login, "remote", s.clientIP(r))
	httpx.Error(w, http.StatusUnauthorized,
		"That username and password combination is not recognised.")
}

// dummyHash is a real bcrypt hash of a value nothing can match, used to spend
// the same time on an unknown username as on a known one.
var dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// handleLogout ends this session server-side. Clearing the browser's copy of a
// token is not signing out — whatever else holds it would still be admitted.
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if claims, ok := auth.ClaimsFrom(r.Context()); ok {
		s.tokens.Revoke(claims)
		slog.Info("signed out", "user", claims.Subject)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"signedOut": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	// The real deadline, not a blank. A page reload restores the session
	// through here, and without it the browser would not know when this
	// session's absolute limit falls due and would keep a dead screen up.
	expiresAt := ""
	if claims, ok := auth.ClaimsFrom(r.Context()); ok && claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z")
	}
	httpx.JSON(w, http.StatusOK, s.sessionFor(user, "", expiresAt))
}

// handleInviteLookup lets the activation screen show who the invite is for
// before a password is chosen.
func (s *Server) handleInviteLookup(w http.ResponseWriter, r *http.Request) {
	user, err := s.store.UserByInviteToken(r.PathValue("token"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "This invitation link is no longer valid.")
		return
	}
	merchantName := ""
	if m, err := s.store.MerchantByID(user.MerchantID); err == nil {
		merchantName = m.Name
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"email":    user.Email,
		"fullName": user.FullName,
		"role":     user.Role,
		"merchant": merchantName,
	})
}

type activateRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (s *Server) handleActivate(w http.ResponseWriter, r *http.Request) {
	var req activateRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	user, err := s.store.UserByInviteToken(strings.TrimSpace(req.Token))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "This invitation link is no longer valid.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "Could not complete activation.")
		return
	}
	if err := auth.ValidatePassword(req.Password, user.Username, user.MPGSMerchantNumber); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not set your password.")
		return
	}
	if err := s.store.ActivateUser(user.ID, hash); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not activate this account.")
		return
	}

	user.Status = domain.UserActive
	token, expires, err := s.tokens.Issue(user)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not start a session.")
		return
	}
	httpx.JSON(w, http.StatusOK, s.sessionFor(user, token, expires.UTC().Format("2006-01-02T15:04:05Z")))
}
