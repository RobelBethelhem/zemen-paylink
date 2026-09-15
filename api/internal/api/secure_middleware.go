package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/secure"
)

// Header names for the sealed channel. Short, and prefixed so nothing else
// collides with them.
const (
	hdrSession = "X-PL-Session"
	hdrTS      = "X-PL-TS"
	hdrNonce   = "X-PL-Nonce"
	hdrSig     = "X-PL-Sig"
)

type handshakeRequest struct {
	PublicKey string `json:"publicKey"`
}

type handshakeResponse struct {
	SessionID string `json:"sessionId"`
	PublicKey string `json:"publicKey"`
	ExpiresIn int    `json:"expiresIn"`
}

// handleHandshake opens a sealed channel. This is the only /api/v1 endpoint
// that speaks plaintext, because it is where the key comes from.
func (s *Server) handleHandshake(w http.ResponseWriter, r *http.Request) {
	// Bound the body before parsing: this endpoint is reachable unauthenticated.
	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var req handshakeRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	id, serverKey, err := s.channels.Handshake(req.PublicKey)
	if err != nil {
		// The detail names which part of a key was rejected; that is useful to
		// us and useless to a caller, so it stays in the log.
		slog.Warn("secure handshake rejected", "error", err, "remote", s.clientIP(r))
		httpx.Error(w, http.StatusBadRequest, "Could not open a secure channel.")
		return
	}
	httpx.JSON(w, http.StatusOK, handshakeResponse{
		SessionID: id,
		PublicKey: serverKey,
		ExpiresIn: int(secure.SessionTTL.Seconds()),
	})
}

// sealedRecorder buffers a handler's response so it can be encrypted once the
// handler is done with it.
type sealedRecorder struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func (s *sealedRecorder) Header() http.Header { return s.header }
func (s *sealedRecorder) WriteHeader(code int) {
	if s.status == 0 {
		s.status = code
	}
}
func (s *sealedRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	return s.body.Write(b)
}

// openChannel is the wall every API call passes through.
//
// A request that is not sealed is not served. That is the point: it means a
// caller has to have completed the handshake in a real browser session and hold
// the derived key, rather than replaying a JSON body from a REST client. It
// also means the payload is encrypted on the wire independently of TLS.
func (s *Server) openChannel(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.channelRequired(r) {
			next.ServeHTTP(w, r)
			return
		}

		// Where a browser says it came from. A sealed channel already binds the
		// caller far more tightly than this does, but a mismatch is a cheap and
		// early signal that something is replaying from elsewhere.
		if !s.originAllowed(r) {
			slog.Warn("request from unexpected origin",
				"origin", r.Header.Get("Origin"), "path", r.URL.Path, "remote", s.clientIP(r))
			httpx.ErrorCode(w, http.StatusForbidden, "origin_rejected",
				"This request did not come from the portal.")
			return
		}

		sessionID := r.Header.Get(hdrSession)
		nonce := r.Header.Get(hdrNonce)
		if sessionID == "" || nonce == "" || r.Header.Get(hdrSig) == "" {
			httpx.ErrorCode(w, http.StatusUpgradeRequired, "secure_channel_required",
				"This API only accepts requests on a secure channel.")
			return
		}

		raw, err := io.ReadAll(io.LimitReader(r.Body, secure.MaxBody))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Could not read the request.")
			return
		}
		_ = r.Body.Close()

		key, err := s.channels.Verify(
			sessionID, r.Method, r.URL.RequestURI(),
			r.Header.Get(hdrTS), nonce, r.Header.Get(hdrSig), raw,
		)
		if err != nil {
			s.writeChannelError(w, r, err)
			return
		}

		// Swap the sealed body for its plaintext, so every handler downstream
		// is written against ordinary JSON and knows nothing about any of this.
		if len(raw) > 0 {
			env, err := secure.DecodeEnvelope(raw)
			if err != nil {
				httpx.ErrorCode(w, http.StatusBadRequest, "secure_payload_invalid",
					"That payload was not sealed correctly.")
				return
			}
			plain, err := secure.Open(key, env, sessionID, nonce)
			if err != nil {
				slog.Warn("sealed payload rejected", "path", r.URL.Path, "remote", s.clientIP(r))
				httpx.ErrorCode(w, http.StatusBadRequest, "secure_payload_invalid",
					"That payload could not be opened.")
				return
			}
			r.Body = io.NopCloser(bytes.NewReader(plain))
			r.ContentLength = int64(len(plain))
		} else {
			r.Body = io.NopCloser(bytes.NewReader(nil))
			r.ContentLength = 0
		}

		rec := &sealedRecorder{header: http.Header{}}
		next.ServeHTTP(rec, r)

		env, err := secure.Seal(key, rec.body.Bytes(), sessionID, nonce)
		if err != nil {
			slog.Error("could not seal response", "path", r.URL.Path, "error", err)
			httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
			return
		}
		for k, values := range rec.header {
			// Length and type describe the plaintext, not what is being sent.
			if k == "Content-Length" || k == "Content-Type" {
				continue
			}
			for _, v := range values {
				w.Header().Add(k, v)
			}
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("X-PL-Sealed", "1")
		status := rec.status
		if status == 0 {
			status = http.StatusOK
		}
		w.WriteHeader(status)
		if err := json.NewEncoder(w).Encode(env); err != nil {
			slog.Error("write sealed response", "path", r.URL.Path, "error", err)
		}
	})
}

// channelRequired decides what has to be sealed. Everything under /api/v1 does,
// except the handshake that establishes the channel in the first place, and
// except a preflight, which carries no payload and no credentials.
func (s *Server) channelRequired(r *http.Request) bool {
	if r.Method == http.MethodOptions {
		return false
	}
	if !strings.HasPrefix(r.URL.Path, "/api/v1/") {
		return false
	}
	// The server-to-server API is sealed too, but by its own middleware and
	// with keys issued in advance — there is no browser behind it to perform
	// an ECDH handshake or to hold WebCrypto. This is an exemption from *this*
	// channel, not from being sealed: integrationChannel enforces the same
	// signature, the same envelope and the same replay window, and refuses an
	// unsealed call exactly as this does.
	if strings.HasPrefix(r.URL.Path, integrationPrefix) {
		return false
	}
	return r.URL.Path != "/api/v1/secure/handshake"
}

// originAllowed accepts same-origin requests (a browser omits Origin on
// same-origin GETs) and any origin the bank has configured.
func (s *Server) originAllowed(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		// Same-origin navigation, or a request proxied by the portal's own
		// server, which is how every browser call actually reaches us.
		return true
	}
	for _, allowed := range s.cfg.CORSOrigins {
		if strings.EqualFold(origin, allowed) {
			return true
		}
	}
	// A LAN pilot moves address with DHCP; matching the host we were asked on
	// keeps that working without pinning an address into config.
	if parsed, err := url.Parse(origin); err == nil && parsed.Host == r.Host {
		return true
	}
	return false
}

func (s *Server) writeChannelError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, secure.ErrNoSession):
		// The client re-handshakes and retries on this code. A restart clears
		// every channel, so it has to be an ordinary, recoverable answer.
		httpx.ErrorCode(w, http.StatusUpgradeRequired, "secure_channel_expired",
			"This secure channel has expired.")
	case errors.Is(err, secure.ErrReplay):
		slog.Warn("replayed request rejected", "path", r.URL.Path, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusConflict, "secure_replay",
			"This request has already been used.")
	case errors.Is(err, secure.ErrStale):
		httpx.ErrorCode(w, http.StatusUpgradeRequired, "secure_stale",
			"This request is too old to be accepted. Check your device clock.")
	default:
		slog.Warn("unsigned or altered request rejected",
			"path", r.URL.Path, "remote", s.clientIP(r), "reason", err)
		httpx.ErrorCode(w, http.StatusForbidden, "secure_signature_invalid",
			"This request was not signed by the portal.")
	}
}
