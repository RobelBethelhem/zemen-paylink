package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Who a request is attributed to decides who a rate limit and a lockout apply
// to. Trust the header too widely and a caller picks their own identity, and
// every control built on top of it quietly stops working.
func TestClientIPTrustsOnlyConfiguredProxies(t *testing.T) {
	proxies, err := parseTrustedProxies([]string{"127.0.0.0/8", "172.18.0.0/16"})
	if err != nil {
		t.Fatal(err)
	}
	s := &Server{trustedProxies: proxies}

	cases := []struct {
		name, peer, forwarded, want string
	}{
		{"direct caller, no header", "203.0.113.9:5000", "", "203.0.113.9"},
		{"untrusted peer cannot claim another address",
			"203.0.113.9:5000", "9.9.9.9", "203.0.113.9"},
		{"trusted proxy on the container network is believed",
			"172.18.0.5:5000", "203.0.113.9", "203.0.113.9"},
		{"loopback proxy is believed", "127.0.0.1:5000", "203.0.113.9", "203.0.113.9"},
		{"only the first hop is taken",
			"127.0.0.1:5000", "203.0.113.9, 10.0.0.1, 172.18.0.5", "203.0.113.9"},
		{"an empty header falls back to the peer", "127.0.0.1:5000", "  ", "127.0.0.1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/api/v1/links", nil)
			r.RemoteAddr = tc.peer
			if tc.forwarded != "" {
				r.Header.Set("X-Forwarded-For", tc.forwarded)
			}
			if got := s.clientIP(r); got != tc.want {
				t.Fatalf("attributed to %q, expected %q", got, tc.want)
			}
		})
	}
}

// A proxy list that cannot be read is a configuration error, not something to
// paper over — silently trusting nothing would attribute every request in a
// containerised deployment to the TLS terminator.
func TestTrustedProxiesRejectsNonsense(t *testing.T) {
	if _, err := parseTrustedProxies([]string{"not-an-address"}); err == nil {
		t.Fatal("expected an unreadable proxy entry to be refused")
	}
	if _, err := parseTrustedProxies([]string{"10.0.0.7"}); err != nil {
		t.Fatalf("a bare address should be accepted as a single host: %v", err)
	}
}
