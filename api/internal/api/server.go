package api

import (
	"log/slog"
	"net"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/config"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/mailer"
	"github.com/zemenbank/paylink/api/internal/mpgs"
	"github.com/zemenbank/paylink/api/internal/secrets"
	"github.com/zemenbank/paylink/api/internal/secure"
	"github.com/zemenbank/paylink/api/internal/store"
)

type Server struct {
	cfg     *config.Config
	store   *store.Store
	tokens  *auth.Manager
	sealer  *secrets.Sealer
	gateway *mpgs.Client
	mail    mailer.Mailer

	// channels holds the sealed application-layer channels; every /api/v1 call
	// but the handshake has to arrive on one.
	channels *secure.Registry
	// keys does the same job for server-to-server callers, who cannot perform
	// the browser handshake and sign with a secret issued in advance instead.
	keys *secure.KeyVerifier
	// hooks delivers outbound notifications to integrators.
	hooks *webhookDispatcher

	// Guessing a password, a merchant number or an order id all have to be slow
	// enough to be useless and loud enough to notice.
	loginLimit     *limiter
	registerLimit  *limiter
	publicLimit    *limiter
	handshakeLimit *limiter
	// Recovery answers carry little entropy, so the budget is the control that
	// makes guessing them impractical.
	recoveryLimit *limiter

	// Budgets on the endpoints where an abused session does real damage:
	// money movement, credential checks that reach Mastercard, link creation
	// and outbound sharing.
	moneyLimit    *limiter
	gatewayLimit  *limiter
	linkLimit     *limiter
	shareLimit    *limiter
	checkoutLimit *limiter
	// Per-key budget on the integration API. Generous, because a real
	// integration makes a call per donation, and bounded, because a valid key
	// should not be able to spend our CPU verifying signatures without limit.
	integrationLimit *limiter

	// Four wrong answers shut an account for fifteen minutes, then it opens on
	// its own. Applied to whatever username was typed, whether or not it
	// exists, so being locked out is not a way to learn who is registered.
	signInLock   *lockout
	recoveryLock *lockout

	// Networks whose X-Forwarded-For is believed — see clientIP.
	trustedProxies []*net.IPNet
}

func NewServer(
	cfg *config.Config, st *store.Store, sealer *secrets.Sealer, mail mailer.Mailer,
) (*Server, error) {
	// Refuse to start on an unreadable proxy list rather than quietly trusting
	// nothing and attributing every request to the proxy in front of us.
	proxies, err := parseTrustedProxies(cfg.TrustedProxies)
	if err != nil {
		return nil, err
	}
	srv := &Server{
		cfg:     cfg,
		store:   st,
		tokens:  auth.NewManager(cfg.JWTSecret, cfg.TokenTTL, cfg.SessionIdle),
		sealer:  sealer,
		gateway: mpgs.New(cfg.GatewayTimeout),
		mail:    mail,

		channels: secure.NewRegistry(),
		keys:     secure.NewKeyVerifier(),
		// The per-account lockout is what stops someone guessing one password,
		// so this budget only has to stop one address sweeping many accounts.
		// Kept loose enough that a branch office behind one NAT address can all
		// start their morning at once without getting in each other's way.
		loginLimit:     newLimiter(30, time.Minute),
		registerLimit:  newLimiter(5, 10*time.Minute),
		publicLimit:    newLimiter(120, time.Minute),
		handshakeLimit: newLimiter(60, time.Minute),
		recoveryLimit:  newLimiter(5, time.Hour),

		// Generous enough that nobody working normally will notice, tight
		// enough that a stolen session cannot drain an account in a burst.
		moneyLimit: newLimiter(20, time.Minute),
		// This one reaches the gateway with a password, so a loose budget here
		// would make the portal a convenient oracle for guessing MPGS
		// credentials.
		gatewayLimit:  newLimiter(5, 15*time.Minute),
		linkLimit:     newLimiter(60, time.Hour),
		shareLimit:    newLimiter(30, time.Hour),
		checkoutLimit: newLimiter(12, time.Minute),
		// A donation platform at full tilt makes a call per donor; this is far
		// above that and far below what would hurt us.
		integrationLimit: newLimiter(600, time.Minute),

		signInLock:   newLockout(MaxFailedAttempts, FailureWindow, LockoutDuration),
		recoveryLock: newLockout(MaxFailedAttempts, FailureWindow, LockoutDuration),

		trustedProxies: proxies,
	}
	srv.hooks = newWebhookDispatcher(srv)
	return srv, nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "time": time.Now().UTC()})
	})

	// --- secure channel -----------------------------------------------------
	// The only endpoint under /api/v1 that speaks plaintext: it is where the
	// key for everything else comes from.
	mux.HandleFunc("POST /api/v1/secure/handshake", s.handleHandshake)

	// --- authentication -----------------------------------------------------
	mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/v1/auth/invite/{token}", s.handleInviteLookup)
	mux.HandleFunc("POST /api/v1/auth/activate", s.handleActivate)
	// Operators register themselves; the merchant number is what gates it.
	mux.HandleFunc("POST /api/v1/auth/register", s.handleRegister)
	mux.Handle("GET /api/v1/auth/me", s.authenticated(http.HandlerFunc(s.handleMe)))
	mux.Handle("POST /api/v1/auth/logout", s.authenticated(http.HandlerFunc(s.handleLogout)))

	// --- account recovery ---------------------------------------------------
	mux.Handle("GET /api/v1/auth/security-questions",
		s.authenticated(http.HandlerFunc(s.handleGetSecurityQuestions)))
	mux.Handle("PUT /api/v1/auth/security-questions",
		s.authenticated(http.HandlerFunc(s.handleSetSecurityQuestions)))
	// Public, and answered for every username so that asking reveals nothing.
	mux.HandleFunc("GET /api/v1/auth/recovery/{username}", s.handleRecoveryChallenge)
	mux.HandleFunc("POST /api/v1/auth/recovery", s.handleRecover)

	// --- operator gateway credentials ---------------------------------------
	mux.Handle("GET /api/v1/gateway/credentials",
		s.authenticated(http.HandlerFunc(s.handleGetCredentials)))
	mux.Handle("PUT /api/v1/gateway/credentials",
		s.authenticated(http.HandlerFunc(s.handleSaveCredentials)))
	mux.Handle("DELETE /api/v1/gateway/credentials",
		s.authenticated(http.HandlerFunc(s.handleDeleteCredentials)))
	// Switch between the test and live profiles the operator already holds.
	mux.Handle("POST /api/v1/gateway/environment",
		s.authenticated(http.HandlerFunc(s.handleSetEnvironment)))

	// --- pay links ----------------------------------------------------------
	mux.Handle("GET /api/v1/links", s.authenticated(http.HandlerFunc(s.handleListLinks)))
	mux.Handle("POST /api/v1/links",
		s.authenticated(s.requireRole(domain.RoleSales, domain.RoleMerchant)(http.HandlerFunc(s.handleCreateLink))))
	mux.Handle("GET /api/v1/links/{id}", s.authenticated(http.HandlerFunc(s.handleGetLink)))
	mux.Handle("POST /api/v1/links/{id}/status", s.authenticated(http.HandlerFunc(s.handleSetLinkStatus)))
	mux.Handle("POST /api/v1/links/{id}/share", s.authenticated(http.HandlerFunc(s.handleShareLink)))

	// --- payments -----------------------------------------------------------
	mux.Handle("GET /api/v1/payments", s.authenticated(http.HandlerFunc(s.handleListPayments)))
	mux.Handle("GET /api/v1/analytics", s.authenticated(http.HandlerFunc(s.handleAnalytics)))
	mux.Handle("GET /api/v1/payments/{orderId}", s.authenticated(http.HandlerFunc(s.handleGetPayment)))
	// Money movement. Scoped like the link itself: its operator, the merchant
	// owner, or a bank admin.
	mux.Handle("POST /api/v1/payments/{orderId}/capture", s.authenticated(http.HandlerFunc(s.handleCapture)))
	mux.Handle("POST /api/v1/payments/{orderId}/refund", s.authenticated(http.HandlerFunc(s.handleRefund)))
	mux.Handle("POST /api/v1/payments/{orderId}/void", s.authenticated(http.HandlerFunc(s.handleVoid)))

	// --- merchant register (merchant management) ----------------------------
	mux.Handle("GET /api/v1/merchant-register",
		s.authenticated(s.requireRole(domain.RoleMerchantManagement, domain.RoleAdmin)(
			http.HandlerFunc(s.handleListMPGSMerchants))))
	mux.Handle("POST /api/v1/merchant-register",
		s.authenticated(s.requireRole(domain.RoleMerchantManagement, domain.RoleAdmin)(
			http.HandlerFunc(s.handleCreateMPGSMerchant))))

	// --- team ---------------------------------------------------------------
	mux.Handle("GET /api/v1/team", s.authenticated(http.HandlerFunc(s.handleListTeam)))
	mux.Handle("POST /api/v1/team",
		s.authenticated(s.requireRole(domain.RoleMerchant, domain.RoleAdmin)(http.HandlerFunc(s.handleInviteTeam))))
	mux.Handle("GET /api/v1/branches", s.authenticated(http.HandlerFunc(s.handleListBranches)))

	// --- public payer-facing endpoints (no session) -------------------------
	mux.HandleFunc("GET /api/v1/public/links/{slug}", s.handlePublicLink)
	mux.HandleFunc("POST /api/v1/public/links/{slug}/checkout", s.handlePublicCheckout)
	mux.HandleFunc("GET /api/v1/public/payments/{orderId}", s.handlePublicPaymentStatus)
	// The payer's proof of payment. Keyed on the order id they already hold.
	mux.HandleFunc("GET /api/v1/public/receipts/{orderId}", s.handlePublicReceipt)

	// The server-to-server API, for systems that create links programmatically.
	//
	// Mounted behind its own middleware rather than the browser channel: an
	// integration has no browser to perform an ECDH handshake with, so it signs
	// with a secret issued in advance. It is no less sealed for that — the same
	// signature, envelope and replay window apply, and an unsealed call is
	// refused here exactly as it is there.
	integrationAPI := http.NewServeMux()
	integrationAPI.HandleFunc("GET /api/v1/integration/ping", s.handleAPIPing)
	integrationAPI.HandleFunc("POST /api/v1/integration/links", s.handleAPICreateLink)
	integrationAPI.HandleFunc("GET /api/v1/integration/links/{id}", s.handleAPIGetLink)
	integrationAPI.HandleFunc("GET /api/v1/integration/payments/{orderId}", s.handleAPIGetPayment)
	mux.Handle(integrationPrefix, s.integrationChannel(integrationAPI))

	// Managing an integration happens in the portal, on an ordinary session.
	mux.Handle("GET /api/v1/integrations",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleListIntegrations))))
	mux.Handle("POST /api/v1/integrations",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleCreateIntegration))))
	mux.Handle("PUT /api/v1/integrations/{id}/endpoints",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleUpdateEndpoints))))
	mux.Handle("POST /api/v1/integrations/{id}/rotate",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleRotateSecrets))))
	mux.Handle("POST /api/v1/integrations/{id}/go-live",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleRequestLive))))
	mux.Handle("GET /api/v1/integrations/{id}/deliveries",
		s.authenticated(s.integratorOnly(http.HandlerFunc(s.handleListDeliveries))))

	// The bank administrator who decides whether an integration goes live.
	mux.Handle("GET /api/v1/admin/live-requests",
		s.authenticated(s.requireRole(domain.RoleAdmin)(http.HandlerFunc(s.handleListLiveRequests))))
	mux.Handle("POST /api/v1/admin/live-requests/{id}",
		s.authenticated(s.requireRole(domain.RoleAdmin)(http.HandlerFunc(s.handleReviewLiveRequest))))

	// Outermost first: a panic is caught, the response is labelled, the caller
	// is throttled, CORS is settled, and only then is the sealed channel opened
	// — so an unsealed request never reaches a handler.
	return s.recoverPanic(
		s.securityHeaders(
			s.logRequests(
				s.throttle(
					s.cors(
						s.openChannel(mux))))))
}

// throttle applies the coarse per-address budget that protects every public
// endpoint. The tighter, per-identity limits live in the handlers that know
// what is being guessed at.
func (s *Server) throttle(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)
			return
		}
		limit := s.publicLimit
		if r.URL.Path == "/api/v1/secure/handshake" {
			limit = s.handshakeLimit
		}
		if !rateLimit(limit, s.clientIP(r), w, "Too many requests. Try again shortly.") {
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ------------------------------------------------------------- middleware

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(s.cfg.CORSOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("request",
			"method", r.Method, "path", r.URL.Path,
			"status", rec.status, "duration", time.Since(start).Round(time.Millisecond))
	})
}

func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic serving request", "path", r.URL.Path, "panic", rec)
				httpx.Error(w, http.StatusInternalServerError, "Something went wrong.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// authenticated resolves the bearer token to a live user record, so a disabled
// account stops working immediately rather than when its token expires.
func (s *Server) authenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || strings.TrimSpace(token) == "" {
			httpx.ErrorCode(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue.")
			return
		}
		claims, err := s.tokens.Parse(strings.TrimSpace(token))
		if err != nil {
			httpx.ErrorCode(w, http.StatusUnauthorized, "unauthenticated", "Your session has expired. Please sign in again.")
			return
		}
		// A valid signature is not enough: the session must still be live. This
		// is what makes signing out mean something, and what applies the idle
		// timeout to a token that would otherwise be good for hours.
		if !s.tokens.Live(claims) {
			httpx.ErrorCode(w, http.StatusUnauthorized, "unauthenticated",
				"Your session has ended. Please sign in again.")
			return
		}
		user, err := s.store.UserByID(claims.Subject)
		if err != nil {
			httpx.ErrorCode(w, http.StatusUnauthorized, "unauthenticated", "Your session is no longer valid.")
			return
		}
		if user.Status == domain.UserSuspended {
			httpx.ErrorCode(w, http.StatusForbidden, "suspended", "This account has been suspended.")
			return
		}
		ctx := auth.WithClaims(auth.WithUser(r.Context(), user), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) requireRole(roles ...domain.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := auth.UserFrom(r.Context())
			if !ok || !slices.Contains(roles, user.Role) {
				httpx.Error(w, http.StatusForbidden, "Your role does not allow this action.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
