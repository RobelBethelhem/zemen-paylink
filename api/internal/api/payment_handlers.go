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
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/mpgs"
)

// paymentDetail is the full picture of one payment: where the money stands and
// every operation performed against it.
type paymentDetail struct {
	paymentView
	AuthorizedDisplay string          `json:"authorizedDisplay"`
	CapturedDisplay   string          `json:"capturedDisplay"`
	RefundedDisplay   string          `json:"refundedDisplay"`
	NetDisplay        string          `json:"netDisplay"`
	CapturableMinor   int64           `json:"capturableMinor"`
	CapturableDisplay string          `json:"capturableDisplay"`
	RefundableMinor   int64           `json:"refundableMinor"`
	RefundableDisplay string          `json:"refundableDisplay"`
	CanCapture        bool            `json:"canCapture"`
	CanRefund         bool            `json:"canRefund"`
	CanVoid           bool            `json:"canVoid"`
	Operations        []operationView `json:"operations"`
	Link              *linkReference  `json:"link,omitempty"`
}

type linkReference struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	PaymentMode string `json:"paymentMode"`
}

type operationView struct {
	*domain.PaymentOperation
	AmountDisplay string `json:"amountDisplay"`
	At            string `json:"at"`
}

func (s *Server) paymentDetail(p *domain.Payment, link *domain.PayLink) paymentDetail {
	ops, err := s.store.OperationsForPayment(p.ID)
	if err != nil {
		slog.Error("could not load payment operations", "payment", p.ID, "error", err)
	}
	views := make([]operationView, 0, len(ops))
	for _, op := range ops {
		views = append(views, operationView{
			PaymentOperation: op,
			AmountDisplay:    money.Display(op.AmountMinor, op.Currency),
			At:               op.CreatedAt.Format("02 Jan 2006 15:04"),
		})
	}

	detail := paymentDetail{
		paymentView:       s.paymentViews([]*domain.Payment{p})[0],
		AuthorizedDisplay: money.Display(p.AuthorizedMinor, p.Currency),
		CapturedDisplay:   money.Display(p.CapturedMinor, p.Currency),
		RefundedDisplay:   money.Display(p.RefundedMinor, p.Currency),
		NetDisplay:        money.Display(p.NetMinor(), p.Currency),
		CapturableMinor:   p.CapturableMinor(),
		CapturableDisplay: money.Display(p.CapturableMinor(), p.Currency),
		RefundableMinor:   p.RefundableMinor(),
		RefundableDisplay: money.Display(p.RefundableMinor(), p.Currency),
		CanCapture:        p.CanCapture(),
		CanRefund:         p.CanRefund(),
		CanVoid:           p.CanVoid(),
		Operations:        views,
	}
	if link != nil {
		detail.Link = &linkReference{ID: link.ID, Title: link.Title, PaymentMode: string(link.PaymentMode)}
	}
	return detail
}

// loadPaymentForUser resolves a payment the caller is allowed to act on.
func (s *Server) loadPaymentForUser(
	w http.ResponseWriter, r *http.Request,
) (*domain.Payment, *domain.PayLink, bool) {
	user, _ := auth.UserFrom(r.Context())

	payment, err := s.store.PaymentByOrderID(r.PathValue("orderId"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "That payment could not be found.")
		return nil, nil, false
	}
	link, err := s.store.LinkByID(payment.PayLinkID)
	if err != nil || !canAccessLink(user, link) {
		httpx.Error(w, http.StatusNotFound, "That payment could not be found.")
		return nil, nil, false
	}
	return payment, link, true
}

func (s *Server) handleGetPayment(w http.ResponseWriter, r *http.Request) {
	payment, link, ok := s.loadPaymentForUser(w, r)
	if !ok {
		return
	}
	// Refresh in-flight attempts so the actions offered match reality, and pick
	// up gateway references we have not recorded yet.
	if payment.Status.InFlight() || payment.GatewayReceipt == "" {
		s.reconcilePending(r.Context(), []*domain.Payment{payment})
		if refreshed, err := s.store.PaymentByOrderID(payment.OrderID); err == nil {
			payment = refreshed
		}
	}
	httpx.JSON(w, http.StatusOK, s.paymentDetail(payment, link))
}

type amountRequest struct {
	// Amount is optional: omitted means the whole remaining balance.
	Amount string `json:"amount"`
}

// resolveAmount turns an optional request amount into minor units, defaulting to
// the full remaining balance and refusing anything above it.
func resolveAmount(raw string, remaining int64, currency, verb string) (int64, error) {
	if strings.TrimSpace(raw) == "" {
		return remaining, nil
	}
	amount, err := money.Parse(raw, currency)
	if err != nil {
		return 0, err
	}
	if amount <= 0 {
		return 0, errors.New("Enter an amount greater than zero.")
	}
	if amount > remaining {
		return 0, errors.New("You can " + verb + " at most " + money.Display(remaining, currency) + ".")
	}
	return amount, nil
}

// perform runs one money operation end to end.
//
// The remaining balance is taken from the gateway immediately beforehand rather
// than from our own record, so a duplicate submission — or a capture someone
// made in Merchant Administration — is caught here instead of moving money
// twice. MPGS also enforces this itself; this makes the failure legible.
func (s *Server) perform(
	w http.ResponseWriter, r *http.Request,
	opType domain.OperationType,
) {
	user, _ := auth.UserFrom(r.Context())

	// Moving money is the most damaging thing a stolen session can do, so it
	// gets its own budget rather than sharing the general one. Well above what
	// partial captures on a busy afternoon need; well below a scripted burst.
	if !rateLimit(s.moneyLimit, "money:"+user.ID, w,
		"Too many payment operations in a short time. Wait a moment and try again.") {
		return
	}

	payment, link, ok := s.loadPaymentForUser(w, r)
	if !ok {
		return
	}

	var req amountRequest
	if r.ContentLength > 0 && !httpx.Decode(w, r, &req) {
		return
	}

	creds, err := s.gatewayCredentialsFor(link.CreatedByID, link.Environment)
	if err != nil {
		httpx.ErrorCode(w, http.StatusConflict, "gateway_unavailable",
			"The gateway credentials for this link are no longer available.")
		return
	}

	// Re-read the order so decisions are made on the gateway's numbers.
	order, err := s.gateway.RetrieveOrder(r.Context(), creds, payment.OrderID)
	if err != nil {
		s.writeGatewayError(w, err, "Could not reach the payment gateway.")
		return
	}
	s.applyOrderOutcome(payment, link, order)
	if refreshed, err := s.store.PaymentByOrderID(payment.OrderID); err == nil {
		payment = refreshed
	}

	var amount int64
	switch opType {
	case domain.OpCapture:
		if !payment.CanCapture() {
			httpx.Error(w, http.StatusConflict, "There are no reserved funds left to capture on this payment.")
			return
		}
		amount, err = resolveAmount(req.Amount, payment.CapturableMinor(), payment.Currency, "capture")
	case domain.OpRefund:
		if !payment.CanRefund() {
			httpx.Error(w, http.StatusConflict, "There is nothing left to refund on this payment.")
			return
		}
		amount, err = resolveAmount(req.Amount, payment.RefundableMinor(), payment.Currency, "refund")
	case domain.OpVoid:
		if !payment.CanVoid() {
			httpx.Error(w, http.StatusConflict,
				"Only an authorization with nothing captured can be voided. Refund the captured amount instead.")
			return
		}
		amount = payment.AuthorizedMinor
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	transactionID, err := s.store.NextTransactionID(payment.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not start the operation.")
		return
	}

	formatted := money.Format(amount, payment.Currency)
	var result *mpgs.Order
	switch opType {
	case domain.OpCapture:
		result, err = s.gateway.Capture(r.Context(), creds, payment.OrderID, transactionID, formatted, payment.Currency)
	case domain.OpRefund:
		result, err = s.gateway.Refund(r.Context(), creds, payment.OrderID, transactionID, formatted, payment.Currency)
	case domain.OpVoid:
		result, err = s.gateway.Void(r.Context(), creds, payment.OrderID, transactionID, "1")
	}

	// Record the attempt either way — a failed capture is worth seeing.
	op := &domain.PaymentOperation{
		PaymentID:     payment.ID,
		TransactionID: transactionID,
		Type:          opType,
		AmountMinor:   amount,
		Currency:      payment.Currency,
		PerformedBy:   user.FullName,
		CreatedAt:     time.Now().UTC(),
	}
	if err != nil {
		op.Status = "failed"
		var gwErr *mpgs.Error
		if errors.As(err, &gwErr) {
			op.Detail = gwErr.Error()
			op.GatewayCode = gwErr.Cause
		} else {
			op.Detail = err.Error()
		}
		if recErr := s.store.CreatePaymentOperation(op); recErr != nil {
			slog.Error("could not record failed operation", "payment", payment.ID, "error", recErr)
		}
		slog.Error("gateway operation failed",
			"type", opType, "order", payment.OrderID, "amount", formatted, "error", err)
		s.writeGatewayError(w, err, "The gateway could not complete this operation.")
		return
	}

	op.Status = "success"
	op.GatewayCode = result.GatewayCode
	if err := s.store.CreatePaymentOperation(op); err != nil {
		slog.Error("could not record operation", "payment", payment.ID, "error", err)
	}

	s.applyOrderOutcome(payment, link, result)
	updated, err := s.store.PaymentByOrderID(payment.OrderID)
	if err != nil {
		updated = payment
	}
	refreshedLink, err := s.store.LinkByID(link.ID)
	if err != nil {
		refreshedLink = link
	}

	slog.Info("gateway operation completed",
		"type", opType, "order", payment.OrderID,
		"amount", formatted, "by", user.ID, "orderStatus", result.Status)

	httpx.JSON(w, http.StatusOK, s.paymentDetail(updated, refreshedLink))
}

// writeGatewayError surfaces the gateway's own explanation where there is one.
func (s *Server) writeGatewayError(w http.ResponseWriter, err error, fallback string) {
	var gwErr *mpgs.Error
	if errors.As(err, &gwErr) {
		status := http.StatusBadGateway
		if gwErr.StatusCode == http.StatusBadRequest {
			status = http.StatusBadRequest
		}
		httpx.ErrorCode(w, status, "gateway_error", gwErr.Error())
		return
	}
	httpx.Error(w, http.StatusBadGateway, fallback)
}

func (s *Server) handleCapture(w http.ResponseWriter, r *http.Request) {
	s.perform(w, r, domain.OpCapture)
}

func (s *Server) handleRefund(w http.ResponseWriter, r *http.Request) {
	s.perform(w, r, domain.OpRefund)
}

func (s *Server) handleVoid(w http.ResponseWriter, r *http.Request) {
	s.perform(w, r, domain.OpVoid)
}
