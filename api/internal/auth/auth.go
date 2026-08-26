// Package auth issues and validates session tokens and hashes passwords.
package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/zemenbank/paylink/api/internal/domain"
)

var ErrInvalidToken = errors.New("invalid or expired session")

type Claims struct {
	Role       domain.Role `json:"role"`
	MerchantID string      `json:"mid,omitempty"`
	jwt.RegisteredClaims
}

type Manager struct {
	secret   []byte
	ttl      time.Duration
	sessions *sessionSet
}

func NewManager(secret []byte, ttl time.Duration) *Manager {
	return &Manager{secret: secret, ttl: ttl, sessions: newSessionSet()}
}

func (m *Manager) Issue(u *domain.User) (string, time.Time, error) {
	now := time.Now()
	expires := now.Add(m.ttl)
	// A unique id per token is what makes an individual session revocable.
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return "", time.Time{}, fmt.Errorf("auth: generate session id: %w", err)
	}
	tokenID := base64.RawURLEncoding.EncodeToString(idBytes)

	claims := Claims{
		Role:       u.Role,
		MerchantID: u.MerchantID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expires),
			Issuer:    "zemen-paylink",
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("auth: sign token: %w", err)
	}
	m.sessions.add(tokenID, u.ID, expires)
	return signed, expires, nil
}

func (m *Manager) Parse(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return m.secret, nil
	}, jwt.WithIssuer("zemen-paylink"), jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, ErrInvalidToken
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// ------------------------------------------------------------------ passwords

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("auth: hash password: %w", err)
	}
	return string(hash), nil
}

func CheckPassword(hash, password string) bool {
	if hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// Password rules, per OWASP ASVS 4.0 V2.1 and NIST SP 800-63B.
const (
	// ASVS 2.1.1 — at least 12 characters.
	MinPasswordLength = 12
	// bcrypt hashes at most 72 bytes and silently ignores the rest, which would
	// mean two different long passwords both opening the same account. ASVS
	// 2.1.3 forbids truncation, so anything longer is refused outright rather
	// than quietly cut. 72 still clears the 64-character minimum of ASVS 2.1.2.
	MaxPasswordBytes = 72
)

// ValidatePassword applies length and a check against passwords already known
// to attackers.
//
// Deliberately absent: any requirement to mix upper case, digits or symbols.
// ASVS 2.1.9 and NIST 800-63B both say not to impose composition rules — they
// push people towards "Password1!" and are a finding in their own right at a
// pen test. Length plus a deny-list is what the standards actually ask for.
//
// context is anything guessable about this account — username, merchant number
// — which must not be usable as the password.
func ValidatePassword(password string, context ...string) error {
	if utf8.RuneCountInString(password) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}
	if len(password) > MaxPasswordBytes {
		return fmt.Errorf("password must be %d bytes or fewer", MaxPasswordBytes)
	}
	// ASVS 2.1.4 — every printable Unicode character is allowed, spaces
	// included, so a passphrase works. Only control characters are refused,
	// because they arrive from a paste accident rather than a choice.
	for _, r := range password {
		if unicode.IsControl(r) {
			return errors.New("password cannot contain control characters")
		}
	}

	// A deny-list only works if it is consulted with the tricks people actually
	// use stripped off first. "password1234", "P@ssw0rd!" and "Password2026"
	// are all the same password to an attacker running a rules-based cracker,
	// and a list of literal strings would let every one of them through.
	for _, candidate := range variants(password) {
		if commonPasswords[candidate] {
			return errors.New("that password is too easily guessed; choose another")
		}
	}
	folded := strings.ToLower(strings.TrimSpace(password))
	// A single repeated character reaches 12 without being a password.
	if isRepeated(folded) {
		return errors.New("that password is too predictable; choose another")
	}
	for _, hint := range context {
		hint = strings.ToLower(strings.TrimSpace(hint))
		if len(hint) >= 4 && strings.Contains(folded, hint) {
			return errors.New("password cannot contain your username or merchant number")
		}
	}
	return nil
}

// variants reduces a password to the forms a cracker would try it as: folded,
// with leet substitutions undone, and with trailing digits and punctuation
// stripped — the year, the "1!", the "123" on the end.
func variants(password string) []string {
	folded := strings.ToLower(strings.TrimSpace(password))
	seen := map[string]bool{}
	out := []string{}
	add := func(v string) {
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}

	deleet := strings.NewReplacer(
		"@", "a", "4", "a", "8", "b", "3", "e", "1", "l", "!", "i",
		"0", "o", "9", "g", "5", "s", "$", "s", "7", "t", "+", "t", "2", "z",
	).Replace(folded)

	trimTail := func(v string) string {
		return strings.TrimRight(v, "0123456789!@#$%^&*()_-+=.,?~ ")
	}

	add(folded)
	add(trimTail(folded))
	add(deleet)
	add(trimTail(deleet))
	// The tail is often the only thing between a base word and the list, so the
	// de-leeted base is checked as well.
	add(trimTail(strings.NewReplacer(
		"@", "a", "4", "a", "3", "e", "1", "l", "0", "o", "5", "s", "$", "s",
	).Replace(trimTail(folded))))
	return out
}

func isRepeated(s string) bool {
	if s == "" {
		return false
	}
	first := rune(s[0])
	for _, r := range s {
		if r != first {
			return false
		}
	}
	return true
}

// commonPasswords is a starter deny-list: the credentials that appear at the
// top of every breach corpus, plus the ones this deployment invites.
//
// ASVS 2.1.7 asks for a check against a breached-password set. A full corpus
// (or the Pwned Passwords range API, which never sends the password itself)
// belongs here before go-live; this list is the floor, not the ceiling.
var commonPasswords = func() map[string]bool {
	list := []string{
		"123456", "password", "123456789", "12345678", "12345", "qwerty",
		"1234567", "111111", "123123", "abc123", "1234567890", "password1",
		"iloveyou", "000000", "qwerty123", "1q2w3e", "aa123456", "admin",
		"qwertyuiop", "654321", "555555", "lovely", "7777777", "welcome",
		"888888", "princess", "dragon", "passw0rd", "master", "hello",
		"freedom", "whatever", "qazwsx", "trustno1", "letmein", "monkey",
		"login", "starwars", "123321", "666666", "photoshop", "1qaz2wsx",
		"password123", "welcome123", "admin123", "root", "toor", "changeme",
		"secret", "summer", "winter", "spring", "autumn", "january", "february",
		"december", "football", "baseball", "superman", "batman", "shadow",
		"sunshine", "michael", "jennifer", "jordan", "hunter", "harley",
		"ranger", "buster", "soccer", "hockey", "killer", "george", "andrew",
		"charlie", "thomas", "robert", "daniel", "matthew", "jessica",
		"computer", "internet", "samsung", "google", "facebook", "apple",
		"asdfgh", "zxcvbn", "qwerty12", "q1w2e3r4", "1q2w3e4r", "abcd1234",
		"abcdef", "test", "testing", "demo", "guest", "user", "temp",
		"pass", "passwd", "letmein123", "iloveyou1", "trustno", "access",
		"flower", "banana", "cheese", "orange", "purple", "silver", "golden",
		"ethiopia", "addis", "addisababa", "habesha", "abebe", "kebede",
		// Guessable from this deployment in particular.
		"zemen", "zemenbank", "zemen@2026", "zemen2026", "paylink",
		"paylink123", "zemenpaylink", "mastercard", "merchant", "operator",
	}
	m := make(map[string]bool, len(list))
	for _, p := range list {
		m[p] = true
	}
	return m
}()

// -------------------------------------------------------------- request scope

type contextKey struct{}

var userKey contextKey

func WithUser(ctx context.Context, u *domain.User) context.Context {
	return context.WithValue(ctx, userKey, u)
}

// UserFrom returns the authenticated user attached by the auth middleware.
func UserFrom(ctx context.Context) (*domain.User, bool) {
	u, ok := ctx.Value(userKey).(*domain.User)
	return u, ok
}

// ------------------------------------------------------------------ sessions

// A JWT is self-contained, which means that on its own nothing can withdraw one
// before it expires: signing out would clear the browser's copy and leave a
// perfectly valid token in whatever captured it. ASVS 3.3.1 requires that
// signing out actually ends the session, so every issued token is tracked here
// and checked on each request.
//
// Held in memory deliberately. A restart signs everyone out, which is the safe
// direction for the failure to fall.
const (
	// IdleTimeout ends a session left untouched — ASVS 3.3.2 for a level 2
	// application, which is the bar a payment portal is measured at.
	IdleTimeout = 30 * time.Minute
)

type liveSession struct {
	userID   string
	lastSeen time.Time
	expires  time.Time
}

type sessionSet struct {
	mu       sync.Mutex
	sessions map[string]*liveSession
}

func newSessionSet() *sessionSet {
	s := &sessionSet{sessions: map[string]*liveSession{}}
	go func() {
		for range time.Tick(5 * time.Minute) {
			s.sweep()
		}
	}()
	return s
}

func (s *sessionSet) sweep() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, live := range s.sessions {
		if now.After(live.expires) || now.Sub(live.lastSeen) > IdleTimeout {
			delete(s.sessions, id)
		}
	}
}

func (s *sessionSet) add(id, userID string, expires time.Time) {
	now := time.Now()
	s.mu.Lock()
	s.sessions[id] = &liveSession{userID: userID, lastSeen: now, expires: expires}
	s.mu.Unlock()
}

// touch confirms a session is still live and records the activity. It returns
// false once the session has been signed out, has expired, or has been idle
// past the timeout.
func (s *sessionSet) touch(id string) bool {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	live, ok := s.sessions[id]
	if !ok {
		return false
	}
	if now.After(live.expires) || now.Sub(live.lastSeen) > IdleTimeout {
		delete(s.sessions, id)
		return false
	}
	live.lastSeen = now
	return true
}

func (s *sessionSet) revoke(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}

// revokeUser ends every session an account holds — what a password change or a
// suspension has to do to be worth anything.
func (s *sessionSet) revokeUser(userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for id, live := range s.sessions {
		if live.userID == userID {
			delete(s.sessions, id)
			n++
		}
	}
	return n
}

// Live reports whether a parsed token still belongs to a session, and marks it
// as used now.
func (m *Manager) Live(claims *Claims) bool { return m.sessions.touch(claims.ID) }

// Revoke signs one session out.
func (m *Manager) Revoke(claims *Claims) { m.sessions.revoke(claims.ID) }

// RevokeUser signs an account out everywhere.
func (m *Manager) RevokeUser(userID string) int { return m.sessions.revokeUser(userID) }

type claimsKey struct{}

// WithClaims attaches the parsed token so a handler can act on this session
// specifically — signing it out, for instance.
func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsKey{}, c)
}

func ClaimsFrom(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(claimsKey{}).(*Claims)
	return c, ok
}

// ------------------------------------------------------- recovery answers

// NormaliseAnswer puts an answer into the form it will be compared in.
//
// Case and spacing are forgiven, because "St Marys" and "st  marys" are the
// same memory and a recovery flow nobody can complete is worse than useless.
// Nothing else is stripped: removing punctuation or accents would shrink an
// already small answer space further.
func NormaliseAnswer(answer string) string {
	return strings.ToLower(strings.Join(strings.Fields(answer), " "))
}

// MaxAnswerBytes matches bcrypt's limit, for the same reason passwords have one.
const MaxAnswerBytes = 72

// ValidateAnswer refuses answers too short to be worth anything.
func ValidateAnswer(answer string) error {
	normalised := NormaliseAnswer(answer)
	if utf8.RuneCountInString(normalised) < 2 {
		return errors.New("each answer needs at least two characters")
	}
	if len(normalised) > MaxAnswerBytes {
		return fmt.Errorf("each answer must be %d bytes or fewer", MaxAnswerBytes)
	}
	return nil
}

// HashAnswer seals an answer with the same algorithm as a password.
func HashAnswer(answer string) (string, error) {
	return HashPassword(NormaliseAnswer(answer))
}

// CheckAnswer compares a submitted answer against its stored hash.
func CheckAnswer(hash, answer string) bool {
	return CheckPassword(hash, NormaliseAnswer(answer))
}
