package api

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
)

// Operators register themselves. What makes that safe is the merchant number:
// it has to already be in the register that merchant management keeps, so an
// account can only ever attach to a merchant the bank has onboarded.

type registerRequest struct {
	Username        string `json:"username"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	MerchantNumber  string `json:"merchantNumber"`
	FullName        string `json:"fullName"`
}

type registerResponse struct {
	Username       string `json:"username"`
	MerchantNumber string `json:"merchantNumber"`
	MerchantName   string `json:"merchantName"`
	Message        string `json:"message"`
}

// usernameRule keeps sign-in identifiers unambiguous: no spaces to mistype, no
// case surprises, and long enough not to collide by accident.
func validateUsername(raw string) (string, error) {
	username := strings.TrimSpace(raw)
	if len(username) < 3 || len(username) > 32 {
		return "", errBadRequest("Choose a username between 3 and 32 characters.")
	}
	for _, r := range username {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		case r == '.', r == '_', r == '-', r == '@':
		default:
			return "", errBadRequest(
				"A username can use letters, numbers, and . _ - @ only.")
		}
	}
	return username, nil
}

type badRequest struct{ msg string }

func (e *badRequest) Error() string { return e.msg }
func errBadRequest(m string) error  { return &badRequest{m} }

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	// Registration is the one place an unauthenticated caller can probe the
	// merchant register, so it gets the tightest budget in the service.
	if !rateLimit(s.registerLimit, s.clientIP(r), w,
		"Too many registration attempts. Try again later.") {
		return
	}

	var req registerRequest
	if !httpx.Decode(w, r, &req) {
		return
	}

	username, err := validateUsername(req.Username)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	// The username and the merchant number are both guessable about this
	// account, so neither may be the password.
	if err := auth.ValidatePassword(req.Password, username, req.MerchantNumber); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	// Checked here rather than only in the browser: the two fields exist to
	// catch a typo in something the person cannot see, and a client is free to
	// skip that check.
	if req.Password != req.ConfirmPassword {
		httpx.ErrorCode(w, http.StatusBadRequest, "password_mismatch",
			"Those passwords do not match.")
		return
	}

	// The merchant number is the control on self-registration. It must already
	// be registered by merchant management; the name comes from that entry, so
	// nobody types the name of the business they claim to work for.
	//
	// Further rules on which numbers may be used go here, once specified.
	number := strings.TrimSpace(req.MerchantNumber)
	merchant, err := s.store.MPGSMerchantByNumber(number)
	if err != nil {
		// Logged with the attempt so a sweep through the number space is
		// visible, and answered without confirming anything about the number.
		slog.Warn("registration with unregistered merchant number",
			"number", number, "remote", s.clientIP(r))
		httpx.ErrorCode(w, http.StatusBadRequest, "unknown_merchant",
			"That merchant number is not registered. Check it with your bank contact.")
		return
	}

	taken, err := s.store.UsernameTaken(username)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not complete registration.")
		return
	}
	if taken {
		httpx.ErrorCode(w, http.StatusConflict, "username_taken",
			"That username is already in use. Choose another.")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not set your password.")
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName == "" {
		fullName = username
	}

	// An operator registered before this merchant had a row — or against a
	// register entry written by an older build — would otherwise be created
	// with no merchant at all, and could never issue a link.
	if err := s.store.EnsureMerchant(merchant.Number, merchant.Name); err != nil {
		slog.Error("could not prepare merchant for operator",
			"number", merchant.Number, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not complete registration.")
		return
	}

	user := &domain.User{
		Username: username,
		FullName: fullName,
		// Both, and deliberately the same string: MerchantID is the foreign key
		// every link and payment hangs from, MPGSMerchantNumber is what the
		// gateway is addressed with. Setting only the second is what made link
		// creation fail with a 500.
		MerchantID:         merchant.Number,
		MPGSMerchantNumber: merchant.Number,
		Role:               domain.RoleSales,
		Title:              "Sales agent",
		// Active immediately: the merchant number was the check, and a second
		// activation step would only hand out a password nobody asked for.
		Status:       domain.UserActive,
		PasswordHash: hash,
	}
	if err := s.store.CreateUser(user); err != nil {
		slog.Error("could not register operator", "username", username, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not create this account.")
		return
	}

	// The budget exists to slow someone guessing merchant numbers. A branch
	// signing up its whole team in one sitting is not that, so a success hands
	// the allowance back.
	s.registerLimit.reset(s.clientIP(r))

	slog.Info("operator registered",
		"user", user.ID, "username", username, "merchantNumber", merchant.Number)

	httpx.JSON(w, http.StatusCreated, registerResponse{
		Username:       username,
		MerchantNumber: merchant.Number,
		MerchantName:   merchant.Name,
		Message:        "Your account is ready. Sign in to connect your gateway.",
	})
}

// ---------------------------------------------------------- merchant register

type mpgsMerchantView struct {
	Number     string `json:"number"`
	Name       string `json:"name"`
	LiveNumber string `json:"liveNumber,omitempty"`
	Operators  int    `json:"operators"`
	CreatedAt  string `json:"createdAt"`
}

func (s *Server) handleListMPGSMerchants(w http.ResponseWriter, r *http.Request) {
	merchants, err := s.store.MPGSMerchants()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load the merchant register.")
		return
	}
	views := make([]mpgsMerchantView, 0, len(merchants))
	for _, m := range merchants {
		count, _ := s.store.OperatorsForMPGSMerchant(m.Number)
		views = append(views, mpgsMerchantView{
			Number:     m.Number,
			Name:       m.Name,
			LiveNumber: m.LiveNumber,
			Operators:  count,
			CreatedAt:  m.CreatedAt.Format("02 Jan 2006"),
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"merchants": views})
}

type createMPGSMerchantRequest struct {
	Number     string `json:"number"`
	Name       string `json:"name"`
	LiveNumber string `json:"liveNumber"`
}

func (s *Server) handleCreateMPGSMerchant(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	var req createMPGSMerchantRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	number := strings.TrimSpace(req.Number)
	name := strings.TrimSpace(req.Name)
	if number == "" {
		httpx.Error(w, http.StatusBadRequest, "Enter the merchant number issued by the gateway.")
		return
	}
	if name == "" {
		httpx.Error(w, http.StatusBadRequest, "Enter the name this merchant trades under.")
		return
	}

	// This name is what a payer sees on their receipt, so it is worth saying so
	// where it is entered rather than discovering it afterwards.
	existing, err := s.store.MPGSMerchantByNumber(number)
	renaming := err == nil && existing.Name != name

	if err := s.store.CreateMPGSMerchant(&domain.MPGSMerchant{
		Number:     number,
		Name:       name,
		LiveNumber: strings.TrimSpace(req.LiveNumber),
		CreatedBy:  user.ID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not save this merchant.")
		return
	}
	// Payment links and payments are keyed to a merchant row by foreign key, so
	// the register is only half-written until that row exists. Without it an
	// operator registers happily and every link they create fails.
	if err := s.store.EnsureMerchant(number, name); err != nil {
		slog.Error("could not mirror merchant into the merchant table",
			"number", number, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not save this merchant.")
		return
	}
	slog.Info("merchant register updated",
		"number", number, "name", name, "by", user.ID, "renamed", renaming)

	s.handleListMPGSMerchants(w, r)
}
