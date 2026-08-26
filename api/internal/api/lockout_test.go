package api

import (
	"testing"
	"time"
)

// The lockout has to open again on its own. A lock that needs an administrator
// to lift turns a nuisance into an outage — and hands an attacker a way to take
// any named operator offline for the rest of the day.
func TestLockoutReleasesItself(t *testing.T) {
	lock := newLockout(4, 15*time.Minute, 15*time.Minute)

	for i := 1; i <= 3; i++ {
		if shut, _ := lock.fail("someone"); shut {
			t.Fatalf("locked after %d failures, expected 4", i)
		}
	}
	shut, remaining := lock.fail("someone")
	if !shut {
		t.Fatal("fourth failure did not lock")
	}
	if remaining < 14*time.Minute || remaining > 15*time.Minute {
		t.Fatalf("expected roughly 15 minutes, got %v", remaining)
	}
	if held, _ := lock.locked("someone"); !held {
		t.Fatal("account should be locked")
	}

	// Wind the clock forward by expiring the entry the way time would.
	lock.mu.Lock()
	lock.entries["someone"].until = time.Now().Add(-time.Second)
	lock.mu.Unlock()

	if held, _ := lock.locked("someone"); held {
		t.Fatal("lock did not release once its time was up")
	}
	// And the slate is clean: the next mistake starts counting from one.
	if shut, _ := lock.fail("someone"); shut {
		t.Fatal("a single failure after release locked again — the count was not cleared")
	}
}

// Getting it right proves the earlier attempts were the same person mistyping.
func TestSuccessClearsFailures(t *testing.T) {
	lock := newLockout(4, 15*time.Minute, 15*time.Minute)
	lock.fail("someone")
	lock.fail("someone")
	lock.fail("someone")
	lock.succeed("someone")

	for i := 1; i <= 3; i++ {
		if shut, _ := lock.fail("someone"); shut {
			t.Fatalf("locked after %d failures following a success", i)
		}
	}
}

// Old mistakes should not accumulate: four typos spread over a month are not an
// attack.
func TestFailuresAgeOut(t *testing.T) {
	lock := newLockout(4, 15*time.Minute, 15*time.Minute)
	lock.fail("someone")
	lock.fail("someone")
	lock.fail("someone")

	lock.mu.Lock()
	lock.entries["someone"].firstFail = time.Now().Add(-time.Hour)
	lock.mu.Unlock()

	if shut, _ := lock.fail("someone"); shut {
		t.Fatal("stale failures counted towards a lockout")
	}
}
