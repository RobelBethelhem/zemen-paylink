package auth

import "testing"

// The cases that matter are the ones a cracker tries, not the ones a form
// designer imagines.
func TestValidatePassword(t *testing.T) {
	for _, tc := range []struct {
		name, password string
		context        []string
		wantErr        bool
	}{
		{"too short", "Short1!xy", nil, true},
		{"exactly twelve", "correcthorse", nil, false},
		{"passphrase with spaces", "correct horse battery staple", nil, false},
		{"no composition rule imposed", "totallyfinepassphrase", nil, false},
		{"unicode", "ሰላም ነው ዛሬ በጣም", nil, false},

		{"common word", "password1234", nil, true},
		{"common word with year", "password2026", nil, true},
		{"leetspeak", "P@ssw0rd1234", nil, true},
		{"leet with punctuation tail", "P@ssw0rd!!!!", nil, true},
		{"deployment guessable", "ZemenBank2026", nil, true},
		{"keyboard walk", "qwerty123456", nil, true},
		{"local dictionary", "addisababa12", nil, true},
		{"repeated character", "aaaaaaaaaaaa", nil, true},

		{"contains username", "dawit.alemu99", []string{"dawit.alemu"}, true},
		{"contains merchant number", "x000000001100y", []string{"000000001100"}, true},

		{"over 72 bytes refused", string(make([]byte, 0, 80)) + longString(80), nil, true},
		{"72 bytes accepted", longString(72), nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePassword(tc.password, tc.context...)
			if tc.wantErr && err == nil {
				t.Fatalf("expected %q to be refused, it was accepted", tc.password)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected %q to be accepted, got %v", tc.password, err)
			}
		})
	}
}

// longString builds a password of exactly n bytes that is not otherwise weak.
func longString(n int) string {
	const alphabet = "abcdefghijkmnpqrstuvwxyz"
	out := make([]byte, n)
	for i := range out {
		out[i] = alphabet[i%len(alphabet)]
	}
	return string(out)
}

// A password that bcrypt would silently truncate must never be accepted: two
// different passwords sharing the first 72 bytes would open the same account.
func TestNoSilentTruncation(t *testing.T) {
	base := longString(72)
	if err := ValidatePassword(base); err != nil {
		t.Fatalf("72 bytes should be accepted: %v", err)
	}
	if err := ValidatePassword(base + "extra"); err == nil {
		t.Fatal("a password past bcrypt's 72-byte limit was accepted")
	}
}
