package secure

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// Verification for a caller holding a secret issued to it in advance, rather
// than one derived through a handshake.
//
// A server-to-server integration cannot perform the browser's ECDH exchange —
// there is no browser, and no WebCrypto — so it signs with a pre-shared secret
// instead. Everything else is deliberately identical to the browser channel:
// the same canonical string, the same HMAC, the same sealed envelope. One
// format to document, one to review, and one to get wrong.
//
// What differs is lifetime. A derived key lasts half an hour; an issued secret
// lasts until it is rotated, so the replay window and the clock skew are the
// only thing standing between a captured request and a repeated one. Both are
// enforced here, not by the caller.

// MaxIntegrationBody bounds a sealed body before anything tries to decrypt it.
const MaxIntegrationBody = 256 << 10

// KeyVerifier checks signatures made with issued secrets and refuses replays.
//
// Nonces are scoped to the key that used them: one integration must not be able
// to burn a nonce another is about to use, which would be a way to make a
// competitor's requests fail at will.
type KeyVerifier struct {
	mu   sync.Mutex
	seen map[string]time.Time
	now  func() time.Time
}

func NewKeyVerifier() *KeyVerifier {
	v := &KeyVerifier{seen: map[string]time.Time{}, now: time.Now}
	go func() {
		for range time.Tick(ClockSkew) {
			v.sweep()
		}
	}()
	return v
}

func (v *KeyVerifier) sweep() {
	cutoff := v.now().Add(-ClockSkew * 2)
	v.mu.Lock()
	defer v.mu.Unlock()
	for k, at := range v.seen {
		if at.Before(cutoff) {
			delete(v.seen, k)
		}
	}
}

// Verify checks that this request was signed by the holder of secret and has
// not been seen before.
//
// scope identifies the credential the nonce belongs to — the API key. body is
// the raw bytes as received, before any decryption, because that is what the
// caller signed.
//
// uris holds every path this request may legitimately have been signed over.
// Behind a reverse proxy that strips a path prefix, the caller signs the
// address they called — https://share.zemenbank.com/paybylinkapi/... — while we
// are handed the path with the prefix already removed. The two do not match,
// and a signature computed over the wrong one is indistinguishable from a
// forgery. Rather than making every integrator sign a path they never used, we
// check the handful of paths this request could honestly have arrived as.
//
// This widens nothing an attacker can use: each candidate is still a full HMAC
// under the secret, and the candidates are built by us from our own
// configuration, never from anything the caller sent.
func (v *KeyVerifier) Verify(
	scope string, secret []byte, method string, uris []string, ts, nonce, sig string, body []byte,
) error {
	if len(secret) == 0 {
		return ErrBadSignature
	}
	if nonce == "" || len(nonce) > 128 {
		return ErrBadSignature
	}

	millis, err := parseMillis(ts)
	if err != nil {
		return ErrStale
	}
	age := v.now().Sub(time.UnixMilli(millis))
	if age > ClockSkew || age < -ClockSkew {
		return ErrStale
	}

	provided, err := b64().DecodeString(sig)
	if err != nil {
		return ErrBadSignature
	}
	sum := hex.EncodeToString(sliceSum(body))

	matched := false
	for _, uri := range uris {
		if uri == "" {
			continue
		}
		mac := hmac.New(sha256.New, secret)
		fmt.Fprintf(mac, "%s\n%s\n%s\n%s\n%s", method, uri, ts, nonce, sum)
		// Every candidate is compared, rather than breaking on the first match,
		// so how long this takes does not depend on which one was right.
		if subtle.ConstantTimeCompare(mac.Sum(nil), provided) == 1 {
			matched = true
		}
	}
	if !matched {
		return ErrBadSignature
	}

	// Burned only once the signature holds: an unsigned request must not be
	// able to consume a nonce and lock the real caller out of using it.
	key := scope + "\x00" + nonce
	v.mu.Lock()
	defer v.mu.Unlock()
	if _, replayed := v.seen[key]; replayed {
		return ErrReplay
	}
	v.seen[key] = v.now()
	return nil
}

// SignOutbound produces the signature sent with a webhook, so the receiver can
// prove the call came from us and not from anyone who learned their URL.
//
// The timestamp is signed along with the body for the same reason we require
// one inbound: without it, a captured delivery can be replayed forever.
func SignOutbound(secret []byte, timestamp string, body []byte) string {
	sum := sha256.Sum256(body)
	mac := hmac.New(sha256.New, secret)
	fmt.Fprintf(mac, "%s\n%s", timestamp, hex.EncodeToString(sum[:]))
	return b64().EncodeToString(mac.Sum(nil))
}

// sliceSum is sha256 of the body as a slice, so the digest can be computed once
// and reused across candidate paths.
func sliceSum(body []byte) []byte {
	sum := sha256.Sum256(body)
	return sum[:]
}
