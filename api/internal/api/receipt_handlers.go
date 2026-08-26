package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/money"
)

// A receipt is the payer's proof of what happened to their money, so it is
// keyed on the order id they already hold from the return URL — the same
// capability that opens the status endpoint, no wider.
//
// It is deliberately not a "payment confirmation": an authorization that has
// not been captured says so, and a refund appears on the same document rather
// than leaving a receipt in the customer's hands that overstates what was
// taken.

type receiptEntry struct {
	Label  string `json:"label"`
	Amount string `json:"amount"`
	At     string `json:"at"`
	Note   string `json:"note,omitempty"`
}

type receiptView struct {
	Number   string `json:"number"`
	OrderID  string `json:"orderId"`
	IssuedAt string `json:"issuedAt"`

	// What actually happened, in the payer's terms.
	Status      string `json:"status"`
	Headline    string `json:"headline"`
	Explanation string `json:"explanation"`
	// Settled is false when nothing has left the cardholder's account.
	Settled bool `json:"settled"`

	Currency string `json:"currency"`
	// AmountDisplay is what the payer agreed to; NetDisplay is what they are
	// actually out of pocket once captures and refunds are accounted for.
	AmountDisplay     string `json:"amountDisplay"`
	AuthorizedDisplay string `json:"authorizedDisplay,omitempty"`
	CapturedDisplay   string `json:"capturedDisplay,omitempty"`
	RefundedDisplay   string `json:"refundedDisplay,omitempty"`
	NetDisplay        string `json:"netDisplay"`

	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Reference   string `json:"reference,omitempty"`

	MerchantName string `json:"merchantName"`

	CustomerName  string `json:"customerName,omitempty"`
	CustomerEmail string `json:"customerEmail,omitempty"`
	CardBrand     string `json:"cardBrand,omitempty"`
	CardLast4     string `json:"cardLast4,omitempty"`

	// What to quote when reconciling a statement or raising a dispute.
	GatewayReceipt    string `json:"gatewayReceipt,omitempty"`
	AuthorizationCode string `json:"authorizationCode,omitempty"`
	AcquirerReference string `json:"acquirerReference,omitempty"`
	SettlementDate    string `json:"settlementDate,omitempty"`

	PaidAt string `json:"paidAt,omitempty"`

	// A contribution to a split bill means little without the bill it went to.
	IsSplit          bool   `json:"isSplit"`
	BillTotalDisplay string `json:"billTotalDisplay,omitempty"`

	Entries []receiptEntry `json:"entries"`

	// A test receipt must never be presentable as proof of a real payment.
	IsTest bool `json:"isTest"`
}

// outcome puts the payment's state into words a cardholder can act on.
func outcome(p *domain.Payment) (headline, explanation string, settled bool) {
	switch p.Status {
	case domain.PaymentPaid:
		return "Paid in full", "", true

	case domain.PaymentAuthorized:
		return "Reserved — not yet charged",
			"This amount is being held on your card. It has not been taken, and it is released if the merchant does not complete the payment.",
			false

	case domain.PaymentPartiallyCaptured:
		return "Partly charged",
			"Part of the amount reserved on your card has been taken. The remainder is still held and may be taken or released later.",
			true

	case domain.PaymentPartiallyRefunded:
		return "Partly refunded",
			"Some of this payment has been returned to your card. Refunds usually appear on a statement within a few working days.",
			true

	case domain.PaymentRefunded:
		return "Refunded in full",
			"The whole amount has been returned to your card. It usually appears on a statement within a few working days.",
			false
	}
	return "", "", false
}

func (s *Server) handlePublicReceipt(w http.ResponseWriter, r *http.Request) {
	payment, err := s.store.PaymentByOrderID(r.PathValue("orderId"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "That receipt could not be found.")
		return
	}
	link, err := s.store.LinkByID(payment.PayLinkID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "That receipt could not be found.")
		return
	}

	// An attempt still in flight, or one that carries no gateway references
	// yet, is worth one look at the gateway before we answer.
	if payment.Status.InFlight() || payment.GatewayReceipt == "" {
		s.reconcilePending(r.Context(), []*domain.Payment{payment})
		if refreshed, err := s.store.PaymentByOrderID(payment.OrderID); err == nil {
			payment = refreshed
		}
	}

	headline, explanation, settled := outcome(payment)
	if headline == "" {
		// Nothing happened to this card, so there is nothing to receipt. Saying
		// so is better than issuing a document that implies otherwise.
		httpx.ErrorCode(w, http.StatusConflict, "no_receipt",
			"This payment was not completed, so there is no receipt for it.")
		return
	}

	// The gateway's own receipt number is what the merchant and the bank can
	// both look the payment up by; our order id is the fallback.
	number := payment.GatewayReceipt
	if number == "" {
		number = payment.OrderID
	}

	// Who the payer paid comes from the merchant register — the number and name
	// merchant management onboarded — not from our workspace record and not
	// from anything an operator typed. It is also the name we send as
	// `merchant.name`, so it matches what the payer saw on the Mastercard
	// checkout page; a receipt naming someone else invites a "who is this?"
	// call to the bank.
	//
	// MPGS itself has no API for the name: every gateway response identifies a
	// merchant by number alone.
	merchantName := link.MerchantName
	if operator, err := s.store.UserByID(link.CreatedByID); err == nil {
		if m, err := s.store.MPGSMerchantByNumber(operator.MPGSMerchantNumber); err == nil {
			merchantName = m.Name
		}
	}
	if creds, err := s.store.GatewayCredentialFor(link.CreatedByID, link.Environment); err == nil {
		// Falls back to the profile the payment actually went through, for a
		// link created before the register existed.
		if name := strings.TrimSpace(creds.MerchantName); name != "" && merchantName == link.MerchantName {
			merchantName = name
		}
	}

	view := receiptView{
		Number:            number,
		OrderID:           payment.OrderID,
		IssuedAt:          time.Now().UTC().Format(time.RFC3339),
		Status:            string(payment.Status),
		Headline:          headline,
		Explanation:       explanation,
		Settled:           settled,
		Currency:          payment.Currency,
		AmountDisplay:     money.Display(payment.AmountMinor, payment.Currency),
		NetDisplay:        money.Display(payment.NetMinor(), payment.Currency),
		Title:             link.Title,
		Description:       link.Description,
		Reference:         link.Reference,
		MerchantName:      merchantName,
		CustomerName:      payment.CustomerName,
		CustomerEmail:     payment.CustomerEmail,
		CardBrand:         payment.CardBrand,
		CardLast4:         payment.CardLast4,
		GatewayReceipt:    payment.GatewayReceipt,
		AuthorizationCode: payment.AuthorizationCode,
		AcquirerReference: payment.AcquirerReference,
		SettlementDate:    payment.SettlementDate,
		IsTest:            !payment.Environment.IsLive(),
		Entries:           []receiptEntry{},
	}

	// Only show the running balances that carry information: on a plain
	// purchase they all repeat the amount.
	if payment.AuthorizedMinor > 0 && payment.AuthorizedMinor != payment.CapturedMinor {
		view.AuthorizedDisplay = money.Display(payment.AuthorizedMinor, payment.Currency)
	}
	if payment.CapturedMinor > 0 && payment.CapturedMinor != payment.AmountMinor {
		view.CapturedDisplay = money.Display(payment.CapturedMinor, payment.Currency)
	}
	if payment.RefundedMinor > 0 {
		view.RefundedDisplay = money.Display(payment.RefundedMinor, payment.Currency)
	}
	if payment.CompletedAt != nil {
		view.PaidAt = payment.CompletedAt.Format(time.RFC3339)
	} else {
		view.PaidAt = payment.CreatedAt.Format(time.RFC3339)
	}

	if link.IsSplit() {
		view.IsSplit = true
		view.BillTotalDisplay = money.Display(link.TargetMinor, link.Currency)
	}

	// The history: the original authorization, then everything done to it. A
	// partly refunded receipt explains itself rather than just showing a
	// number that does not match what the customer remembers paying.
	first := receiptEntry{
		Label:  "Payment received",
		Amount: money.Display(payment.AmountMinor, payment.Currency),
		At:     view.PaidAt,
		Note:   payment.AuthorizationCode,
	}
	if link.PaymentMode == domain.ModeAuthorize {
		first.Label = "Reserved on card"
		if payment.AuthorizedMinor > 0 {
			first.Amount = money.Display(payment.AuthorizedMinor, payment.Currency)
		}
	}
	view.Entries = append(view.Entries, first)

	if ops, err := s.store.OperationsForPayment(payment.ID); err == nil {
		for _, op := range ops {
			if op.Status != "success" {
				continue // a failed attempt moved no money; it is not the payer's business
			}
			label := map[domain.OperationType]string{
				domain.OpCapture: "Charged",
				domain.OpRefund:  "Refunded",
				domain.OpVoid:    "Reservation released",
			}[op.Type]
			if label == "" {
				continue
			}
			view.Entries = append(view.Entries, receiptEntry{
				Label:  label,
				Amount: money.Display(op.AmountMinor, op.Currency),
				At:     op.CreatedAt.Format(time.RFC3339),
			})
		}
	}

	httpx.JSON(w, http.StatusOK, view)
}
