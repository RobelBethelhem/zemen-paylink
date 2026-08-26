// Package config loads runtime configuration from the environment.
package config

import (
	"bufio"
	"encoding/base64"
	"fmt"
	"net"
	"net/url"
	"os"
	"slices"
	"strings"
	"time"
)

type Config struct {
	Env      string
	Addr     string
	Database string

	// JWTSecret signs session tokens; EncryptionKey (32 bytes) seals gateway
	// API passwords at rest. Both are required — there is no safe default.
	JWTSecret     []byte
	EncryptionKey []byte
	TokenTTL      time.Duration

	// PublicBaseURL is where customers open pay links; it forms the shareable
	// URL and the gateway return URL, so it must be reachable by the payer.
	PublicBaseURL string
	CORSOrigins   []string

	DefaultGatewayHost string
	GatewayAPIVersion  string
	GatewayTimeout     time.Duration

	// ExtraGatewayHosts widens the set of hosts an operator may connect to,
	// beyond Mastercard's own domain. Acquirers sometimes issue a branded MPGS
	// endpoint; this is where the bank vouches for one. Anything not on
	// mastercard.com and not listed here is refused, because whatever host is
	// entered is where that operator's API password gets sent.
	ExtraGatewayHosts []string

	// TrustedProxies are the networks whose X-Forwarded-For header is believed.
	//
	// This decides who a rate limit and a lockout are attributed to, so it is a
	// security control, not plumbing: trust too widely and a caller picks their
	// own identity and walks around both. Defaults to loopback only. A
	// containerised deployment sets it to the network its TLS terminator is on.
	TrustedProxies []string

	// BootstrapPassword sets the first merchant-management account's password.
	// Outside development one is generated and printed once if this is unset —
	// a fixed, documented password on a live system is not a password.
	BootstrapPassword string

	SMTP SMTP
}

type SMTP struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

// Configured reports whether outbound email can actually be sent.
func (s SMTP) Configured() bool { return s.Host != "" && s.From != "" }

// LoadDotEnv reads KEY=VALUE lines from path into the process environment
// without overwriting variables that are already set.
func LoadDotEnv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
	return sc.Err()
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// lanAddress reports the IPv4 address other machines on this network would use
// to reach this one.
//
// Enumerating interfaces is not enough: a development machine usually carries
// virtual adapters — VirtualBox, WSL, Docker — whose addresses look perfectly
// plausible and go nowhere. Asking the OS which source address it would choose
// for an outbound packet yields the interface that actually holds the default
// route. Nothing is sent; dialling UDP only performs the route lookup.
func lanAddress() (string, error) {
	conn, err := net.Dial("udp", "203.0.113.1:9") // TEST-NET-3, never routed
	if err != nil {
		return "", fmt.Errorf("no network route to determine this machine's address: %w", err)
	}
	defer conn.Close()

	addr, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok || addr.IP == nil {
		return "", fmt.Errorf("could not determine this machine's address")
	}
	return addr.IP.String(), nil
}

// resolvePublicBaseURL expands the `lan` shorthand into this machine's real
// address.
//
// Pay links and the gateway's return URL are both built from this value, so
// testing from a phone or another PC needs it to be an address that resolves
// off this machine. Writing the address in by hand works until DHCP hands out a
// different one; `lan` (or `lan:3100` for another port) re-resolves each boot.
func resolvePublicBaseURL(raw string) (string, error) {
	value := strings.TrimRight(strings.TrimSpace(raw), "/")

	// A scheme may be written in front of the shorthand — `https://lan:3000` —
	// which matters because a browser only grants WebCrypto, and therefore the
	// sealed channel, to a secure context.
	scheme := "http"
	for _, prefix := range []string{"https://", "http://"} {
		if rest, found := strings.CutPrefix(value, prefix); found {
			scheme = strings.TrimSuffix(prefix, "://")
			value = rest
			break
		}
	}

	name, port, hasPort := strings.Cut(value, ":")
	if !strings.EqualFold(name, "lan") {
		return strings.TrimRight(strings.TrimSpace(raw), "/"), nil
	}
	if !hasPort || port == "" {
		port = "3000"
	}
	ip, err := lanAddress()
	if err != nil {
		return "", fmt.Errorf("PAYLINK_PUBLIC_BASE_URL=%q: %w", raw, err)
	}
	return fmt.Sprintf("%s://%s:%s", scheme, ip, port), nil
}

// listenAddr resolves where to listen.
//
// Container platforms — Railway, Render, Cloud Run, Heroku — inject PORT and
// expect the process to bind it on every interface. Honouring that convention
// means the same build runs on any of them with no configuration, while an
// explicit PAYLINK_ADDR still wins for a deployment that pins its own.
func listenAddr() string {
	if addr := os.Getenv("PAYLINK_ADDR"); addr != "" {
		return addr
	}
	if port := os.Getenv("PORT"); port != "" {
		return "0.0.0.0:" + port
	}
	return ":8080"
}

// normaliseDSN accepts either form of connection string.
//
// A managed MySQL hands out a URL — mysql://user:pass@host:3306/db — while the
// Go driver wants user:pass@tcp(host:3306)/db. Converting here means the value
// a platform injects can be pasted in unchanged, rather than being rewritten by
// hand into a shape the driver accepts and getting it subtly wrong.
func normaliseDSN(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if !strings.HasPrefix(raw, "mysql://") {
		return raw, nil
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("PAYLINK_DATABASE is not a valid MySQL URL: %w", err)
	}
	credentials := ""
	if parsed.User != nil {
		credentials = parsed.User.Username()
		if password, set := parsed.User.Password(); set {
			credentials += ":" + password
		}
		credentials += "@"
	}
	host := parsed.Host
	if host == "" {
		return "", fmt.Errorf("PAYLINK_DATABASE has no host")
	}
	if !strings.Contains(host, ":") {
		host += ":3306"
	}
	database := strings.TrimPrefix(parsed.Path, "/")
	if database == "" {
		return "", fmt.Errorf("PAYLINK_DATABASE names no database")
	}
	dsn := fmt.Sprintf("%stcp(%s)/%s", credentials, host, database)
	if parsed.RawQuery != "" {
		dsn += "?" + parsed.RawQuery
	}
	return dsn, nil
}

func Load() (*Config, error) {
	c := &Config{
		Env:  env("PAYLINK_ENV", "development"),
		Addr: listenAddr(),
		Database: env("PAYLINK_DATABASE",
			"paylink:paylink@tcp(127.0.0.1:3306)/paylink?parseTime=false"),
		TokenTTL:           12 * time.Hour,
		PublicBaseURL:      env("PAYLINK_PUBLIC_BASE_URL", "http://localhost:3000"),
		CORSOrigins:        splitList(env("PAYLINK_CORS_ORIGINS", "http://localhost:3000,http://localhost:3100")),
		DefaultGatewayHost: env("PAYLINK_GATEWAY_HOST", "test-gateway.mastercard.com"),
		GatewayAPIVersion:  env("PAYLINK_GATEWAY_API_VERSION", "100"),
		GatewayTimeout:     30 * time.Second,
		ExtraGatewayHosts:  splitList(os.Getenv("PAYLINK_GATEWAY_EXTRA_HOSTS")),
		BootstrapPassword:  os.Getenv("PAYLINK_BOOTSTRAP_PASSWORD"),
		TrustedProxies:     splitList(env("PAYLINK_TRUSTED_PROXIES", "127.0.0.0/8,::1/128")),
		SMTP: SMTP{
			Host:     os.Getenv("PAYLINK_SMTP_HOST"),
			Port:     env("PAYLINK_SMTP_PORT", "587"),
			Username: os.Getenv("PAYLINK_SMTP_USERNAME"),
			Password: os.Getenv("PAYLINK_SMTP_PASSWORD"),
			From:     os.Getenv("PAYLINK_SMTP_FROM"),
		},
	}

	dsn, err := normaliseDSN(c.Database)
	if err != nil {
		return nil, err
	}
	c.Database = dsn

	resolved, err := resolvePublicBaseURL(c.PublicBaseURL)
	if err != nil {
		return nil, err
	}
	c.PublicBaseURL = resolved

	// The portal is always allowed to call the API it generates links for, so
	// pointing PAYLINK_PUBLIC_BASE_URL at a LAN address or tunnel is enough —
	// no second CORS variable to keep in sync.
	if c.PublicBaseURL != "" && !slices.Contains(c.CORSOrigins, c.PublicBaseURL) {
		c.CORSOrigins = append(c.CORSOrigins, c.PublicBaseURL)
	}

	secret := os.Getenv("PAYLINK_JWT_SECRET")
	if len(secret) < 32 {
		return nil, fmt.Errorf("PAYLINK_JWT_SECRET must be set and at least 32 characters")
	}
	c.JWTSecret = []byte(secret)

	rawKey := os.Getenv("PAYLINK_ENCRYPTION_KEY")
	if rawKey == "" {
		return nil, fmt.Errorf("PAYLINK_ENCRYPTION_KEY must be set (base64 of 32 random bytes)")
	}
	key, err := base64.StdEncoding.DecodeString(rawKey)
	if err != nil {
		return nil, fmt.Errorf("PAYLINK_ENCRYPTION_KEY is not valid base64: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("PAYLINK_ENCRYPTION_KEY must decode to exactly 32 bytes, got %d", len(key))
	}
	c.EncryptionKey = key

	return c, nil
}

func splitList(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
