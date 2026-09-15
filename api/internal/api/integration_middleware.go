package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/secure"
	"github.com/zemenbank/paylink/api/internal/store"
)

// The header a server-to-server caller identifies itself with. The timestamp,
// nonce and signature headers are shared with the browser channel, because the
// signing format is the same and there is no reason to document two.
const hdrAPIKey = "X-PL-Key"

type integrationCtxKey struct{}

// IntegrationFrom returns the credentials a request arrived on.
func IntegrationFrom(ctx context.Context) (*domain.Integration, bool) {
	i, ok := ctx.Value(integrationCtxKey{}).(*domain.Integration)
	return i, ok
}

// integrationChannel authenticates and unseals a server-to-server call.
//
// The browser channel derives a key through ECDH and holds it for half an hour.
// An integration has no browser to do that with, so it signs with a secret
// issued in advance. Everything after that point is identical: the same
// canonical string, the same HMAC, the same AES-GCM envelope, the same replay
// window — and, as with the browser, a request that is not sealed is not
// served. That is the point of it rather than a convenience: it means a caller
// has to hold the secret, not merely have captured a URL.
func (s *Server) integrationChannel(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := strings.TrimSpace(r.Header.Get(hdrAPIKey))
		nonce := r.Header.Get(hdrNonce)
		sig := r.Header.Get(hdrSig)
		if apiKey == "" || nonce == "" || sig == "" {
			httpx.ErrorCode(w, http.StatusUnauthorized, "credentials_required",
				"Send X-PL-Key, X-PL-TS, X-PL-Nonce and X-PL-Sig with every call.")
			return
		}

		// A budget per key, before any cryptography: verifying a signature is
		// cheap but not free, and an attacker with a valid key should not be
		// able to spend our CPU without limit.
		if !rateLimit(s.integrationLimit, "int:"+apiKey, w,
			"Too many API calls. Slow down and try again shortly.") {
			return
		}

		integration, err := s.store.IntegrationByAPIKey(apiKey)
		if err != nil {
			if !errors.Is(err, store.ErrNotFound) {
				slog.Error("integration lookup failed", "error", err)
				httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
				return
			}
			slog.Warn("API call with an unknown key",
				"key", secretPreview(apiKey), "remote", s.clientIP(r))
			httpx.ErrorCode(w, http.StatusUnauthorized, "credentials_invalid",
				"These API credentials were not recognised.")
			return
		}
		// Said plainly rather than as "invalid": an integrator whose access was
		// withdrawn should not spend a day hunting for a credential problem
		// they do not have.
		if !integration.Usable() {
			httpx.ErrorCode(w, http.StatusForbidden, "integration_suspended",
				"These credentials have been suspended. Contact the bank.")
			return
		}

		secret, err := s.sealer.Open(integration.SecretSealed)
		if err != nil {
			slog.Error("could not open an integration secret",
				"integration", integration.ID, "error", err)
			httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
			return
		}
		payloadKey, err := s.integrationPayloadKey(integration)
		if err != nil {
			slog.Error("could not open an integration payload key",
				"integration", integration.ID, "error", err)
			httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
			return
		}

		raw, err := io.ReadAll(io.LimitReader(r.Body, secure.MaxIntegrationBody))
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Could not read the request.")
			return
		}
		_ = r.Body.Close()

		// Signed over the bytes as they arrived, before decryption — which is
		// what the caller signed, and the only thing both sides agree on.
		if err := s.keys.Verify(apiKey, []byte(secret),
			r.Method, r.URL.RequestURI(), r.Header.Get(hdrTS), nonce, sig, raw); err != nil {
			s.writeIntegrationError(w, r, integration, err)
			return
		}

		if len(raw) > 0 {
			env, err := secure.DecodeEnvelope(raw)
			if err != nil {
				httpx.ErrorCode(w, http.StatusBadRequest, "payload_invalid",
					"That payload was not sealed correctly.")
				return
			}
			plain, err := secure.Open(payloadKey, env, apiKey, nonce)
			if err != nil {
				slog.Warn("sealed API payload rejected",
					"integration", integration.ID, "remote", s.clientIP(r))
				httpx.ErrorCode(w, http.StatusBadRequest, "payload_invalid",
					"That payload could not be opened with your encryption key.")
				return
			}
			r.Body = io.NopCloser(bytes.NewReader(plain))
			r.ContentLength = int64(len(plain))
		} else {
			r.Body = io.NopCloser(bytes.NewReader(nil))
			r.ContentLength = 0
		}

		// Best effort, and deliberately not fatal: knowing an integration has
		// gone quiet is worth a cheap write, and losing one costs nothing.
		go func(id string) {
			if err := s.store.TouchIntegration(id); err != nil {
				slog.Debug("could not record integration use", "integration", id, "error", err)
			}
		}(integration.ID)

		ctx := context.WithValue(r.Context(), integrationCtxKey{}, integration)
		rec := &sealedRecorder{header: http.Header{}}
		next.ServeHTTP(rec, r.WithContext(ctx))

		env, err := secure.Seal(payloadKey, rec.body.Bytes(), apiKey, nonce)
		if err != nil {
			slog.Error("could not seal an API response",
				"integration", integration.ID, "error", err)
			httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
			return
		}
		for k, values := range rec.header {
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
			slog.Error("write sealed API response", "error", err)
		}
	})
}

// integrationPayloadKey unseals the key bodies are encrypted with.
func (s *Server) integrationPayloadKey(i *domain.Integration) ([]byte, error) {
	encoded, err := s.sealer.Open(i.PayloadKeySealed)
	if err != nil {
		return nil, err
	}
	return decodeKey(encoded)
}

func (s *Server) writeIntegrationError(
	w http.ResponseWriter, r *http.Request, i *domain.Integration, err error,
) {
	switch {
	case errors.Is(err, secure.ErrReplay):
		slog.Warn("replayed API call rejected",
			"integration", i.ID, "path", r.URL.Path, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusConflict, "replayed",
			"This request has already been used. Send a new nonce for every call.")
	case errors.Is(err, secure.ErrStale):
		httpx.ErrorCode(w, http.StatusUnauthorized, "timestamp_invalid",
			"This request is outside the accepted time window. Check your server clock.")
	default:
		slog.Warn("unsigned or altered API call rejected",
			"integration", i.ID, "path", r.URL.Path, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusUnauthorized, "signature_invalid",
			"This request was not signed with your secret key.")
	}
}

// secretPreview shows enough of a credential to correlate it in a log and not
// enough to use it.
func secretPreview(s string) string {
	if len(s) <= 12 {
		return "…"
	}
	return s[:12] + "…"
}

// integrationDeadline bounds how long a handler may hold an API call, so a slow
// gateway cannot pile integration traffic up behind it.
const integrationDeadline = 45 * time.Second
