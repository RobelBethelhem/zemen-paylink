package api

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/store"
)

// What an integrator sees about their own integration. The secret and the
// payload key are absent by construction: they were shown once when issued, and
// there is no screen anywhere that shows them again.
type integrationView struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Environment string `json:"environment"`
	APIKey      string `json:"apiKey"`
	SecretHint  string `json:"secretHint"`
	Status      string `json:"status"`

	CallbackSuccessURL string `json:"callbackSuccessUrl"`
	CallbackFailureURL string `json:"callbackFailureUrl"`
	WebhookURL         string `json:"webhookUrl"`

	GatewayConnected bool   `json:"gatewayConnected"`
	LastUsedAt       string `json:"lastUsedAt,omitempty"`
	CreatedAt        string `json:"createdAt"`

	// Where this integration stands on going live, so one screen can say what
	// the next step is instead of the integrator having to work it out.
	LiveStatus string `json:"liveStatus"`
	LiveNote   string `json:"liveNote,omitempty"`
}

func (s *Server) viewIntegration(i *domain.Integration) integrationView {
	connected, _ := s.store.HasVerifiedCredentialFor(i.OwnerID, i.Environment)
	view := integrationView{
		ID:                 i.ID,
		Name:               i.Name,
		Environment:        string(i.Environment),
		APIKey:             i.APIKey,
		SecretHint:         i.SecretHint,
		Status:             string(i.Status),
		CallbackSuccessURL: i.CallbackSuccessURL,
		CallbackFailureURL: i.CallbackFailureURL,
		WebhookURL:         i.WebhookURL,
		GatewayConnected:   connected,
		CreatedAt:          i.CreatedAt.UTC().Format(time.RFC3339),
		LiveStatus:         "none",
	}
	if i.LastUsedAt != nil {
		view.LastUsedAt = i.LastUsedAt.UTC().Format(time.RFC3339)
	}
	if i.Environment.IsLive() {
		view.LiveStatus = "live"
		return view
	}
	if request, err := s.store.OpenLiveRequestFor(i.ID); err == nil {
		view.LiveStatus = string(request.Status)
		view.LiveNote = request.Note
	}
	return view
}

func (s *Server) handleListIntegrations(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	integrations, err := s.store.IntegrationsForOwner(user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not read your integrations.")
		return
	}
	views := make([]integrationView, 0, len(integrations))
	for _, i := range integrations {
		views = append(views, s.viewIntegration(i))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"integrations": views})
}

type createIntegrationRequest struct {
	Name string `json:"name"`
}

// handleCreateIntegration issues a test integration and its credentials.
//
// Test only, always. Live credentials are not something anyone can ask for
// directly — they are the outcome of a review, and the review is the point.
func (s *Server) handleCreateIntegration(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	var req createIntegrationRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || len(name) > 160 {
		httpx.ErrorCode(w, http.StatusBadRequest, "name_required",
			"Give the integration a name — the system it belongs to, such as Z-Care.")
		return
	}
	if user.MerchantID == "" {
		httpx.ErrorCode(w, http.StatusConflict, "merchant_required",
			"Your account is not attached to a registered merchant. "+
				"Ask merchant management to register your merchant number first.")
		return
	}
	if _, err := s.store.IntegrationFor(user.ID, name, domain.EnvTest); err == nil {
		httpx.ErrorCode(w, http.StatusConflict, "name_taken",
			"You already have an integration with that name.")
		return
	}

	credentials, err := domain.NewCredentials(domain.EnvTest)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not issue credentials.")
		return
	}
	integration := &domain.Integration{
		MerchantID:  user.MerchantID,
		OwnerID:     user.ID,
		Name:        name,
		Environment: domain.EnvTest,
		Status:      domain.IntegrationActive,
	}
	if err := s.sealCredentials(integration, credentials); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not secure the credentials.")
		return
	}
	if err := s.store.CreateIntegration(integration); err != nil {
		slog.Error("could not create an integration", "user", user.ID, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not create the integration.")
		return
	}
	slog.Info("integration created", "integration", integration.ID, "owner", user.ID, "name", name)

	// The one and only time these leave the server.
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"integration": s.viewIntegration(integration),
		"credentials": map[string]string{
			"apiKey":     credentials.APIKey,
			"secretKey":  credentials.Secret,
			"payloadKey": credentials.PayloadKey,
		},
		"notice": "Copy these now. The secret and encryption keys are stored sealed " +
			"and cannot be shown again — if they are lost, rotate to issue a new set.",
	})
}

type endpointsRequest struct {
	CallbackSuccessURL string `json:"callbackSuccessUrl"`
	CallbackFailureURL string `json:"callbackFailureUrl"`
	WebhookURL         string `json:"webhookUrl"`
}

func (s *Server) handleUpdateEndpoints(w http.ResponseWriter, r *http.Request) {
	integration, err := s.integrationForUser(r, r.PathValue("id"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such integration.")
		return
	}
	var req endpointsRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	success, err := validateCallback(req.CallbackSuccessURL)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "success_url_invalid", "Success URL: "+err.Error())
		return
	}
	failure, err := validateCallback(req.CallbackFailureURL)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "failure_url_invalid", "Failure URL: "+err.Error())
		return
	}
	webhook, err := validateCallback(req.WebhookURL)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "webhook_url_invalid", "Webhook URL: "+err.Error())
		return
	}
	if err := s.store.UpdateIntegrationEndpoints(integration.ID, success, failure, webhook); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not save these endpoints.")
		return
	}
	updated, err := s.store.IntegrationByID(integration.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not read the integration back.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"integration": s.viewIntegration(updated)})
}

// handleRotateSecrets issues a fresh secret and payload key, keeping the API
// key. Used both to recover from a lost secret and to collect the credentials
// of a live integration for the first time.
func (s *Server) handleRotateSecrets(w http.ResponseWriter, r *http.Request) {
	integration, err := s.integrationForUser(r, r.PathValue("id"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such integration.")
		return
	}
	credentials, err := domain.NewCredentials(integration.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not issue credentials.")
		return
	}
	// The API key is deliberately kept: rotating a compromised secret should
	// not also require the integrator to redeploy a configuration change.
	credentials.APIKey = integration.APIKey
	if err := s.sealCredentials(integration, credentials); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not secure the credentials.")
		return
	}
	if err := s.store.RotateIntegrationSecrets(
		integration.ID, integration.SecretSealed, integration.SecretHint, integration.PayloadKeySealed,
	); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not rotate the credentials.")
		return
	}
	slog.Warn("integration credentials rotated",
		"integration", integration.ID, "environment", integration.Environment)

	httpx.JSON(w, http.StatusOK, map[string]any{
		"credentials": map[string]string{
			"apiKey":     credentials.APIKey,
			"secretKey":  credentials.Secret,
			"payloadKey": credentials.PayloadKey,
		},
		"notice": "The previous secret and encryption key stopped working the moment " +
			"this was issued. Update your system before its next call.",
	})
}

type goLiveRequest struct {
	Note string `json:"note"`
}

// handleRequestLive asks a bank administrator to approve live credentials.
func (s *Server) handleRequestLive(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	integration, err := s.integrationForUser(r, r.PathValue("id"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such integration.")
		return
	}
	if integration.Environment.IsLive() {
		httpx.ErrorCode(w, http.StatusConflict, "already_live",
			"This integration is already live.")
		return
	}
	if _, err := s.store.IntegrationFor(user.ID, integration.Name, domain.EnvLive); err == nil {
		httpx.ErrorCode(w, http.StatusConflict, "already_live",
			"Live credentials for this integration already exist.")
		return
	}
	if _, err := s.store.OpenLiveRequestFor(integration.ID); err == nil {
		httpx.ErrorCode(w, http.StatusConflict, "already_requested",
			"This is already waiting for review.")
		return
	}

	// Asking to go live without ever having taken a test payment is asking an
	// administrator to approve something nobody has seen work.
	payments, err := s.store.PaymentsForIntegration(integration.ID, 1)
	if err == nil && len(payments) == 0 {
		httpx.ErrorCode(w, http.StatusConflict, "no_test_activity",
			"Take at least one test payment through this integration first — "+
				"that is what the review looks at.")
		return
	}

	var req goLiveRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	live := &domain.LiveRequest{
		IntegrationID: integration.ID,
		MerchantID:    integration.MerchantID,
		RequestedBy:   user.ID,
		Status:        domain.ReviewPending,
		Note:          strings.TrimSpace(req.Note),
	}
	if err := s.store.CreateLiveRequest(live); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not submit this request.")
		return
	}
	slog.Info("live access requested",
		"integration", integration.ID, "request", live.ID, "by", user.ID)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"status": "pending",
		"message": "Sent for review. The bank will look at this merchant and its test " +
			"payments before issuing live credentials.",
	})
}

func (s *Server) handleListDeliveries(w http.ResponseWriter, r *http.Request) {
	integration, err := s.integrationForUser(r, r.PathValue("id"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such integration.")
		return
	}
	deliveries, err := s.store.WebhooksForIntegration(integration.ID, 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not read the delivery log.")
		return
	}
	out := make([]map[string]any, 0, len(deliveries))
	for _, d := range deliveries {
		entry := map[string]any{
			"id":           d.ID,
			"event":        d.Event,
			"paymentId":    d.PaymentID,
			"status":       string(d.Status),
			"attempts":     d.Attempts,
			"responseCode": d.ResponseCode,
			"createdAt":    d.CreatedAt.UTC().Format(time.RFC3339),
		}
		if d.LastError != "" {
			entry["lastError"] = d.LastError
		}
		if d.DeliveredAt != nil {
			entry["deliveredAt"] = d.DeliveredAt.UTC().Format(time.RFC3339)
		}
		out = append(out, entry)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"deliveries": out})
}

// -------------------------------------------------------------------- admin

// handleListLiveRequests is the administrator's queue, with enough beside each
// entry to decide without going looking: who is asking, for which merchant, and
// what their test traffic actually shows.
func (s *Server) handleListLiveRequests(w http.ResponseWriter, r *http.Request) {
	status := domain.ReviewStatus(strings.TrimSpace(r.URL.Query().Get("status")))
	if status == "" {
		status = domain.ReviewPending
	}
	if !status.Valid() {
		httpx.Error(w, http.StatusBadRequest, "status must be pending, approved or rejected.")
		return
	}
	requests, err := s.store.LiveRequests(status)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not read the review queue.")
		return
	}

	out := make([]map[string]any, 0, len(requests))
	for _, request := range requests {
		entry := map[string]any{
			"id":          request.ID,
			"status":      string(request.Status),
			"note":        request.Note,
			"requestedAt": request.RequestedAt.UTC().Format(time.RFC3339),
		}
		if integration, err := s.store.IntegrationByID(request.IntegrationID); err == nil {
			entry["integration"] = integration.Name
			entry["integrationId"] = integration.ID
			entry["environment"] = string(integration.Environment)
			entry["webhookUrl"] = integration.WebhookURL

			// The evidence the decision rests on.
			payments, _ := s.store.PaymentsForIntegration(integration.ID, 200)
			settled := 0
			for _, p := range payments {
				if p.CapturedMinor > 0 {
					settled++
				}
			}
			entry["testPayments"] = len(payments)
			entry["testPaymentsSettled"] = settled
		}
		if merchant, err := s.store.MerchantByID(request.MerchantID); err == nil {
			entry["merchant"] = merchant.Name
			entry["merchantId"] = merchant.ID
		}
		if requester, err := s.store.UserByID(request.RequestedBy); err == nil {
			entry["requestedBy"] = requester.FullName
			entry["requestedByUsername"] = requester.Username
		}
		out = append(out, entry)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"requests": out})
}

type reviewRequest struct {
	Decision string `json:"decision"`
	Note     string `json:"note"`
}

// handleReviewLiveRequest records the decision, and on approval creates the
// live integration — which is what "approved" means here. There is no flag to
// set: holding live credentials and having been approved are one fact.
func (s *Server) handleReviewLiveRequest(w http.ResponseWriter, r *http.Request) {
	admin, _ := auth.UserFrom(r.Context())

	var req reviewRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	decision := domain.ReviewStatus(strings.ToLower(strings.TrimSpace(req.Decision)))
	if decision != domain.ReviewApproved && decision != domain.ReviewRejected {
		httpx.Error(w, http.StatusBadRequest, "decision must be approved or rejected.")
		return
	}
	note := strings.TrimSpace(req.Note)
	if decision == domain.ReviewRejected && note == "" {
		httpx.ErrorCode(w, http.StatusBadRequest, "note_required",
			"Say why it was rejected — the integrator has to know what to fix.")
		return
	}

	request, err := s.store.LiveRequestByID(r.PathValue("id"))
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "No such request.")
		return
	}
	testIntegration, err := s.store.IntegrationByID(request.IntegrationID)
	if err != nil {
		httpx.ErrorCode(w, http.StatusNotFound, "not_found", "That integration no longer exists.")
		return
	}

	// Conditional on the request still being open, so two administrators
	// working the same queue cannot both decide it.
	if err := s.store.ReviewLiveRequest(request.ID, decision, admin.ID, note); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpx.ErrorCode(w, http.StatusConflict, "already_reviewed",
				"Somebody has already decided this one.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "Could not record the decision.")
		return
	}

	if decision == domain.ReviewRejected {
		slog.Info("live access rejected",
			"request", request.ID, "integration", testIntegration.ID, "by", admin.ID)
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "rejected"})
		return
	}

	credentials, err := domain.NewCredentials(domain.EnvLive)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not issue live credentials.")
		return
	}
	liveIntegration := &domain.Integration{
		MerchantID:  testIntegration.MerchantID,
		OwnerID:     testIntegration.OwnerID,
		Name:        testIntegration.Name,
		Environment: domain.EnvLive,
		Status:      domain.IntegrationActive,
		// Carried across so going live does not silently stop delivering to the
		// endpoints the integrator already proved work.
		CallbackSuccessURL: testIntegration.CallbackSuccessURL,
		CallbackFailureURL: testIntegration.CallbackFailureURL,
		WebhookURL:         testIntegration.WebhookURL,
	}
	if err := s.sealCredentials(liveIntegration, credentials); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not secure the live credentials.")
		return
	}
	if err := s.store.CreateIntegration(liveIntegration); err != nil {
		slog.Error("could not create the live integration",
			"request", request.ID, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not create the live integration.")
		return
	}
	slog.Warn("live access approved",
		"request", request.ID, "integration", liveIntegration.ID,
		"merchant", liveIntegration.MerchantID, "by", admin.ID)

	// The secret is not handed to the administrator: it is not theirs, and an
	// approval screen is not where a live signing key should appear. The
	// integrator collects it themselves, which also proves they still control
	// the account it belongs to.
	httpx.JSON(w, http.StatusOK, map[string]any{
		"status":        "approved",
		"integrationId": liveIntegration.ID,
		"message": "Live credentials created. The integrator collects them from " +
			"their own Integrations screen.",
	})
}
