package domain

import (
	"crypto/rand"
	"encoding/base64"
	"time"
)

// Integration is a third-party system allowed to create payment links through
// the API — a fundraising platform, a billing system, an ERP.
//
// One per environment. The test one is issued at registration; the live one
// does not exist until a bank administrator has approved it, so holding live
// credentials and being approved are the same fact rather than two that can
// drift apart.
type Integration struct {
	ID          string
	MerchantID  string
	OwnerID     string
	Name        string
	Environment Environment

	// APIKey identifies the caller and is safe to show.
	//
	// The other two are stored sealed, not hashed, because an HMAC signature
	// can only be checked against the secret itself and a body can only be
	// opened with the key that sealed it. Unreadable in a dump, readable to the
	// process that has to verify with them — the same bargain as an operator's
	// gateway password.
	APIKey           string
	SecretSealed     []byte
	SecretHint       string
	PayloadKeySealed []byte

	// Where the payer is sent back to, and where we report server to server.
	// A redirect can be lost — a closed tab, a flat battery — so the webhook is
	// what makes delivery dependable. They are not alternatives.
	CallbackSuccessURL string
	CallbackFailureURL string
	WebhookURL         string

	Status     IntegrationStatus
	LastUsedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// IssuedCredentials is what an integrator is shown once, at the moment their
// credentials are created, and never again. Nothing stores these in the clear,
// so a copy not taken here is a rotation later.
type IssuedCredentials struct {
	APIKey     string
	Secret     string
	PayloadKey string
}

type IntegrationStatus string

const (
	IntegrationActive IntegrationStatus = "active"
	// Suspended keeps the record and its history while refusing every call, so
	// turning an integration off does not mean destroying what it did.
	IntegrationSuspended IntegrationStatus = "suspended"
)

func (s IntegrationStatus) Valid() bool {
	return s == IntegrationActive || s == IntegrationSuspended
}

// Usable reports whether calls made with these credentials should be served.
func (i *Integration) Usable() bool { return i != nil && i.Status == IntegrationActive }

// LiveRequest is an integrator asking for live credentials, and the decision an
// administrator made about it. Kept as a record rather than a flag so the
// decision carries an author and a date.
type LiveRequest struct {
	ID            string
	IntegrationID string
	MerchantID    string
	RequestedBy   string
	Status        ReviewStatus
	Note          string
	ReviewedBy    string
	RequestedAt   time.Time
	ReviewedAt    *time.Time
}

type ReviewStatus string

const (
	ReviewPending  ReviewStatus = "pending"
	ReviewApproved ReviewStatus = "approved"
	ReviewRejected ReviewStatus = "rejected"
)

func (s ReviewStatus) Valid() bool {
	switch s {
	case ReviewPending, ReviewApproved, ReviewRejected:
		return true
	}
	return false
}

// The events an integrator can be told about. Named for what happened to the
// money rather than for what the gateway called it, because that is what the
// receiving system has to make a decision about.
const (
	EventPaymentSucceeded  = "payment.succeeded"
	EventPaymentAuthorized = "payment.authorized"
	EventPaymentFailed     = "payment.failed"
	EventPaymentRefunded   = "payment.refunded"
)

type WebhookStatus string

const (
	WebhookPending   WebhookStatus = "pending"
	WebhookDelivered WebhookStatus = "delivered"
	// Exhausted rather than "failed": the attempts ran out. The record stays so
	// somebody can see what was never received and replay it.
	WebhookExhausted WebhookStatus = "exhausted"
)

// WebhookDelivery is one queued notification to one integration.
type WebhookDelivery struct {
	ID            string
	IntegrationID string
	Event         string
	PaymentID     string
	Payload       string
	Status        WebhookStatus
	Attempts      int
	NextAttemptAt time.Time
	ResponseCode  int
	LastError     string
	CreatedAt     time.Time
	DeliveredAt   *time.Time
}

// MetadataPair is one key and value an integrator attached to a link, handed
// back with every payment made against it.
type MetadataPair struct {
	Key   string
	Value string
}

// NewCredentials mints a fresh set.
//
// The key carries its environment in the prefix, so a live key is recognisable
// at a glance in a log, a config file or a screenshot. The moment before
// somebody pastes one into the wrong environment is exactly the moment it is
// worth being obvious about.
func NewCredentials(env Environment) (IssuedCredentials, error) {
	keyBody, err := randomToken(24)
	if err != nil {
		return IssuedCredentials{}, err
	}
	secret, err := randomToken(32)
	if err != nil {
		return IssuedCredentials{}, err
	}
	payloadKey := make([]byte, 32)
	if _, err := rand.Read(payloadKey); err != nil {
		return IssuedCredentials{}, err
	}
	prefix := "pk_test_"
	if env.IsLive() {
		prefix = "pk_live_"
	}
	return IssuedCredentials{
		APIKey:     prefix + keyBody,
		Secret:     secret,
		PayloadKey: base64.StdEncoding.EncodeToString(payloadKey),
	}, nil
}

func randomToken(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// SecretHint is enough of a secret to tell two apart on a screen, and not
// enough to be worth capturing.
func SecretHint(secret string) string {
	if len(secret) < 4 {
		return "…"
	}
	return "…" + secret[len(secret)-4:]
}
