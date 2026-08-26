// Package domain holds the core entities shared across the store and API.
package domain

import "time"

type Role string

const (
	RoleAdmin    Role = "admin"    // bank administrator
	RoleMerchant Role = "merchant" // merchant workspace owner
	RoleSales    Role = "sales"    // MPGS "Operator" — creates and shares pay links
	// RoleMerchantManagement keeps the register of merchant numbers and the
	// name each one trades under. Operators register against that list, so it
	// is what decides who a payment is shown as being paid to.
	RoleMerchantManagement Role = "merchant_management"
)

func (r Role) Valid() bool {
	switch r {
	case RoleAdmin, RoleMerchant, RoleSales, RoleMerchantManagement:
		return true
	}
	return false
}

type UserStatus string

const (
	UserInvited   UserStatus = "invited"
	UserActive    UserStatus = "active"
	UserSuspended UserStatus = "suspended"
)

type User struct {
	ID         string `json:"id"`
	MerchantID string `json:"merchantId,omitempty"`
	BranchID   string `json:"branchId,omitempty"`
	// Username is the login identifier. Operators register their own, so it is
	// what they type to sign in; email is optional profile data.
	Username string `json:"username"`
	// MPGSMerchantNumber ties the operator to a registered merchant. Fixed at
	// registration, which is why connecting a gateway never asks for it again.
	MPGSMerchantNumber string     `json:"mpgsMerchantNumber,omitempty"`
	Email              string     `json:"email"`
	FullName           string     `json:"fullName"`
	Phone              string     `json:"phone,omitempty"`
	Role               Role       `json:"role"`
	Title              string     `json:"title,omitempty"`
	Status             UserStatus `json:"status"`
	PasswordHash       string     `json:"-"`
	InviteToken        string     `json:"-"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type Merchant struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Category        string    `json:"category"`
	Status          string    `json:"status"`
	ContactEmail    string    `json:"contactEmail"`
	DefaultCurrency string    `json:"defaultCurrency"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Branch struct {
	ID           string    `json:"id"`
	MerchantID   string    `json:"merchantId"`
	Name         string    `json:"name"`
	Code         string    `json:"code"`
	City         string    `json:"city,omitempty"`
	Area         string    `json:"area,omitempty"`
	ManagerName  string    `json:"managerName,omitempty"`
	ManagerEmail string    `json:"managerEmail,omitempty"`
	ManagerPhone string    `json:"managerPhone,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// GatewayCredential is one operator's MPGS access. The API password is sealed
// with AES-GCM and never leaves the server.
type GatewayCredential struct {
	UserID string `json:"-"`
	// Environment the profile belongs to. An operator may hold one of each, so
	// a pilot can run against production without abandoning the test gateway.
	Environment       Environment `json:"environment"`
	Active            bool        `json:"active"`
	GatewayHost       string      `json:"gatewayHost"`
	MerchantID        string      `json:"mpgsMerchantId"`
	MerchantName      string      `json:"merchantName"`
	APIVersion        string      `json:"apiVersion"`
	APIPasswordSealed []byte      `json:"-"`
	APIPasswordMasked string      `json:"apiPasswordMasked"`
	VerifiedAt        *time.Time  `json:"verifiedAt,omitempty"`
	CreatedAt         time.Time   `json:"createdAt"`
	UpdatedAt         time.Time   `json:"updatedAt"`
}

type LinkType string

const (
	LinkStatic  LinkType = "static"  // fixed amount, paid in full each time
	LinkDynamic LinkType = "dynamic" // payer enters the amount, no total
	// LinkSplit carries a bill total that several payers chip away at. The
	// gateway has no concept of this — each contribution is an ordinary order,
	// and the running balance is ours.
	LinkSplit LinkType = "split"
)

type LinkStatus string

const (
	LinkActive       LinkStatus = "active"
	LinkPaused       LinkStatus = "paused"
	LinkExpired      LinkStatus = "expired"
	LinkLimitReached LinkStatus = "limit_reached"
	LinkSettled      LinkStatus = "settled" // a split bill reached its target
	LinkCancelled    LinkStatus = "cancelled"
)

type PayLink struct {
	ID          string      `json:"id"`
	Slug        string      `json:"slug"`
	MerchantID  string      `json:"merchantId"`
	CreatedByID string      `json:"createdById"`
	BranchID    string      `json:"branchId,omitempty"`
	Title       string      `json:"title"`
	Description string      `json:"description,omitempty"`
	Reference   string      `json:"reference,omitempty"`
	Type        LinkType    `json:"type"`
	PaymentMode PaymentMode `json:"paymentMode"`
	// Environment is fixed when the link is created, from the operator's mode at
	// that moment. Every payment against it uses that gateway for the rest of
	// its life, so going live never breaks links already in customers' hands.
	Environment Environment `json:"environment"`
	AmountMinor int64       `json:"amountMinor"`
	// TargetMinor is the bill total on a split link; zero on every other kind.
	TargetMinor int64      `json:"targetMinor"`
	Currency    string     `json:"currency"`
	MinMinor    int64      `json:"minMinor,omitempty"`
	MaxMinor    int64      `json:"maxMinor,omitempty"`
	MaxUses     *int       `json:"maxUses"`
	UsedCount   int        `json:"usedCount"`
	PaidCount   int        `json:"paidCount"`
	PaidMinor   int64      `json:"paidMinor"`
	ExpiresAt   *time.Time `json:"expiresAt"`
	Status      LinkStatus `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`

	// Joined for presentation.
	MerchantName string `json:"merchantName,omitempty"`
	CreatedBy    string `json:"createdBy,omitempty"`
	BranchName   string `json:"branchName,omitempty"`
}

// IsSplit reports whether this link is a bill several people contribute to.
func (l *PayLink) IsSplit() bool { return l.Type == LinkSplit && l.TargetMinor > 0 }

// RemainingMinor is what is still owed on a split bill. PaidMinor is already
// net of refunds, so a refund reopens the balance by exactly that much.
func (l *PayLink) RemainingMinor() int64 {
	if !l.IsSplit() {
		return 0
	}
	remaining := l.TargetMinor - l.PaidMinor
	if remaining < 0 {
		return 0
	}
	return remaining
}

// EffectiveStatus folds expiry, use limits and a split bill's target into the
// stored status so callers never have to re-derive it.
func (l *PayLink) EffectiveStatus(now time.Time) LinkStatus {
	if l.Status == LinkPaused || l.Status == LinkCancelled {
		return l.Status
	}
	if l.ExpiresAt != nil && now.After(*l.ExpiresAt) {
		return LinkExpired
	}
	if l.IsSplit() && l.RemainingMinor() == 0 {
		return LinkSettled
	}
	if l.MaxUses != nil && l.PaidCount >= *l.MaxUses {
		return LinkLimitReached
	}
	return LinkActive
}

// Payable reports whether a new checkout may be started for this link.
func (l *PayLink) Payable(now time.Time) (bool, string) {
	switch l.EffectiveStatus(now) {
	case LinkActive:
		return true, ""
	case LinkPaused:
		return false, "This payment link is currently paused."
	case LinkCancelled:
		return false, "This payment link has been cancelled."
	case LinkExpired:
		return false, "This payment link has expired."
	case LinkSettled:
		return false, "This bill has been paid in full. Thank you."
	case LinkLimitReached:
		return false, "This payment link has reached its usage limit."
	}
	return false, "This payment link is not available."
}

// PayerChoosesAmount reports whether the payer enters their own amount.
func (l *PayLink) PayerChoosesAmount() bool {
	return l.Type == LinkDynamic || l.Type == LinkSplit
}

// PaymentMode decides what the gateway does when the payer confirms.
//
// Purchase takes the money there and then. Authorize only reserves it, leaving
// the merchant to capture later — in one go or in parts, which is what makes
// split settlement possible.
type PaymentMode string

const (
	ModePurchase  PaymentMode = "purchase"
	ModeAuthorize PaymentMode = "authorize"
)

func (m PaymentMode) Valid() bool { return m == ModePurchase || m == ModeAuthorize }

// GatewayOperation is the MPGS interaction.operation for this mode.
func (m PaymentMode) GatewayOperation() string {
	if m == ModeAuthorize {
		return "AUTHORIZE"
	}
	return "PURCHASE"
}

type PaymentStatus string

const (
	PaymentInitiated         PaymentStatus = "initiated"
	PaymentAuthorized        PaymentStatus = "authorized"
	PaymentPartiallyCaptured PaymentStatus = "partially_captured"
	PaymentPaid              PaymentStatus = "paid"
	PaymentPartiallyRefunded PaymentStatus = "partially_refunded"
	PaymentRefunded          PaymentStatus = "refunded"
	PaymentFailed            PaymentStatus = "failed"
	PaymentCancelled         PaymentStatus = "cancelled"
	PaymentExpired           PaymentStatus = "expired"
)

// Committed reports whether the payer has actually committed funds — used to
// decide whether an attempt consumes one of a link's permitted uses.
func (s PaymentStatus) Committed() bool {
	switch s {
	case PaymentAuthorized, PaymentPartiallyCaptured, PaymentPaid,
		PaymentPartiallyRefunded, PaymentRefunded:
		return true
	}
	return false
}

// InFlight reports whether the gateway may still change this on its own.
func (s PaymentStatus) InFlight() bool { return s == PaymentInitiated }

type OperationType string

const (
	OpCapture OperationType = "capture"
	OpRefund  OperationType = "refund"
	OpVoid    OperationType = "void"
)

func (t OperationType) Valid() bool {
	return t == OpCapture || t == OpRefund || t == OpVoid
}

// PaymentOperation is one capture, refund or void performed against a payment.
type PaymentOperation struct {
	ID            string        `json:"id"`
	PaymentID     string        `json:"paymentId"`
	TransactionID string        `json:"transactionId"`
	Type          OperationType `json:"type"`
	AmountMinor   int64         `json:"amountMinor"`
	Currency      string        `json:"currency"`
	Status        string        `json:"status"`
	GatewayCode   string        `json:"gatewayCode,omitempty"`
	Detail        string        `json:"detail,omitempty"`
	PerformedBy   string        `json:"performedBy,omitempty"`
	CreatedAt     time.Time     `json:"createdAt"`
}

type Payment struct {
	ID               string `json:"id"`
	PayLinkID        string `json:"payLinkId"`
	MerchantID       string `json:"merchantId"`
	OrderID          string `json:"orderId"`
	SessionID        string `json:"sessionId,omitempty"`
	SuccessIndicator string `json:"-"`
	// Copied from the link so a figure can be traced to the gateway that
	// produced it without a join, and so test money can never be added to real.
	Environment Environment `json:"environment"`
	AmountMinor int64       `json:"amountMinor"`
	Currency    string      `json:"currency"`
	// Running totals mirrored from the gateway.
	AuthorizedMinor int64         `json:"authorizedMinor"`
	CapturedMinor   int64         `json:"capturedMinor"`
	RefundedMinor   int64         `json:"refundedMinor"`
	Status          PaymentStatus `json:"status"`
	GatewayResult   string        `json:"gatewayResult,omitempty"`
	GatewayStatus   string        `json:"gatewayStatus,omitempty"`
	// Identifiers this payment is known by outside our system: the gateway
	// receipt, the issuer's approval code, and the acquirer's own reference and
	// settlement date. These are what gets quoted when reconciling a statement
	// or answering a dispute.
	GatewayReceipt    string     `json:"gatewayReceipt,omitempty"`
	AuthorizationCode string     `json:"authorizationCode,omitempty"`
	AcquirerReference string     `json:"acquirerReference,omitempty"`
	SettlementDate    string     `json:"settlementDate,omitempty"`
	CustomerName      string     `json:"customerName,omitempty"`
	CustomerEmail     string     `json:"customerEmail,omitempty"`
	CardBrand         string     `json:"cardBrand,omitempty"`
	CardLast4         string     `json:"cardLast4,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	CompletedAt       *time.Time `json:"completedAt,omitempty"`

	// Joined for presentation.
	LinkTitle string `json:"linkTitle,omitempty"`
	CreatedBy string `json:"createdBy,omitempty"`
}

// CapturableMinor is what may still be captured against an authorization.
func (p *Payment) CapturableMinor() int64 {
	remaining := p.AuthorizedMinor - p.CapturedMinor
	if remaining < 0 {
		return 0
	}
	return remaining
}

// RefundableMinor is what may still be refunded from captured funds.
func (p *Payment) RefundableMinor() int64 {
	remaining := p.CapturedMinor - p.RefundedMinor
	if remaining < 0 {
		return 0
	}
	return remaining
}

// NetMinor is what the merchant actually keeps.
func (p *Payment) NetMinor() int64 { return p.CapturedMinor - p.RefundedMinor }

// CanCapture reports whether funds are reserved and not yet fully taken.
func (p *Payment) CanCapture() bool {
	switch p.Status {
	case PaymentAuthorized, PaymentPartiallyCaptured:
		return p.CapturableMinor() > 0
	}
	return false
}

// CanVoid reports whether an authorization can still be released untouched.
// Once any of it is captured the remainder is released by capturing less, not
// by voiding, so this is deliberately limited to a clean authorization.
func (p *Payment) CanVoid() bool { return p.Status == PaymentAuthorized && p.CapturedMinor == 0 }

func (p *Payment) CanRefund() bool { return p.RefundableMinor() > 0 }

type ShareChannel string

const (
	ShareEmail    ShareChannel = "email"
	ShareSMS      ShareChannel = "sms"
	ShareWhatsApp ShareChannel = "whatsapp"
	ShareCopy     ShareChannel = "copy"
	ShareQR       ShareChannel = "qr"
	ShareOther    ShareChannel = "other"
)

func (c ShareChannel) Valid() bool {
	switch c {
	case ShareEmail, ShareSMS, ShareWhatsApp, ShareCopy, ShareQR, ShareOther:
		return true
	}
	return false
}

type LinkShare struct {
	ID          string       `json:"id"`
	PayLinkID   string       `json:"payLinkId"`
	Channel     ShareChannel `json:"channel"`
	Destination string       `json:"destination,omitempty"`
	SharedByID  string       `json:"sharedById"`
	CreatedAt   time.Time    `json:"createdAt"`
}

// MPGSMerchant is one entry in the register kept by merchant management: the
// merchant number issued by the gateway, and the name that number trades under.
//
// It is the single source of truth for who a payment was made to. Operators
// register against a number rather than typing a name, so two operators on the
// same merchant can never disagree about what appears on a receipt.
type MPGSMerchant struct {
	Number string `json:"number"`
	Name   string `json:"name"`
	// LiveNumber is set only when the acquirer issues a different merchant
	// number for production. Empty means the same number serves both.
	LiveNumber string    `json:"liveNumber,omitempty"`
	CreatedBy  string    `json:"createdBy,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

// NumberFor returns the merchant number to authenticate with in an environment.
func (m *MPGSMerchant) NumberFor(env Environment) string {
	if env.IsLive() && m.LiveNumber != "" {
		return m.LiveNumber
	}
	return m.Number
}

// SecurityQuestion is one recovery challenge and the hash of its answer.
//
// The answer is never stored or returned in a readable form: people reuse the
// same answers across services, so a leak here would be a leak everywhere.
type SecurityQuestion struct {
	Position   int    `json:"position"`
	Prompt     string `json:"prompt"`
	AnswerHash string `json:"-"`
}

// RecoveryPrompts is the fixed set operators choose from.
//
// Deliberately no free-text question. A custom prompt would be more resistant
// to research, but it would also make an account identifiable: the decoy
// prompts shown for an unknown username are drawn from this list, and a custom
// one would stand out and confirm the account exists.
//
// The wording avoids anything a stranger can look up — no mother's maiden name,
// no birthplace, no school.
var RecoveryPrompts = []string{
	"What was your childhood nickname?",
	"What was the name of the street you lived on aged ten?",
	"What was the first concert or public event you attended?",
	"What was the make and model of your first vehicle?",
	"What is the first name of your oldest cousin?",
	"What was the surname of your first manager?",
	"What was the title of the first film you saw at a cinema?",
	"Which city was your first flight to?",
	"What was the name of the shop nearest your childhood home?",
	"What did you want to be when you grew up, aged seven?",
}

// RequiredSecurityQuestions is how many must be set, and how many must be
// answered correctly to recover. Answers carry little entropy individually;
// requiring all three is what makes guessing impractical.
const RequiredSecurityQuestions = 3

// ValidRecoveryPrompt reports whether a prompt is one this system offers.
func ValidRecoveryPrompt(prompt string) bool {
	for _, p := range RecoveryPrompts {
		if p == prompt {
			return true
		}
	}
	return false
}
