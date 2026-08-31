package auth

import (
	"testing"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const testSecret = "a-test-signing-secret-long-enough"

func testManager(t *testing.T, ttl, idle time.Duration) (*Manager, *Claims) {
	t.Helper()
	m := NewManager([]byte(testSecret), ttl, idle)
	token, _, err := m.Issue(&domain.User{ID: "SL-01", Role: domain.RoleSales})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := m.Parse(token)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if !m.Live(claims) {
		t.Fatal("a session was not live the moment it was issued")
	}
	return m, claims
}

// age winds one session's clock back, the way waiting would.
func (m *Manager) age(id string, by time.Duration) {
	m.sessions.mu.Lock()
	defer m.sessions.mu.Unlock()
	if live, ok := m.sessions.sessions[id]; ok {
		live.lastSeen = live.lastSeen.Add(-by)
		live.expires = live.expires.Add(-by)
	}
}

// touchOnly moves the last-used time without moving the expiry — what constant
// activity looks like.
func (m *Manager) touchOnly(id string, by time.Duration) {
	m.sessions.mu.Lock()
	defer m.sessions.mu.Unlock()
	if live, ok := m.sessions.sessions[id]; ok {
		live.expires = live.expires.Add(-by)
	}
}

// A session left alone ends at the idle window, well before its lifetime.
func TestSessionEndsWhenLeftIdle(t *testing.T) {
	m, claims := testManager(t, 15*time.Minute, 3*time.Minute)

	m.age(claims.ID, 2*time.Minute)
	if !m.Live(claims) {
		t.Fatal("session ended after two minutes, inside a three minute idle window")
	}
	// Live() just touched it, so it is fresh again — which is the point of an
	// idle window rather than a fixed one.
	m.age(claims.ID, 3*time.Minute+time.Second)
	if m.Live(claims) {
		t.Fatal("session survived past the idle window")
	}
}

// The absolute limit is not extended by use. Someone working continuously is
// still signed out when the lifetime is up.
func TestSessionEndsAtItsLifetimeDespiteActivity(t *testing.T) {
	m, claims := testManager(t, 15*time.Minute, 3*time.Minute)

	// Busy the whole time: last-used stays current, only the lifetime advances.
	// Seven two-minute stretches is fourteen minutes — still inside the limit.
	for i := 1; i <= 7; i++ {
		m.touchOnly(claims.ID, 2*time.Minute)
		if !m.Live(claims) {
			t.Fatalf("session ended after %d minutes of continuous use, limit is 15", i*2)
		}
	}
	// The sixteenth minute is past it, however busy the operator was.
	m.touchOnly(claims.ID, 2*time.Minute)
	if m.Live(claims) {
		t.Fatal("session outlived its absolute limit while in continuous use")
	}
}

// One account, one session — and a session already past a limit does not count,
// or a browser someone walked away from would lock them out of their own
// account until the sweep caught up.
func TestActiveSessionTracksOneLiveSessionPerAccount(t *testing.T) {
	m, claims := testManager(t, 15*time.Minute, 3*time.Minute)

	if _, active := m.ActiveSession("SL-01"); !active {
		t.Fatal("a signed-in account did not report an active session")
	}
	if _, active := m.ActiveSession("SL-02"); active {
		t.Fatal("an account that never signed in reported an active session")
	}

	m.age(claims.ID, 4*time.Minute)
	if _, active := m.ActiveSession("SL-01"); active {
		t.Fatal("an idled-out session still counted as active and would block a fresh sign-in")
	}
}

// Taking the account over ends what was there. Without this the "sign that
// session out" prompt would be a lie.
func TestForceSignInEndsThePreviousSession(t *testing.T) {
	m, first := testManager(t, 15*time.Minute, 3*time.Minute)

	if ended := m.RevokeUser("SL-01"); ended != 1 {
		t.Fatalf("expected to end 1 session, ended %d", ended)
	}
	if m.Live(first) {
		t.Fatal("the previous session was still usable after being signed out")
	}
	if _, active := m.ActiveSession("SL-01"); active {
		t.Fatal("account still reported an active session after it was ended")
	}

	second, _, err := m.Issue(&domain.User{ID: "SL-01", Role: domain.RoleSales})
	if err != nil {
		t.Fatalf("issue after takeover: %v", err)
	}
	claims, err := m.Parse(second)
	if err != nil {
		t.Fatalf("parse after takeover: %v", err)
	}
	if !m.Live(claims) {
		t.Fatal("the new session was not live after taking the account over")
	}
	if m.Live(first) {
		t.Fatal("the old token started working again once a new session existed")
	}
}

// An idle window at or beyond the lifetime can never fire, so it is folded into
// the lifetime rather than kept as a setting that quietly does nothing.
func TestIdleWindowIsClampedToTheLifetime(t *testing.T) {
	for _, idle := range []time.Duration{0, -time.Minute, 30 * time.Minute} {
		m := NewManager([]byte(testSecret), 15*time.Minute, idle)
		if m.Idle() != 15*time.Minute {
			t.Fatalf("idle %v: expected clamping to the 15m lifetime, got %v", idle, m.Idle())
		}
	}
}
