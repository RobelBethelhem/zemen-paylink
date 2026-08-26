package domain

import "strings"

// Environment separates a rehearsal from real money.
//
// Test and live are different Mastercard gateways, with different merchant
// profiles and different API passwords. An operator therefore holds one
// connection per environment, and the two never share data: a link created in
// test is settled through the test gateway for the rest of its life, and test
// takings are never counted alongside real ones.
type Environment string

const (
	EnvTest Environment = "test"
	EnvLive Environment = "live"
)

func (e Environment) Valid() bool  { return e == EnvTest || e == EnvLive }
func (e Environment) IsLive() bool { return e == EnvLive }

func (e Environment) Label() string {
	if e == EnvLive {
		return "Live"
	}
	return "Test"
}

// ParseEnvironment falls back to test — the safe end of the switch. A missing
// or unrecognised value must never silently mean production.
func ParseEnvironment(raw string) Environment {
	if strings.EqualFold(strings.TrimSpace(raw), string(EnvLive)) {
		return EnvLive
	}
	return EnvTest
}

// GatewayHost is one MPGS endpoint we are willing to send an API password to.
type GatewayHost struct {
	Host        string      `json:"host"`
	Label       string      `json:"label"`
	Environment Environment `json:"environment"`
}

// KnownGatewayHosts are Mastercard's published MPGS endpoints. The test gateway
// simulates responses and moves no money; every other entry is production.
//
// Acquirers sometimes issue their own branded MPGS host. Those are accepted too
// — see AllowedGatewayHost — but they are not listed here, because we cannot
// tell from the name alone whether such a host is a rehearsal or the real
// thing, and guessing in that direction is how test money becomes real money.
var KnownGatewayHosts = []GatewayHost{
	{"test-gateway.mastercard.com", "Test gateway — simulated, no real money", EnvTest},
	{"ap-gateway.mastercard.com", "Asia Pacific — production", EnvLive},
	{"eu-gateway.mastercard.com", "Europe — production", EnvLive},
	{"na-gateway.mastercard.com", "North America — production", EnvLive},
}

// NormaliseHost strips the scheme, any path and a trailing dot or slash, so
// "https://ap-gateway.mastercard.com/" and "ap-gateway.mastercard.com" are the
// same host.
func NormaliseHost(raw string) string {
	h := strings.TrimSpace(raw)
	h = strings.TrimPrefix(strings.TrimPrefix(h, "https://"), "http://")
	if slash := strings.IndexAny(h, "/?"); slash >= 0 {
		h = h[:slash]
	}
	return strings.ToLower(strings.Trim(h, "./"))
}

// KnownHost returns the catalogue entry for a host, if we publish one.
func KnownHost(host string) (GatewayHost, bool) {
	host = NormaliseHost(host)
	for _, h := range KnownGatewayHosts {
		if h.Host == host {
			return h, true
		}
	}
	return GatewayHost{}, false
}

// DefaultHostFor is what the connect form prefills for an environment.
func DefaultHostFor(env Environment) string {
	for _, h := range KnownGatewayHosts {
		if h.Environment == env {
			return h.Host
		}
	}
	return KnownGatewayHosts[0].Host
}

// AllowedGatewayHost decides whether we will hand an API password to a host.
//
// This is a security boundary, not a convenience check. Whatever host an
// operator types is where their MPGS password gets sent, so an unchecked field
// here would let anyone who can talk an operator into pasting a hostname
// collect live gateway credentials. Only Mastercard's own domain and hosts the
// bank has explicitly configured are accepted.
func AllowedGatewayHost(host string, configured []string) bool {
	host = NormaliseHost(host)
	if host == "" {
		return false
	}
	if strings.HasSuffix(host, ".mastercard.com") {
		return true
	}
	for _, allowed := range configured {
		if host == NormaliseHost(allowed) {
			return true
		}
	}
	return false
}
