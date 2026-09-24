package secure

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"testing"
	"time"
)

var testSecret = []byte("an-issued-signing-secret-long-enough")

// sign builds the signature a well-behaved integrator would send.
func sign(secret []byte, method, uri, ts, nonce string, body []byte) string {
	sum := sha256.Sum256(body)
	mac := hmac.New(sha256.New, secret)
	fmt.Fprintf(mac, "%s\n%s\n%s\n%s\n%s", method, uri, ts, nonce, hex.EncodeToString(sum[:]))
	return b64().EncodeToString(mac.Sum(nil))
}

func nowMillis() string { return strconv.FormatInt(time.Now().UnixMilli(), 10) }

func TestValidSignatureIsAccepted(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{"iv":"x","ct":"y"}`)
	ts, nonce := nowMillis(), "nonce-1"

	err := v.Verify("pk_test_a", testSecret, "POST", []string{"/api/v1/integration/links"},
		ts, nonce, sign(testSecret, "POST", "/api/v1/integration/links", ts, nonce, body), body)
	if err != nil {
		t.Fatalf("a correctly signed request was refused: %v", err)
	}
}

// The whole point of signing: holding the API key is not enough.
func TestWrongSecretIsRefused(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "nonce-1"
	forged := sign([]byte("not-the-right-secret"), "POST", "/x", ts, nonce, body)

	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, ts, nonce, forged, body); err != ErrBadSignature {
		t.Fatalf("expected ErrBadSignature, got %v", err)
	}
}

// A captured request must not work twice, or a donation could be created again
// by anyone who saw one go past.
func TestReplayIsRefused(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "nonce-once"
	sig := sign(testSecret, "POST", "/x", ts, nonce, body)

	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, ts, nonce, sig, body); err != nil {
		t.Fatalf("first use failed: %v", err)
	}
	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, ts, nonce, sig, body); err != ErrReplay {
		t.Fatalf("expected ErrReplay on the second use, got %v", err)
	}
}

// Nonces belong to the key that used them. Without this, one integrator could
// spend another's nonces and make their calls fail at will.
func TestNoncesAreScopedToTheKey(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "shared-nonce"
	sig := sign(testSecret, "POST", "/x", ts, nonce, body)

	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, ts, nonce, sig, body); err != nil {
		t.Fatalf("first key failed: %v", err)
	}
	if err := v.Verify("pk_test_b", testSecret, "POST", []string{"/x"}, ts, nonce, sig, body); err != nil {
		t.Fatalf("a second key was blocked by the first key's nonce: %v", err)
	}
}

// An old capture is not a slow server.
func TestStaleTimestampIsRefused(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	old := strconv.FormatInt(time.Now().Add(-ClockSkew-time.Minute).UnixMilli(), 10)
	sig := sign(testSecret, "POST", "/x", old, "n", body)

	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, old, "n", sig, body); err != ErrStale {
		t.Fatalf("expected ErrStale, got %v", err)
	}
	// And the future is no better, or a wrong clock becomes a way in.
	future := strconv.FormatInt(time.Now().Add(ClockSkew+time.Minute).UnixMilli(), 10)
	sig = sign(testSecret, "POST", "/x", future, "n2", body)
	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, future, "n2", sig, body); err != ErrStale {
		t.Fatalf("expected ErrStale for a future timestamp, got %v", err)
	}
}

// The signature covers the body, so changing an amount in flight invalidates it.
func TestAlteredBodyIsRefused(t *testing.T) {
	v := NewKeyVerifier()
	original := []byte(`{"amount":"10.00"}`)
	ts, nonce := nowMillis(), "n"
	sig := sign(testSecret, "POST", "/x", ts, nonce, original)

	altered := []byte(`{"amount":"9000.00"}`)
	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/x"}, ts, nonce, sig, altered); err != ErrBadSignature {
		t.Fatalf("an altered body was accepted: %v", err)
	}
}

// The signature covers the path too: a signed read must not become a signed
// write by moving it to another endpoint.
func TestSignatureIsBoundToTheRequestLine(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "n"
	sig := sign(testSecret, "GET", "/api/v1/integration/ping", ts, nonce, body)

	if err := v.Verify("pk_test_a", testSecret, "POST", []string{"/api/v1/integration/links"},
		ts, nonce, sig, body); err != ErrBadSignature {
		t.Fatalf("a signature was reused on a different request: %v", err)
	}
}

func TestMissingPiecesAreRefused(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts := nowMillis()

	if err := v.Verify("pk", nil, "POST", []string{"/x"}, ts, "n", "sig", body); err != ErrBadSignature {
		t.Fatalf("an empty secret was not refused: %v", err)
	}
	if err := v.Verify("pk", testSecret, "POST", []string{"/x"}, ts, "", "sig", body); err != ErrBadSignature {
		t.Fatalf("an empty nonce was not refused: %v", err)
	}
}

// Both directions use one envelope, so an integrator writes open() once.
func TestSealedPayloadRoundTrips(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	plaintext := []byte(`{"title":"Donation","metadata":{"campaign":"clean-water"}}`)

	env, err := Seal(key, plaintext, "pk_test_a", "nonce-1")
	if err != nil {
		t.Fatalf("seal: %v", err)
	}
	opened, err := Open(key, env, "pk_test_a", "nonce-1")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if string(opened) != string(plaintext) {
		t.Fatalf("round trip changed the payload: %q", opened)
	}

	// The nonce is bound in as additional data, so a body cannot be lifted out
	// of one request and replayed inside another.
	if _, err := Open(key, env, "pk_test_a", "different-nonce"); err == nil {
		t.Fatal("a payload opened under a nonce it was not sealed with")
	}
	if _, err := Open(key, env, "pk_test_b", "nonce-1"); err == nil {
		t.Fatal("a payload opened under a different key's identity")
	}
}

// A receiver has to be able to tell our call from anyone who learned their URL.
func TestOutboundSignatureIsStableAndKeyed(t *testing.T) {
	body := []byte(`{"iv":"a","ct":"b"}`)
	first := SignOutbound(testSecret, "1757000000000", body)
	again := SignOutbound(testSecret, "1757000000000", body)
	if first != again {
		t.Fatal("the same input produced two different signatures")
	}
	if SignOutbound([]byte("another-secret"), "1757000000000", body) == first {
		t.Fatal("a different secret produced the same signature")
	}
	if SignOutbound(testSecret, "1757000000001", body) == first {
		t.Fatal("the timestamp is not covered by the signature")
	}
}

// Behind a proxy that strips a path prefix, the caller signs the address they
// called and we are handed a shorter path. Both have to verify, or the whole
// public deployment answers signature_invalid to correct clients.
func TestSignatureOverThePublicPathIsAccepted(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{"iv":"x","ct":"y"}`)
	ts, nonce := nowMillis(), "n"

	// What the integrator called and signed.
	publicPath := "/paybylinkapi/api/v1/integration/links"
	sig := sign(testSecret, "POST", publicPath, ts, nonce, body)

	// What we were handed, plus what it could have been before the proxy.
	candidates := []string{"/api/v1/integration/links", publicPath}
	if err := v.Verify("pk_test_a", testSecret, "POST", candidates, ts, nonce, sig, body); err != nil {
		t.Fatalf("a request signed over the public path was refused: %v", err)
	}
}

// The internal caller signs the path as we receive it, and must keep working
// on the very same deployment.
func TestSignatureOverTheInternalPathStillWorks(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "n"

	internal := "/api/v1/integration/links"
	sig := sign(testSecret, "POST", internal, ts, nonce, body)

	candidates := []string{internal, "/paybylinkapi" + internal}
	if err := v.Verify("pk_test_a", testSecret, "POST", candidates, ts, nonce, sig, body); err != nil {
		t.Fatalf("a request signed over the internal path was refused: %v", err)
	}
}

// Accepting more than one path must not accept a path nobody offered.
func TestAnUnlistedPathIsStillRefused(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "n"
	sig := sign(testSecret, "POST", "/somewhere/else", ts, nonce, body)

	candidates := []string{"/api/v1/integration/links", "/paybylinkapi/api/v1/integration/links"}
	if err := v.Verify("pk_test_a", testSecret, "POST", candidates, ts, nonce, sig, body); err != ErrBadSignature {
		t.Fatalf("a signature over an unrelated path was accepted: %v", err)
	}
}

// A nonce is spent once, whichever candidate path matched — otherwise the
// prefix tolerance would quietly become a way to replay each request twice.
func TestReplayIsRefusedAcrossCandidatePaths(t *testing.T) {
	v := NewKeyVerifier()
	body := []byte(`{}`)
	ts, nonce := nowMillis(), "n-once"
	publicPath := "/paybylinkapi/api/v1/integration/links"
	sig := sign(testSecret, "POST", publicPath, ts, nonce, body)
	candidates := []string{"/api/v1/integration/links", publicPath}

	if err := v.Verify("pk_test_a", testSecret, "POST", candidates, ts, nonce, sig, body); err != nil {
		t.Fatalf("first use failed: %v", err)
	}
	if err := v.Verify("pk_test_a", testSecret, "POST", candidates, ts, nonce, sig, body); err != ErrReplay {
		t.Fatalf("expected ErrReplay on the second use, got %v", err)
	}
}
