package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/mpgs"
	"github.com/zemenbank/paylink/api/internal/store"
)

// publicLinkView is what an anonymous payer is allowed to see. It deliberately
// omits internal ids, totals and anything about the operator.
type publicLinkView struct {
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Description  string `json:"description,omitempty"`
	Reference    string `json:"reference,omitempty"`
	MerchantName string `json:"merchantName"`
	BranchName   string `json:"branchName,omitempty"`
	Type         string `json:"type"`
	PaymentMode  string `json:"paymentMode"`
	// A payer must never be left thinking a rehearsal took their money, so the
	// pay page says so plainly when the link belongs to the test gateway.
	IsTest        bool   `json:"isTest"`
	Currency      string `json:"currency"`
	AmountMinor   int64  `json:"amountMinor"`
	AmountDisplay string `json:"amountDisplay"`
	MinMinor      int64  `json:"minMinor,omitempty"`
	MaxMinor      int64  `json:"maxMinor,omitempty"`
	Status        string `json:"status"`
	Payable       bool   `json:"payable"`
	Unavailable   string `json:"unavailable,omitempty"`
	ExpiresAt     string `json:"expiresAt,omitempty"`

	// Split bills show progress toward the total. Contributor names are
	// deliberately not published — anyone holding the link would see them —
	// so the payer gets the count and the amounts only.
	// No omitempty on the numbers: zero is a meaningful answer here (nothing
	// paid yet, nothing left), and omitting it reads as "unknown" to a client.
	IsSplit          bool   `json:"isSplit"`
	TargetMinor      int64  `json:"targetMinor"`
	TargetDisplay    string `json:"targetDisplay,omitempty"`
	PaidMinor        int64  `json:"paidMinor"`
	PaidDisplay      string `json:"paidDisplay,omitempty"`
	RemainingMinor   int64  `json:"remainingMinor"`
	RemainingDisplay string `json:"remainingDisplay,omitempty"`
	PercentPaid      int    `json:"percentPaid"`
	ContributorCount int    `json:"contributorCount"`
}

func (s *Server) publicLinkView(l *domain.PayLink) publicLinkView {
	now := time.Now().UTC()
	payable, reason := l.Payable(now)

	amountDisplay := "Enter amount"
	if l.Type == domain.LinkStatic {
		amountDisplay = money.Display(l.AmountMinor, l.Currency)
	}
	view := publicLinkView{
		Slug:          l.Slug,
		Title:         l.Title,
		Description:   l.Description,
		Reference:     l.Reference,
		MerchantName:  l.MerchantName,
		BranchName:    l.BranchName,
		Type:          string(l.Type),
		PaymentMode:   string(l.PaymentMode),
		IsTest:        !l.Environment.IsLive(),
		Currency:      l.Currency,
		AmountMinor:   l.AmountMinor,
		AmountDisplay: amountDisplay,
		MinMinor:      l.MinMinor,
		MaxMinor:      l.MaxMinor,
		Status:        string(l.EffectiveStatus(now)),
		Payable:       payable,
		Unavailable:   reason,
	}
	if l.ExpiresAt != nil {
		view.ExpiresAt = l.ExpiresAt.Format(time.RFC3339)
	}

	if l.IsSplit() {
		remaining := l.RemainingMinor()
		view.IsSplit = true
		view.TargetMinor = l.TargetMinor
		view.TargetDisplay = money.Display(l.TargetMinor, l.Currency)
		view.PaidMinor = l.PaidMinor
		view.PaidDisplay = money.Display(l.PaidMinor, l.Currency)
		view.RemainingMinor = remaining
		view.RemainingDisplay = money.Display(remaining, l.Currency)
		view.AmountDisplay = money.Display(remaining, l.Currency)
		if l.TargetMinor > 0 {
			view.PercentPaid = int(min(100, l.PaidMinor*100/l.TargetMinor))
		}
		if contributors, err := s.store.ContributorsForLink(l.ID); err == nil {
			view.ContributorCount = len(contributors)
		}
	}
	return view
}

func (s *Server) handlePublicLink(w http.ResponseWriter, r *http.Request) {
	link, err := s.store.LinkBySlug(r.PathValue("slug"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "This payment link does not exist.")
		return
	}
	httpx.JSON(w, http.StatusOK, s.publicLinkView(link))
}

type checkoutRequest struct {
	// Amount is only read when the payer chooses their own.
	Amount string `json:"amount"`
	// Optional self-identification. Hosted Checkout never asks for a name, so
	// without this a split bill's contributors are all anonymous.
	CustomerName  string `json:"customerName"`
	CustomerEmail string `json:"customerEmail"`
}

type checkoutResponse struct {
	OrderID          string `json:"orderId"`
	SessionID        string `json:"sessionId"`
	SessionVersion   string `json:"sessionVersion"`
	SuccessIndicator string `json:"successIndicator"`
	GatewayHost      string `json:"gatewayHost"`
	CheckoutScript   string `json:"checkoutScript"`
	AmountDisplay    string `json:"amountDisplay"`
	Currency         string `json:"currency"`
	MerchantName     string `json:"merchantName"`
	ReturnURL        string `json:"returnUrl"`
}

// handlePublicCheckout opens a Hosted Checkout session for one payment attempt.
//
// The session is created per attempt rather than per link: gateway sessions are
// short-lived, while a link may stay valid for weeks and be paid many times.
// The credentials used are those of the operator who created the link.
func (s *Server) handlePublicCheckout(w http.ResponseWriter, r *http.Request) {
	// Each attempt opens a session at the gateway, which is a real cost on an
	// endpoint no sign-in guards. A payer retrying two or three times is
	// normal; a script running through slugs is not.
	if !rateLimit(s.checkoutLimit, "checkout:"+s.clientIP(r), w,
		"Too many payment attempts. Wait a moment and try again.") {
		return
	}

	link, err := s.store.LinkBySlug(r.PathValue("slug"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "This payment link does not exist.")
		return
	}

	if payable, reason := link.Payable(time.Now().UTC()); !payable {
		httpx.ErrorCode(w, http.StatusConflict, "link_unavailable", reason)
		return
	}

	var req checkoutRequest
	if r.ContentLength > 0 && !httpx.Decode(w, r, &req) {
		return
	}

	amountMinor := link.AmountMinor
	if link.PayerChoosesAmount() {
		parsed, err := money.Parse(req.Amount, link.Currency)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		if parsed <= 0 {
			httpx.Error(w, http.StatusBadRequest, "Enter an amount greater than zero.")
			return
		}
		if link.MinMinor > 0 && parsed < link.MinMinor {
			httpx.Error(w, http.StatusBadRequest,
				"The minimum for this payment is "+money.Display(link.MinMinor, link.Currency)+".")
			return
		}
		if link.MaxMinor > 0 && parsed > link.MaxMinor {
			httpx.Error(w, http.StatusBadRequest,
				"The maximum for this payment is "+money.Display(link.MaxMinor, link.Currency)+".")
			return
		}
		// Nobody may pay more than the bill still owes. Contributions in flight
		// are not reserved, so the last two payers can race — the loser is told
		// what is actually left rather than being allowed to overpay.
		if link.IsSplit() {
			remaining := link.RemainingMinor()
			if parsed > remaining {
				httpx.ErrorCode(w, http.StatusBadRequest, "exceeds_remaining",
					"Only "+money.Display(remaining, link.Currency)+" is left to pay on this bill.")
				return
			}
		}
		amountMinor = parsed
	}
	if amountMinor <= 0 {
		httpx.Error(w, http.StatusConflict, "This payment link has no amount configured.")
		return
	}

	creds, err := s.gatewayCredentialsFor(link.CreatedByID, link.Environment)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			slog.Warn("pay link has no gateway credentials", "link", link.ID, "operator", link.CreatedByID)
			httpx.ErrorCode(w, http.StatusConflict, "gateway_unavailable",
				"This payment link is not ready to accept payments yet. Please contact the merchant.")
			return
		}
		slog.Error("could not load gateway credentials", "link", link.ID, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Payments are temporarily unavailable.")
		return
	}

	// Order ids must be unique per merchant and are what we reconcile against.
	orderID := fmt.Sprintf("%s-%s", link.ID, store.NewSlug(8))
	returnURL := fmt.Sprintf("%s/l/%s/return?order=%s", s.cfg.PublicBaseURL, link.Slug, orderID)

	description := link.Title
	if link.Reference != "" {
		description = fmt.Sprintf("%s (%s)", link.Title, link.Reference)
	}

	session, err := s.gateway.InitiateCheckout(r.Context(), creds, mpgs.CheckoutRequest{
		OrderID:       orderID,
		Amount:        money.Format(amountMinor, link.Currency),
		Currency:      link.Currency,
		Description:   description,
		ReturnURL:     returnURL,
		MerchantURL:   s.cfg.PublicBaseURL,
		Operation:     link.PaymentMode.GatewayOperation(),
		CustomerName:  strings.TrimSpace(req.CustomerName),
		CustomerEmail: strings.TrimSpace(req.CustomerEmail),
	})
	if err != nil {
		var gwErr *mpgs.Error
		if errors.As(err, &gwErr) {
			slog.Error("checkout rejected by gateway", "link", link.ID, "cause", gwErr.Cause, "explanation", gwErr.Explanation)
			if gwErr.Unauthorized() {
				httpx.ErrorCode(w, http.StatusConflict, "gateway_unavailable",
					"This payment link is not ready to accept payments yet. Please contact the merchant.")
				return
			}
			httpx.ErrorCode(w, http.StatusBadGateway, "gateway_error", gwErr.Error())
			return
		}
		slog.Error("checkout failed", "link", link.ID, "error", err)
		httpx.Error(w, http.StatusBadGateway, "Could not reach the payment gateway. Please try again.")
		return
	}

	payment := &domain.Payment{
		PayLinkID:        link.ID,
		MerchantID:       link.MerchantID,
		OrderID:          orderID,
		SessionID:        session.SessionID,
		SuccessIndicator: session.SuccessIndicator,
		Environment:      link.Environment,
		AmountMinor:      amountMinor,
		Currency:         link.Currency,
		Status:           domain.PaymentInitiated,
		CustomerName:     strings.TrimSpace(req.CustomerName),
		CustomerEmail:    strings.TrimSpace(req.CustomerEmail),
	}
	if err := s.store.CreatePayment(payment); err != nil {
		slog.Error("could not record payment attempt", "order", orderID, "error", err)
		httpx.Error(w, http.StatusInternalServerError, "Could not start the payment.")
		return
	}
	_ = s.store.IncrementLinkUse(link.ID)

	httpx.JSON(w, http.StatusCreated, checkoutResponse{
		OrderID:          orderID,
		SessionID:        session.SessionID,
		SessionVersion:   session.SessionVersion,
		SuccessIndicator: session.SuccessIndicator,
		GatewayHost:      creds.Host,
		CheckoutScript:   mpgs.CheckoutScriptURL(creds.Host),
		AmountDisplay:    money.Display(amountMinor, link.Currency),
		Currency:         link.Currency,
		MerchantName:     creds.MerchantName,
		ReturnURL:        returnURL,
	})
}

type paymentStatusView struct {
	OrderID       string `json:"orderId"`
	Status        string `json:"status"`
	AmountDisplay string `json:"amountDisplay"`
	Currency      string `json:"currency"`
	LinkTitle     string `json:"linkTitle"`
	MerchantName  string `json:"merchantName"`
	CardBrand     string `json:"cardBrand,omitempty"`
	CardLast4     string `json:"cardLast4,omitempty"`
	GatewayStatus string `json:"gatewayStatus,omitempty"`
	CompletedAt   string `json:"completedAt,omitempty"`
	Receipt       string `json:"receipt,omitempty"`
}

// handlePublicPaymentStatus reconciles an attempt with the gateway. The
// browser's redirect parameters are advisory; RETRIEVE ORDER is the source of
// truth, so this is what decides whether a link counts a payment.
func (s *Server) handlePublicPaymentStatus(w http.ResponseWriter, r *http.Request) {
	payment, err := s.store.PaymentByOrderID(r.PathValue("orderId"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "That payment could not be found.")
		return
	}
	link, err := s.store.LinkByID(payment.PayLinkID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "That payment could not be found.")
		return
	}

	// Only ask the gateway while the attempt is still open.
	if payment.Status == domain.PaymentInitiated {
		if creds, credErr := s.gatewayCredentialsFor(link.CreatedByID, link.Environment); credErr == nil {
			order, orderErr := s.gateway.RetrieveOrder(r.Context(), creds, payment.OrderID)
			switch {
			case orderErr == nil:
				s.applyOrderOutcome(payment, link, order)
			default:
				var gwErr *mpgs.Error
				// A 400 here means the order was never created at the gateway,
				// i.e. the payer abandoned checkout. That is not an error.
				if errors.As(orderErr, &gwErr) && gwErr.StatusCode == http.StatusBadRequest {
					slog.Debug("order not yet at gateway", "order", payment.OrderID)
				} else {
					slog.Error("could not retrieve order", "order", payment.OrderID, "error", orderErr)
				}
			}
		}
	}

	view := paymentStatusView{
		OrderID:       payment.OrderID,
		Status:        string(payment.Status),
		AmountDisplay: money.Display(payment.AmountMinor, payment.Currency),
		Currency:      payment.Currency,
		LinkTitle:     link.Title,
		MerchantName:  link.MerchantName,
		CardBrand:     payment.CardBrand,
		CardLast4:     payment.CardLast4,
		GatewayStatus: payment.GatewayStatus,
		Receipt:       payment.ID,
	}
	if payment.CompletedAt != nil {
		view.CompletedAt = payment.CompletedAt.Format(time.RFC3339)
	}
	httpx.JSON(w, http.StatusOK, view)
}

// statusFromOrder maps the gateway's order status onto ours. Anything we do not
// recognise leaves the payment untouched rather than guessing.
func statusFromOrder(order *mpgs.Order) (domain.PaymentStatus, bool) {
	switch strings.ToUpper(order.Status) {
	case "AUTHORIZED":
		return domain.PaymentAuthorized, true
	case "PARTIALLY_CAPTURED":
		return domain.PaymentPartiallyCaptured, true
	case "CAPTURED", "DISBURSED":
		return domain.PaymentPaid, true
	case "PARTIALLY_REFUNDED":
		return domain.PaymentPartiallyRefunded, true
	case "REFUNDED":
		return domain.PaymentRefunded, true
	case "FAILED":
		return domain.PaymentFailed, true
	case "CANCELLED", "VOIDED":
		return domain.PaymentCancelled, true
	case "EXPIRED":
		return domain.PaymentExpired, true
	}
	return "", false
}

// applyOrderOutcome mirrors a retrieved order onto our record and re-derives the
// link's totals.
//
// The amounts come straight from the gateway rather than being accumulated
// locally, so a capture or refund made elsewhere — in Merchant Administration,
// say — still lands here correctly, and replaying this is harmless.
func (s *Server) applyOrderOutcome(payment *domain.Payment, link *domain.PayLink, order *mpgs.Order) {
	status, known := statusFromOrder(order)
	if !known {
		return
	}

	exp := money.Exponent(payment.Currency)
	payment.Status = status
	payment.AuthorizedMinor = mpgs.MinorUnits(order.TotalAuthorizedAmount, exp)
	payment.CapturedMinor = mpgs.MinorUnits(order.TotalCapturedAmount, exp)
	payment.RefundedMinor = mpgs.MinorUnits(order.TotalRefundedAmount, exp)
	payment.GatewayResult = order.Result
	payment.GatewayStatus = order.Status

	// References only exist once the gateway has a transaction; keep whatever we
	// already hold rather than blanking it on a later read.
	if refs := order.References(); refs.Receipt != "" || refs.AuthorizationCode != "" {
		if refs.Receipt != "" {
			payment.GatewayReceipt = refs.Receipt
		}
		if refs.AuthorizationCode != "" {
			payment.AuthorizationCode = refs.AuthorizationCode
		}
		if refs.AcquirerReference != "" {
			payment.AcquirerReference = refs.AcquirerReference
		}
		if refs.SettlementDate != "" {
			payment.SettlementDate = refs.SettlementDate
		}
	}

	if name := order.CustomerName(); name != "" {
		payment.CustomerName = name
	}
	if order.Customer.Email != "" {
		payment.CustomerEmail = order.Customer.Email
	}
	if brand, last4 := order.CardDetails(); brand != "" || last4 != "" {
		payment.CardBrand, payment.CardLast4 = brand, last4
	}
	// An authorization is not finished business, so it has no completion time.
	if status != domain.PaymentAuthorized && payment.CompletedAt == nil {
		now := time.Now().UTC()
		payment.CompletedAt = &now
	}

	if err := s.store.UpdatePaymentOutcome(payment); err != nil {
		slog.Error("could not record payment outcome", "order", payment.OrderID, "error", err)
		return
	}
	if err := s.store.RecomputeLinkTotals(link.ID); err != nil {
		slog.Error("could not update link totals", "link", link.ID, "error", err)
	}
	// Tell the system that asked for this link what became of it. Queued, not
	// sent: the payer is already gone, and whether their platform happened to
	// be reachable at this instant is not something to make anyone wait for.
	// A no-op for a link created in the portal, which is most of them.
	s.Notify(payment)
}
