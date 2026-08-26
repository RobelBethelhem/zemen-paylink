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
	"github.com/zemenbank/paylink/api/internal/mpgs"
	"github.com/zemenbank/paylink/api/internal/secrets"
)

// gatewayCredentialsFor loads and unseals one of an operator's MPGS profiles.
// Everything that talks to the gateway on a user's behalf goes through here.
//
// The environment is always passed explicitly, and for anything to do with an
// existing link it comes from the link itself — never from whatever mode the
// operator happens to be in now. That is what keeps a test link working after
// its operator has gone live, and stops a live order being addressed to the
// simulator.
func (s *Server) gatewayCredentialsFor(
	userID string, env domain.Environment,
) (mpgs.Credentials, error) {
	if !env.Valid() {
		env = domain.EnvTest
	}
	record, err := s.store.GatewayCredentialFor(userID, env)
	if err != nil {
		return mpgs.Credentials{}, err
	}
	password, err := s.sealer.Open(record.APIPasswordSealed)
	if err != nil {
		return mpgs.Credentials{}, err
	}
	return mpgs.Credentials{
		Host:         record.GatewayHost,
		MerchantID:   record.MerchantID,
		MerchantName: record.MerchantName,
		APIVersion:   record.APIVersion,
		APIPassword:  password,
	}, nil
}

// connectionView is one environment an operator has connected.
type connectionView struct {
	Environment       string `json:"environment"`
	Active            bool   `json:"active"`
	Connected         bool   `json:"connected"`
	GatewayHost       string `json:"gatewayHost"`
	MPGSMerchantID    string `json:"mpgsMerchantId"`
	MerchantName      string `json:"merchantName"`
	APIVersion        string `json:"apiVersion"`
	APIPasswordMasked string `json:"apiPasswordMasked,omitempty"`
	VerifiedAt        string `json:"verifiedAt,omitempty"`
}

type credentialsView struct {
	// The active connection is flattened onto the top level so existing callers
	// keep working; Connections carries both.
	Connected         bool   `json:"connected"`
	Environment       string `json:"environment"`
	GatewayHost       string `json:"gatewayHost"`
	MPGSMerchantID    string `json:"mpgsMerchantId"`
	MerchantName      string `json:"merchantName"`
	APIVersion        string `json:"apiVersion"`
	APIPasswordMasked string `json:"apiPasswordMasked,omitempty"`
	VerifiedAt        string `json:"verifiedAt,omitempty"`

	Connections []connectionView `json:"connections"`

	// The registered merchant this operator trades under. Fixed at
	// registration and shown rather than asked for.
	RegisteredMerchantNumber string `json:"registeredMerchantNumber,omitempty"`
	RegisteredMerchantName   string `json:"registeredMerchantName,omitempty"`
	RegisteredLiveNumber     string `json:"registeredLiveNumber,omitempty"`

	// Defaults prefill the connect form for a first-time operator.
	DefaultGatewayHost string               `json:"defaultGatewayHost"`
	DefaultAPIVersion  string               `json:"defaultApiVersion"`
	KnownHosts         []domain.GatewayHost `json:"knownHosts"`
}

func connectionFrom(record *domain.GatewayCredential, masked string) connectionView {
	view := connectionView{
		Environment:       string(record.Environment),
		Active:            record.Active,
		Connected:         record.VerifiedAt != nil,
		GatewayHost:       record.GatewayHost,
		MPGSMerchantID:    record.MerchantID,
		MerchantName:      record.MerchantName,
		APIVersion:        record.APIVersion,
		APIPasswordMasked: masked,
	}
	if record.VerifiedAt != nil {
		view.VerifiedAt = record.VerifiedAt.Format(time.RFC3339)
	}
	return view
}

func (s *Server) handleGetCredentials(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	view := credentialsView{
		DefaultGatewayHost: s.cfg.DefaultGatewayHost,
		DefaultAPIVersion:  s.cfg.GatewayAPIVersion,
		GatewayHost:        s.cfg.DefaultGatewayHost,
		APIVersion:         s.cfg.GatewayAPIVersion,
		Environment:        string(domain.EnvTest),
		Connections:        []connectionView{},
		KnownHosts:         domain.KnownGatewayHosts,
	}
	if m, err := s.store.MPGSMerchantByNumber(user.MPGSMerchantNumber); err == nil {
		view.MerchantName = m.Name
		view.RegisteredMerchantNumber = m.Number
		view.RegisteredMerchantName = m.Name
		view.RegisteredLiveNumber = m.LiveNumber
		view.MPGSMerchantID = m.Number
	}

	records, err := s.store.GatewayCredentials(user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load your gateway settings.")
		return
	}
	for _, record := range records {
		// Show only enough of the password to recognise it.
		masked := ""
		if plain, err := s.sealer.Open(record.APIPasswordSealed); err == nil {
			masked = secrets.Mask(plain)
		}
		connection := connectionFrom(record, masked)
		view.Connections = append(view.Connections, connection)

		if record.Active {
			view.Connected = connection.Connected
			view.Environment = connection.Environment
			view.GatewayHost = connection.GatewayHost
			view.MPGSMerchantID = connection.MPGSMerchantID
			view.MerchantName = connection.MerchantName
			view.APIVersion = connection.APIVersion
			view.APIPasswordMasked = connection.APIPasswordMasked
			view.VerifiedAt = connection.VerifiedAt
		}
	}

	httpx.JSON(w, http.StatusOK, view)
}

// The merchant id and name are deliberately absent: both come from the
// register, fixed when the operator signed up. Letting a form supply them would
// mean two operators on one merchant could authenticate as different merchants,
// and a receipt could name a business the bank never onboarded.
type saveCredentialsRequest struct {
	Environment string `json:"environment"`
	GatewayHost string `json:"gatewayHost"`
	APIVersion  string `json:"apiVersion"`
	APIPassword string `json:"apiPassword"`
}

// resolveHost decides which gateway to talk to, and refuses anything that would
// send an API password somewhere it does not belong.
func (s *Server) resolveHost(raw string, env domain.Environment) (string, error) {
	host := domain.NormaliseHost(raw)
	if host == "" {
		host = domain.DefaultHostFor(env)
	}
	if !domain.AllowedGatewayHost(host, s.cfg.ExtraGatewayHosts) {
		return "", errors.New(
			host + " is not a Mastercard gateway. Enter one of the published MPGS hosts, " +
				"or ask the bank to add this one.")
	}
	// A host we publish must match the environment it was chosen for. Labelling
	// the production gateway as a test connection is how a real charge gets
	// mistaken for a rehearsal.
	if known, ok := domain.KnownHost(host); ok && known.Environment != env {
		return "", errors.New(host + " is the " + known.Environment.Label() +
			" gateway, but you selected " + env.Label() + ". Pick the matching one.")
	}
	return host, nil
}

// handleSaveCredentials verifies the operator's MPGS details against the
// gateway before storing them, so a typo is caught here rather than at the
// moment a customer tries to pay.
func (s *Server) handleSaveCredentials(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	// Each attempt sends a password to Mastercard on the caller's behalf. An
	// unbounded endpoint here would turn the portal into a comfortable place to
	// guess MPGS credentials from.
	if !rateLimit(s.gatewayLimit, "gateway:"+user.ID, w,
		"Too many gateway connection attempts. Wait a few minutes and try again.") {
		return
	}

	var req saveCredentialsRequest
	if !httpx.Decode(w, r, &req) {
		return
	}

	env := domain.ParseEnvironment(req.Environment)
	host, err := s.resolveHost(req.GatewayHost, env)
	if err != nil {
		httpx.ErrorCode(w, http.StatusBadRequest, "host_not_allowed", err.Error())
		return
	}

	// Resolved from the register, never from the request.
	registered, err := s.store.MPGSMerchantByNumber(user.MPGSMerchantNumber)
	if err != nil {
		httpx.ErrorCode(w, http.StatusConflict, "no_merchant",
			"Your account is not linked to a registered merchant. Ask your bank contact to register your merchant number.")
		return
	}
	merchantID := registered.NumberFor(env)
	merchantName := registered.Name

	apiVersion := strings.TrimSpace(req.APIVersion)
	if apiVersion == "" {
		apiVersion = s.cfg.GatewayAPIVersion
	}

	existing, existingErr := s.store.GatewayCredentialFor(user.ID, env)
	password := strings.TrimSpace(req.APIPassword)
	if password == "" {
		// Allow editing the other fields without re-typing the secret.
		if existingErr != nil {
			httpx.Error(w, http.StatusBadRequest, "Your MPGS API password is required.")
			return
		}
		plain, err := s.sealer.Open(existing.APIPasswordSealed)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Re-enter your MPGS API password to continue.")
			return
		}
		password = plain
	}

	creds := mpgs.Credentials{
		Host:         host,
		MerchantID:   merchantID,
		MerchantName: merchantName,
		APIVersion:   apiVersion,
		APIPassword:  password,
	}

	if err := s.gateway.Verify(r.Context(), creds); err != nil {
		var gwErr *mpgs.Error
		if errors.As(err, &gwErr) {
			status := http.StatusBadGateway
			message := "The gateway rejected these details: " + gwErr.Error()
			if gwErr.Unauthorized() {
				status = http.StatusBadRequest
				message = "The gateway did not accept these credentials. Check the merchant ID and API password."
			}
			httpx.ErrorCode(w, status, "gateway_rejected", message)
			return
		}
		slog.Error("gateway verification failed", "user", user.ID, "env", env, "error", err)
		httpx.ErrorCode(w, http.StatusBadGateway, "gateway_unreachable",
			"Could not reach the payment gateway. Check the host and try again.")
		return
	}

	sealed, err := s.sealer.Seal(password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not store your credentials securely.")
		return
	}

	now := time.Now().UTC()
	record := &domain.GatewayCredential{
		UserID:            user.ID,
		Environment:       env,
		GatewayHost:       host,
		MerchantID:        merchantID,
		MerchantName:      merchantName,
		APIVersion:        apiVersion,
		APIPasswordSealed: sealed,
		VerifiedAt:        &now,
	}
	if existingErr == nil {
		record.CreatedAt = existing.CreatedAt
	}
	if err := s.store.UpsertGatewayCredential(record); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not save your gateway settings.")
		return
	}

	slog.Info("gateway credentials verified and stored",
		"user", user.ID, "environment", env, "mpgsMerchant", merchantID, "host", host)

	s.writeCredentials(w, user.ID)
}

type environmentRequest struct {
	Environment string `json:"environment"`
}

// handleSetEnvironment switches the operator between connections they already
// hold. Links and payments made in the other environment stay where they are.
func (s *Server) handleSetEnvironment(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	var req environmentRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	env := domain.ParseEnvironment(req.Environment)
	if err := s.store.SetActiveEnvironment(user.ID, env); err != nil {
		httpx.ErrorCode(w, http.StatusConflict, "not_connected",
			"Connect a "+env.Label()+" gateway before switching to it.")
		return
	}
	slog.Info("operator switched environment", "user", user.ID, "environment", env)
	s.writeCredentials(w, user.ID)
}

// writeCredentials answers with the operator's full connection state, so the
// client never has to guess what changed.
func (s *Server) writeCredentials(w http.ResponseWriter, userID string) {
	view := credentialsView{
		DefaultGatewayHost: s.cfg.DefaultGatewayHost,
		DefaultAPIVersion:  s.cfg.GatewayAPIVersion,
		Environment:        string(domain.EnvTest),
		Connections:        []connectionView{},
		KnownHosts:         domain.KnownGatewayHosts,
	}
	if u, err := s.store.UserByID(userID); err == nil {
		if m, err := s.store.MPGSMerchantByNumber(u.MPGSMerchantNumber); err == nil {
			view.MerchantName = m.Name
			view.RegisteredMerchantNumber = m.Number
			view.RegisteredMerchantName = m.Name
			view.RegisteredLiveNumber = m.LiveNumber
			view.MPGSMerchantID = m.Number
		}
	}
	records, err := s.store.GatewayCredentials(userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load your gateway settings.")
		return
	}
	for _, record := range records {
		masked := ""
		if plain, err := s.sealer.Open(record.APIPasswordSealed); err == nil {
			masked = secrets.Mask(plain)
		}
		connection := connectionFrom(record, masked)
		view.Connections = append(view.Connections, connection)
		if record.Active {
			view.Connected = connection.Connected
			view.Environment = connection.Environment
			view.GatewayHost = connection.GatewayHost
			view.MPGSMerchantID = connection.MPGSMerchantID
			view.MerchantName = connection.MerchantName
			view.APIVersion = connection.APIVersion
			view.APIPasswordMasked = connection.APIPasswordMasked
			view.VerifiedAt = connection.VerifiedAt
		}
	}
	httpx.JSON(w, http.StatusOK, view)
}

func (s *Server) handleDeleteCredentials(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	env := domain.ParseEnvironment(r.URL.Query().Get("environment"))
	if r.URL.Query().Get("environment") == "" {
		env = s.store.ActiveEnvironment(user.ID)
	}
	if err := s.store.DeleteGatewayCredential(user.ID, env); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not disconnect the gateway.")
		return
	}
	slog.Info("gateway disconnected", "user", user.ID, "environment", env)
	s.writeCredentials(w, user.ID)
}

// environmentFor is the mode a signed-in user's screens are showing.
//
// Only an operator holds gateway connections, so only an operator has a mode to
// be in. A merchant or a bank admin is shown live money: during a pilot that
// means their figures read zero until real payments start, which is the right
// way round — a rehearsal must never be reported to them as revenue.
func (s *Server) environmentFor(user *domain.User) domain.Environment {
	if user.Role != domain.RoleSales {
		return domain.EnvLive
	}
	return s.store.ActiveEnvironment(user.ID)
}
