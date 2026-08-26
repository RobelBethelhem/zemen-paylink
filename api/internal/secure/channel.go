// Package secure carries the application-layer channel between the portal and
// this API: an ECDH handshake, an AES-GCM sealed payload, and a signature over
// every request.
//
// What this is for, stated plainly, because the difference matters:
//
//   - It encrypts payloads on the wire *in addition to* TLS. On a plain-HTTP
//     deployment — which is what a LAN pilot is — it is the only thing standing
//     between a payment payload and anyone running Wireshark on the network.
//   - It authenticates that a request came from a browser that completed the
//     handshake and holds the derived key, which is what stops a plain
//     hand-rolled request (Postman, curl, a replayed capture) from being served.
//   - It is NOT a substitute for TLS. The handshake key is unauthenticated, so
//     an *active* man in the middle can still present their own public key.
//     Only a server certificate fixes that. Run this behind HTTPS.
package secure

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"

	"golang.org/x/crypto/hkdf"
)

const (
	// SessionTTL bounds how long one derived key stays usable. Short enough
	// that a stolen key ages out, long enough not to re-handshake constantly.
	SessionTTL = 30 * time.Minute
	// ClockSkew is how far a request timestamp may sit from ours. Anything
	// older is a replay of a captured request, not a slow phone.
	ClockSkew = 2 * time.Minute
	// MaxSessions bounds memory: a flood of handshakes must not exhaust it.
	MaxSessions = 20000
	// MaxBody is the largest sealed payload accepted, before decryption.
	MaxBody = 1 << 20

	hkdfInfo = "zemen-paylink-secure-channel-v1"
)

var (
	ErrNoSession    = errors.New("secure: unknown or expired channel")
	ErrBadEnvelope  = errors.New("secure: payload could not be opened")
	ErrReplay       = errors.New("secure: request already seen")
	ErrStale        = errors.New("secure: request timestamp outside the accepted window")
	ErrBadSignature = errors.New("secure: request signature does not match")
)

// Envelope is the sealed form of a request or response body.
type Envelope struct {
	IV string `json:"iv"`
	CT string `json:"ct"`
}

type session struct {
	key       []byte
	expiresAt time.Time
	// nonces seen on this channel, so a captured request cannot be re-sent.
	nonces map[string]time.Time
	mu     sync.Mutex
}

// Registry holds live channels. Sessions are in memory on purpose: a restart
// invalidating every channel is correct, and the client re-handshakes.
type Registry struct {
	mu       sync.RWMutex
	sessions map[string]*session
	now      func() time.Time
}

func NewRegistry() *Registry {
	r := &Registry{sessions: map[string]*session{}, now: time.Now}
	go r.sweep()
	return r
}

func (r *Registry) sweep() {
	for range time.Tick(time.Minute) {
		cutoff := r.now()
		r.mu.Lock()
		for id, s := range r.sessions {
			if cutoff.After(s.expiresAt) {
				delete(r.sessions, id)
			}
		}
		r.mu.Unlock()
	}
}

func b64() *base64.Encoding { return base64.RawURLEncoding }

// Handshake completes ECDH against the client's ephemeral public key and
// returns the channel id and this server's ephemeral public key.
//
// Both keys are ephemeral and per channel, so a key recovered from one session
// reveals nothing about any other.
func (r *Registry) Handshake(clientPublicKey string) (id string, serverPublicKey string, err error) {
	raw, err := b64().DecodeString(clientPublicKey)
	if err != nil {
		return "", "", fmt.Errorf("secure: client key is not valid base64url: %w", err)
	}
	curve := ecdh.P256()
	// Rejects points that are not on the curve, so a crafted key cannot steer
	// the shared secret.
	peer, err := curve.NewPublicKey(raw)
	if err != nil {
		return "", "", fmt.Errorf("secure: client key is not a valid P-256 point: %w", err)
	}
	priv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		return "", "", fmt.Errorf("secure: generate ephemeral key: %w", err)
	}
	shared, err := priv.ECDH(peer)
	if err != nil {
		return "", "", fmt.Errorf("secure: key agreement failed: %w", err)
	}

	idBytes := make([]byte, 18)
	if _, err := rand.Read(idBytes); err != nil {
		return "", "", fmt.Errorf("secure: generate channel id: %w", err)
	}
	id = b64().EncodeToString(idBytes)

	// The channel id doubles as the HKDF salt, so two channels sharing a
	// secret by accident still derive different keys.
	key := make([]byte, 32)
	if _, err := io.ReadFull(hkdf.New(sha256.New, shared, idBytes, []byte(hkdfInfo)), key); err != nil {
		return "", "", fmt.Errorf("secure: derive key: %w", err)
	}

	r.mu.Lock()
	if len(r.sessions) >= MaxSessions {
		// Drop the oldest rather than grow without bound.
		var oldestID string
		var oldest time.Time
		for sid, s := range r.sessions {
			if oldest.IsZero() || s.expiresAt.Before(oldest) {
				oldestID, oldest = sid, s.expiresAt
			}
		}
		delete(r.sessions, oldestID)
	}
	r.sessions[id] = &session{
		key:       key,
		expiresAt: r.now().Add(SessionTTL),
		nonces:    map[string]time.Time{},
	}
	r.mu.Unlock()

	return id, b64().EncodeToString(priv.PublicKey().Bytes()), nil
}

func (r *Registry) lookup(id string) (*session, error) {
	r.mu.RLock()
	s, ok := r.sessions[id]
	r.mu.RUnlock()
	if !ok || r.now().After(s.expiresAt) {
		return nil, ErrNoSession
	}
	return s, nil
}

// Verify checks a request's signature, freshness and uniqueness in one place.
//
// The signature covers the method, the full request URI and a hash of the body,
// so a captured request cannot be pointed at a different endpoint, have its
// query string edited, or have its payload swapped.
func (r *Registry) Verify(id, method, uri, ts, nonce, sig string, body []byte) ([]byte, error) {
	s, err := r.lookup(id)
	if err != nil {
		return nil, err
	}

	millis, err := parseMillis(ts)
	if err != nil {
		return nil, ErrStale
	}
	age := r.now().Sub(time.UnixMilli(millis))
	if age > ClockSkew || age < -ClockSkew {
		return nil, ErrStale
	}

	sum := sha256.Sum256(body)
	mac := hmac.New(sha256.New, s.key)
	fmt.Fprintf(mac, "%s\n%s\n%s\n%s\n%s", method, uri, ts, nonce, hex.EncodeToString(sum[:]))
	expected := mac.Sum(nil)

	provided, err := b64().DecodeString(sig)
	if err != nil || subtle.ConstantTimeCompare(expected, provided) != 1 {
		return nil, ErrBadSignature
	}

	// Only now is the nonce burned: an unsigned request must not be able to
	// consume a nonce and lock the real one out.
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, seen := s.nonces[nonce]; seen {
		return nil, ErrReplay
	}
	cutoff := r.now().Add(-ClockSkew * 2)
	for n, at := range s.nonces {
		if at.Before(cutoff) {
			delete(s.nonces, n)
		}
	}
	s.nonces[nonce] = r.now()

	return s.key, nil
}

// Open decrypts a sealed request body. The nonce is bound in as additional data
// so a payload cannot be lifted from one request into another.
func Open(key []byte, env Envelope, sessionID, nonce string) ([]byte, error) {
	iv, err := b64().DecodeString(env.IV)
	if err != nil {
		return nil, ErrBadEnvelope
	}
	ct, err := b64().DecodeString(env.CT)
	if err != nil {
		return nil, ErrBadEnvelope
	}
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	if len(iv) != gcm.NonceSize() {
		return nil, ErrBadEnvelope
	}
	plain, err := gcm.Open(nil, iv, ct, aad(sessionID, nonce))
	if err != nil {
		return nil, ErrBadEnvelope
	}
	return plain, nil
}

// Seal encrypts a response body for the channel it was requested on.
func Seal(key, plaintext []byte, sessionID, nonce string) (Envelope, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return Envelope{}, err
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(iv); err != nil {
		return Envelope{}, fmt.Errorf("secure: generate iv: %w", err)
	}
	ct := gcm.Seal(nil, iv, plaintext, aad(sessionID, nonce))
	return Envelope{IV: b64().EncodeToString(iv), CT: b64().EncodeToString(ct)}, nil
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("secure: cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("secure: gcm: %w", err)
	}
	return gcm, nil
}

func aad(sessionID, nonce string) []byte {
	return []byte(sessionID + "|" + nonce)
}

func parseMillis(s string) (int64, error) {
	var n int64
	if s == "" || len(s) > 20 {
		return 0, errors.New("secure: bad timestamp")
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, errors.New("secure: bad timestamp")
		}
		n = n*10 + int64(c-'0')
	}
	return n, nil
}

// DecodeEnvelope reads a sealed body off the wire.
func DecodeEnvelope(raw []byte) (Envelope, error) {
	var env Envelope
	if err := json.Unmarshal(raw, &env); err != nil || env.CT == "" || env.IV == "" {
		return Envelope{}, ErrBadEnvelope
	}
	return env, nil
}
