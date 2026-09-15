package api

import (
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/store"
)

// Everything below this path is the server-to-server API. It is sealed by
// integrationChannel rather than by the browser channel — see channelRequired.
const integrationPrefix = "/api/v1/integration/"

// Limits on what an integrator may attach to a link. Generous enough for a
// campaign id, an internal reference and a donor record; bounded so metadata
// cannot be used as free storage.
const (
	maxMetadataPairs = 20
	maxMetadataKey   = 64
	maxMetadataValue = 512
)

// decodeKey turns a stored payload key back into bytes and refuses anything
// that is not a 32-byte AES key, rather than failing later inside the cipher
// with something unreadable.
func decodeKey(encoded string) ([]byte, error) {
	key, err := base64.StdEncoding.DecodeString(strings.TrimSpace(encoded))
	if err != nil {
		return nil, fmt.Errorf("payload key is not valid base64: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("payload key must be 32 bytes, got %d", len(key))
	}
	return key, nil
}

// sealCredentials stores an issued set against an integration record.
func (s *Server) sealCredentials(i *domain.Integration, c domain.IssuedCredentials) error {
	secretSealed, err := s.sealer.Seal(c.Secret)
	if err != nil {
		return err
	}
	payloadSealed, err := s.sealer.Seal(c.PayloadKey)
	if err != nil {
		return err
	}
	i.APIKey = c.APIKey
	i.SecretSealed = secretSealed
	i.PayloadKeySealed = payloadSealed
	i.SecretHint = domain.SecretHint(c.Secret)
	return nil
}

// ---------------------------------------------------------------- the API

type createLinkAPIRequest struct {
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	Reference   string            `json:"reference,omitempty"`
	Type        string            `json:"type,omitempty"`
	Amount      string            `json:"amount,omitempty"`
	Min         string            `json:"min,omitempty"`
	Max         string            `json:"max,omitempty"`
	Currency    string            `json:"currency,omitempty"`
	PaymentMode string            `json:"paymentMode,omitempty"`
	MaxUses     *int              `json:"maxUses,omitempty"`
	ExpiresAt   string            `json:"expiresAt,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	// Per-link overrides. A fundraising platform wants the donor returned to
	// the campaign they gave to, not to one address for everything.
	SuccessURL string `json:"successUrl,omitempty"`
	FailureURL string `json:"failureUrl,omitempty"`
}

type linkAPIResponse struct {
	ID          string            `json:"id"`
	Slug        string            `json:"slug"`
	URL         string            `json:"url"`
	Title       string            `json:"title"`
	Reference   string            `json:"reference,omitempty"`
	Type        string            `json:"type"`
	PaymentMode string            `json:"paymentMode"`
	Environment string            `json:"environment"`
	Amount      string            `json:"amount"`
	AmountMinor int64             `json:"amountMinor"`
	Currency    string            `json:"currency"`
	Status      string            `json:"status"`
	MaxUses     *int              `json:"maxUses"`
	ExpiresAt   string            `json:"expiresAt,omitempty"`
	Metadata    map[string]string `json:"metadata"`
	CreatedAt   string            `json:"createdAt"`
}

// handleAPICreateLink is the endpoint an integrated system actually uses: it
// asks for a payment link and gets back a URL to put in front of its payer.
func (s *Server) handleAPICreateLink(w http.ResponseWriter, r *http.Request) {
	integration, ok := IntegrationFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "These API credentials were not recognised.")
		return
	}

	var req createLinkAPIRequest
	if !httpx.Decode(w, r, &req) {
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		httpx.ErrorCode(w, http.StatusBadRequest, "title_required",
			"Give the link a title — it is what your payer sees they are paying for.")
		return
	}

	// The gateway that will settle this. Taken from the integration, never from
	// whatever environment the owner happens to be looking at in the portal: a
	// test key must produce a test link on a Tuesday afternoon as surely as it
	// does on a Sunday night.
	env := integration.Environment

	connected, err := s.store.HasVerifiedCredentialFor(integration.OwnerID, env)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not check the gateway connection.")
		return
	}
	if !connected {
		httpx.ErrorCode(w, http.StatusConflict, "gateway_required",
			"No verified "+string(env)+" gateway is connected for this integration. "+
				"Connect it in the portal before creating links.")
		return
	}

	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = "USD"
		if m, err := s.store.MerchantByID(integration.MerchantID); err == nil && m.DefaultCurrency != "" {
			currency = m.DefaultCurrency
		}
	}
	if len(currency) != 3 {
		httpx.ErrorCode(w, http.StatusBadRequest, "currency_invalid",
			"Currency must be a three-letter code such as USD or ETB.")
		return
	}

	linkType := domain.LinkStatic
	switch strings.ToLower(strings.TrimSpace(req.Type)) {
	case "", "static":
		linkType = domain.LinkStatic
	case "dynamic":
		linkType = domain.LinkDynamic
	default:
		httpx.ErrorCode(w, http.StatusBadRequest, "type_invalid",
			"type must be static or dynamic.")
		return
	}

	mode := domain.ModePurchase
	if strings.EqualFold(req.PaymentMode, string(domain.ModeAuthorize)) {
		mode = domain.ModeAuthorize
	} else if req.PaymentMode != "" && !strings.EqualFold(req.PaymentMode, string(domain.ModePurchase)) {
		httpx.ErrorCode(w, http.StatusBadRequest, "payment_mode_invalid",
			"paymentMode must be purchase or authorize.")
		return
	}

	metadata, err := parseMetadata(req.Metadata)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "metadata_invalid", err.Error())
		return
	}

	successURL, err := validateCallback(req.SuccessURL)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "success_url_invalid", err.Error())
		return
	}
	failureURL, err := validateCallback(req.FailureURL)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "failure_url_invalid", err.Error())
		return
	}

	link := &domain.PayLink{
		MerchantID:    integration.MerchantID,
		CreatedByID:   integration.OwnerID,
		IntegrationID: integration.ID,
		Title:         title,
		Description:   strings.TrimSpace(req.Description),
		Reference:     strings.TrimSpace(req.Reference),
		Type:          linkType,
		PaymentMode:   mode,
		Environment:   env,
		Currency:      currency,
		Status:        domain.LinkActive,
		MaxUses:       req.MaxUses,
	}

	switch linkType {
	case domain.LinkStatic:
		amount, err := money.Parse(req.Amount, currency)
		if err != nil {
			httpx.ErrorCode(w, http.StatusBadRequest, "amount_invalid", err.Error())
			return
		}
		if amount <= 0 {
			httpx.ErrorCode(w, http.StatusBadRequest, "amount_invalid",
				"amount must be greater than zero for a static link.")
			return
		}
		link.AmountMinor = amount
	case domain.LinkDynamic:
		if strings.TrimSpace(req.Min) != "" {
			min, err := money.Parse(req.Min, currency)
			if err != nil {
				httpx.ErrorCode(w, http.StatusBadRequest, "min_invalid", err.Error())
				return
			}
			link.MinMinor = min
		}
		if strings.TrimSpace(req.Max) != "" {
			max, err := money.Parse(req.Max, currency)
			if err != nil {
				httpx.ErrorCode(w, http.StatusBadRequest, "max_invalid", err.Error())
				return
			}
			link.MaxMinor = max
		}
		if link.MaxMinor > 0 && link.MinMinor > link.MaxMinor {
			httpx.ErrorCode(w, http.StatusBadRequest, "range_invalid",
				"min cannot be greater than max.")
			return
		}
	}

	if expires := strings.TrimSpace(req.ExpiresAt); expires != "" {
		at, err := time.Parse(time.RFC3339, expires)
		if err != nil {
			httpx.ErrorCode(w, http.StatusBadRequest, "expires_at_invalid",
				"expiresAt must be an RFC3339 timestamp, for example 2026-10-01T00:00:00Z.")
			return
		}
		if at.Before(time.Now().UTC()) {
			httpx.ErrorCode(w, http.StatusBadRequest, "expires_at_invalid",
				"expiresAt is already in the past.")
			return
		}
		link.ExpiresAt = &at
	}

	if err := s.store.CreateLink(link); err != nil {
		slog.Error("API link creation failed",
			"integration", integration.ID, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not create the payment link.")
		return
	}
	if len(metadata) > 0 {
		if err := s.store.SetLinkMetadata(link.ID, metadata); err != nil {
			slog.Error("could not store link metadata", "link", link.ID, "error", err)
		}
	}
	if successURL != "" || failureURL != "" {
		if err := s.store.SetLinkCallbacks(link.ID, successURL, failureURL); err != nil {
			slog.Error("could not store link callbacks", "link", link.ID, "error", err)
		}
	}

	slog.Info("link created through the API",
		"link", link.ID, "integration", integration.ID, "environment", env)
	httpx.JSON(w, http.StatusCreated, linkAPIView(s, link, metadata))
}

func linkAPIView(s *Server, l *domain.PayLink, metadata []domain.MetadataPair) linkAPIResponse {
	meta := map[string]string{}
	for _, p := range metadata {
		meta[p.Key] = p.Value
	}
	view := linkAPIResponse{
		ID:          l.ID,
		Slug:        l.Slug,
		URL:         s.linkURL(l.Slug),
		Title:       l.Title,
		Reference:   l.Reference,
		Type:        string(l.Type),
		PaymentMode: string(l.PaymentMode),
		Environment: string(l.Environment),
		AmountMinor: l.AmountMinor,
		Amount:      money.Display(l.AmountMinor, l.Currency),
		Currency:    l.Currency,
		Status:      string(l.EffectiveStatus(time.Now().UTC())),
		MaxUses:     l.MaxUses,
		Metadata:    meta,
		CreatedAt:   l.CreatedAt.UTC().Format(time.RFC3339),
	}
	if l.ExpiresAt != nil {
		view.ExpiresAt = l.ExpiresAt.UTC().Format(time.RFC3339)
	}
	return view
}

// handleAPIGetPayment answers "what happened to this payment", which is what an
// integrator falls back to when a webhook was missed.
func (s *Server) handleAPIGetPayment(w http.ResponseWriter, r *http.Request) {
	integration, ok := IntegrationFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "These API credentials were not recognised.")
		return
	}
	payment, err := s.store.PaymentByOrderID(r.PathValue("orderId"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such payment.")
		return
	}
	link, err := s.store.LinkByID(payment.PayLinkID)
	// Scoped to this integration's own traffic. Answering "not found" rather
	// than "forbidden" so an order id cannot be probed for existence with a key
	// that has no business seeing it.
	if err != nil || link.IntegrationID != integration.ID {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such payment.")
		return
	}
	metadata, _ := s.store.LinkMetadata(link.ID)
	httpx.JSON(w, http.StatusOK, paymentPayload(payment, link, metadata))
}

// handleAPIGetLink returns a link and how much has been paid against it.
func (s *Server) handleAPIGetLink(w http.ResponseWriter, r *http.Request) {
	integration, ok := IntegrationFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "These API credentials were not recognised.")
		return
	}
	link, err := s.store.LinkByID(r.PathValue("id"))
	if err != nil || link.IntegrationID != integration.ID {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such payment link.")
		return
	}
	metadata, _ := s.store.LinkMetadata(link.ID)
	view := linkAPIView(s, link, metadata)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"link":       view,
		"paidMinor":  link.PaidMinor,
		"paidCount":  link.PaidCount,
		"usedCount":  link.UsedCount,
		"paidAmount": money.Display(link.PaidMinor, link.Currency),
	})
}

// handleAPIPing is how an integrator proves their credentials, their signing
// and their encryption all work before writing anything that moves money.
// Every integration goes wrong here first; it should be cheap to find out.
func (s *Server) handleAPIPing(w http.ResponseWriter, r *http.Request) {
	integration, ok := IntegrationFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "These API credentials were not recognised.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"integration": integration.Name,
		"environment": string(integration.Environment),
		"serverTime":  time.Now().UTC().Format(time.RFC3339),
		"message":     "Credentials, signature and encryption are all working.",
	})
}

// ------------------------------------------------------------------ helpers

func parseMetadata(in map[string]string) ([]domain.MetadataPair, error) {
	if len(in) == 0 {
		return nil, nil
	}
	if len(in) > maxMetadataPairs {
		return nil, fmt.Errorf("at most %d metadata entries are accepted", maxMetadataPairs)
	}
	out := make([]domain.MetadataPair, 0, len(in))
	for key, value := range in {
		key = strings.TrimSpace(key)
		if key == "" {
			return nil, errors.New("metadata keys cannot be empty")
		}
		if len(key) > maxMetadataKey {
			return nil, fmt.Errorf("metadata key %q is longer than %d characters", key, maxMetadataKey)
		}
		if len(value) > maxMetadataValue {
			return nil, fmt.Errorf("the value for %q is longer than %d characters", key, maxMetadataValue)
		}
		out = append(out, domain.MetadataPair{Key: key, Value: value})
	}
	// Sorted so a link created twice with the same pairs stores them the same
	// way, and so what comes back is in a predictable order.
	sort.Slice(out, func(a, b int) bool { return out[a].Key < out[b].Key })
	return out, nil
}

// validateCallback refuses anything that is not an absolute http(s) URL.
//
// A relative or scheme-less value would be resolved against our own origin,
// which turns a payer's return into an open redirect on the bank's domain.
func validateCallback(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	if len(raw) > 512 {
		return "", errors.New("URL is too long")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", errors.New("not a valid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("must be an absolute http:// or https:// URL")
	}
	if parsed.Host == "" {
		return "", errors.New("must include a host")
	}
	return raw, nil
}

// requireIntegrator is the guard on the portal screens that manage credentials.
func (s *Server) integratorOnly(next http.Handler) http.Handler {
	return s.requireRole(domain.RoleIntegrator)(next)
}

// integrationForUser finds the integration a request is about and confirms it
// belongs to the caller, so one integrator can never manage another's.
func (s *Server) integrationForUser(r *http.Request, id string) (*domain.Integration, error) {
	user, ok := auth.UserFrom(r.Context())
	if !ok {
		return nil, store.ErrNotFound
	}
	integration, err := s.store.IntegrationByID(id)
	if err != nil {
		return nil, err
	}
	if integration.OwnerID != user.ID && user.Role != domain.RoleAdmin {
		return nil, store.ErrNotFound
	}
	return integration, nil
}
