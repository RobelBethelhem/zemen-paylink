package api

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/zemenbank/paylink/api/internal/httpx"
)

// clientIP is who we attribute an attempt to.
//
// X-Forwarded-For is believed only when the connection itself came from a
// network the bank has declared as its own proxy. Anywhere else the header is
// ignored, because an unconditional read would let a caller choose their own
// identity and walk straight around every rate limit and lockout below — the
// controls would be there and do nothing.
//
// Only the first hop is taken: the rest of the chain is whatever the client
// sent, and none of it is ours.
func (s *Server) clientIP(r *http.Request) string {
	peer, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		peer = r.RemoteAddr
	}
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" && s.trustsProxy(peer) {
		first, _, _ := strings.Cut(forwarded, ",")
		if first = strings.TrimSpace(first); first != "" {
			return first
		}
	}
	return peer
}

func (s *Server) trustsProxy(peer string) bool {
	ip := net.ParseIP(peer)
	if ip == nil {
		return false
	}
	for _, network := range s.trustedProxies {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

// parseTrustedProxies turns the configured CIDRs into networks, refusing to
// start on one it cannot read rather than silently trusting nothing.
func parseTrustedProxies(entries []string) ([]*net.IPNet, error) {
	out := make([]*net.IPNet, 0, len(entries))
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		// A bare address is accepted as a single host.
		if !strings.Contains(entry, "/") {
			if ip := net.ParseIP(entry); ip != nil {
				bits := 32
				if ip.To4() == nil {
					bits = 128
				}
				out = append(out, &net.IPNet{IP: ip, Mask: net.CIDRMask(bits, bits)})
				continue
			}
		}
		_, network, err := net.ParseCIDR(entry)
		if err != nil {
			return nil, fmt.Errorf("PAYLINK_TRUSTED_PROXIES: %q is not an address or CIDR: %w", entry, err)
		}
		out = append(out, network)
	}
	return out, nil
}

// ------------------------------------------------------------- rate limiting

// limiter is a fixed-window counter per key. Deliberately simple: the point is
// to make guessing slow and noisy, not to shape traffic.
type limiter struct {
	mu      sync.Mutex
	hits    map[string]*window
	limit   int
	per     time.Duration
	lastGC  time.Time
	nowFunc func() time.Time
}

type window struct {
	count int
	until time.Time
}

func newLimiter(limit int, per time.Duration) *limiter {
	return &limiter{hits: map[string]*window{}, limit: limit, per: per, nowFunc: time.Now}
}

// allow records an attempt and reports whether it is within the budget.
func (l *limiter) allow(key string) (bool, time.Duration) {
	now := l.nowFunc()
	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastGC) > l.per {
		for k, w := range l.hits {
			if now.After(w.until) {
				delete(l.hits, k)
			}
		}
		l.lastGC = now
	}

	w, ok := l.hits[key]
	if !ok || now.After(w.until) {
		l.hits[key] = &window{count: 1, until: now.Add(l.per)}
		return true, 0
	}
	w.count++
	if w.count > l.limit {
		return false, time.Until(w.until)
	}
	return true, 0
}

// reset clears a key, so a successful sign-in does not leave the user one typo
// away from a lockout they have already disproved.
func (l *limiter) reset(key string) {
	l.mu.Lock()
	delete(l.hits, key)
	l.mu.Unlock()
}

// rateLimit refuses a caller who is going too fast, and says for how long.
func rateLimit(l *limiter, key string, w http.ResponseWriter, message string) bool {
	ok, retryIn := l.allow(key)
	if ok {
		return true
	}
	seconds := int(retryIn.Seconds()) + 1
	w.Header().Set("Retry-After", itoa(seconds))
	httpx.ErrorCode(w, http.StatusTooManyRequests, "rate_limited", message)
	return false
}

func itoa(n int) string {
	if n <= 0 {
		return "1"
	}
	digits := ""
	for n > 0 {
		digits = string(rune('0'+n%10)) + digits
		n /= 10
	}
	return digits
}

// ---------------------------------------------------------- security headers

// securityHeaders sets what a browser needs to be told on every response.
//
// The API returns JSON rather than markup, so most of these are belt and
// braces — but a JSON endpoint that can be framed or sniffed as HTML is exactly
// how a "harmless" response becomes an XSS sink.
func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cross-Origin-Resource-Policy", "same-site")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		h.Set("Cache-Control", "no-store")
		// Only meaningful over TLS, and harmless before it — but it must not be
		// sent from a plain-HTTP dev box, or a browser will pin the upgrade and
		// lock the operator out of their own LAN pilot.
		if r.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

// ------------------------------------------------------------------ lockout

// A rate limit slows an attacker down; a lockout stops them. After a few wrong
// passwords the account is closed for a while regardless of how patiently the
// attempts are spaced, which is what defeats a slow, distributed guess that
// stays under any per-minute budget.
//
// It unlocks itself. A lock an administrator has to lift turns a nuisance into
// an outage, and turns the lockout into a denial-of-service tool aimed at
// whoever the attacker names.
const (
	// MaxFailedAttempts is how many wrong answers close the door.
	MaxFailedAttempts = 4
	// LockoutDuration is how long it stays closed.
	LockoutDuration = 15 * time.Minute
	// FailureWindow is how long a wrong answer is remembered. Four mistakes
	// spread over a working day are a person having a bad week, not an attack.
	FailureWindow = 15 * time.Minute
)

type lockout struct {
	mu      sync.Mutex
	entries map[string]*lockEntry
	max     int
	window  time.Duration
	dur     time.Duration
	lastGC  time.Time
}

type lockEntry struct {
	failures  int
	firstFail time.Time
	until     time.Time
}

func newLockout(max int, window, duration time.Duration) *lockout {
	return &lockout{entries: map[string]*lockEntry{}, max: max, window: window, dur: duration}
}

// locked reports whether a key is currently shut out, and for how much longer.
func (l *lockout) locked(key string) (bool, time.Duration) {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	l.gc(now)

	e, ok := l.entries[key]
	if !ok {
		return false, 0
	}
	if now.Before(e.until) {
		return true, time.Until(e.until)
	}
	// The lock has served its time; the slate is clean.
	if !e.until.IsZero() {
		delete(l.entries, key)
	}
	return false, 0
}

// fail records a wrong answer and reports whether that closed the account.
func (l *lockout) fail(key string) (bool, time.Duration) {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	l.gc(now)

	e, ok := l.entries[key]
	if !ok || now.Sub(e.firstFail) > l.window {
		e = &lockEntry{firstFail: now}
		l.entries[key] = e
	}
	e.failures++
	if e.failures >= l.max {
		e.until = now.Add(l.dur)
		return true, l.dur
	}
	return false, 0
}

// succeed clears the record. Getting it right proves the earlier attempts were
// the same person mistyping.
func (l *lockout) succeed(key string) {
	l.mu.Lock()
	delete(l.entries, key)
	l.mu.Unlock()
}

func (l *lockout) gc(now time.Time) {
	if now.Sub(l.lastGC) < l.window {
		return
	}
	for k, e := range l.entries {
		expired := e.until.IsZero() && now.Sub(e.firstFail) > l.window
		if expired || (!e.until.IsZero() && now.After(e.until)) {
			delete(l.entries, k)
		}
	}
	l.lastGC = now
}

// refuseLocked answers a caller who is shut out. The wording and the wait are
// the same whether or not the account exists — otherwise the lockout itself
// becomes a way to find out who is registered.
func refuseLocked(w http.ResponseWriter, remaining time.Duration) {
	minutes := int(remaining.Minutes()) + 1
	w.Header().Set("Retry-After", itoa(int(remaining.Seconds())+1))
	httpx.ErrorCode(w, http.StatusTooManyRequests, "locked_out",
		"Too many failed attempts. This account is locked for "+itoa(minutes)+
			" more minute(s), then unlocks on its own.")
}
