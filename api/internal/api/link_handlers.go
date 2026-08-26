package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/store"
)

// linkView is the shape the dashboard renders.
type linkView struct {
	*domain.PayLink
	URL             string `json:"url"`
	ShareURL        string `json:"shareUrl"`
	AmountDisplay   string `json:"amountDisplay"`
	PaidDisplay     string `json:"paidDisplay"`
	EffectiveStatus string `json:"effectiveStatus"`
	MaxUsesLabel    string `json:"maxUsesLabel"`
	ExpiryLabel     string `json:"expiryLabel"`

	IsSplit          bool   `json:"isSplit"`
	TargetDisplay    string `json:"targetDisplay,omitempty"`
	RemainingMinor   int64  `json:"remainingMinor"`
	RemainingDisplay string `json:"remainingDisplay,omitempty"`
	PercentPaid      int    `json:"percentPaid"`
}

func (s *Server) linkView(l *domain.PayLink) linkView {
	amount := "Customer enters"
	if l.Type == domain.LinkStatic {
		amount = money.Display(l.AmountMinor, l.Currency)
	} else if l.IsSplit() {
		amount = money.Display(l.TargetMinor, l.Currency) + " split"
	}
	maxUses := "Unlimited uses"
	if l.MaxUses != nil {
		maxUses = fmt.Sprintf("%d uses", *l.MaxUses)
	}
	expiry := "No expiry"
	if l.ExpiresAt != nil {
		expiry = "Expires " + l.ExpiresAt.Format("02 Jan 2006")
	}
	view := linkView{
		PayLink:         l,
		URL:             s.linkURL(l.Slug),
		ShareURL:        s.linkURL(l.Slug),
		AmountDisplay:   amount,
		PaidDisplay:     money.Display(l.PaidMinor, l.Currency),
		EffectiveStatus: string(l.EffectiveStatus(time.Now().UTC())),
		MaxUsesLabel:    maxUses,
		ExpiryLabel:     expiry,
	}
	if l.IsSplit() {
		view.IsSplit = true
		view.TargetDisplay = money.Display(l.TargetMinor, l.Currency)
		view.RemainingMinor = l.RemainingMinor()
		view.RemainingDisplay = money.Display(l.RemainingMinor(), l.Currency)
		view.MaxUsesLabel = "Split bill"
		if l.TargetMinor > 0 {
			view.PercentPaid = int(min(100, l.PaidMinor*100/l.TargetMinor))
		}
	}
	return view
}

func (s *Server) linkURL(slug string) string {
	return s.cfg.PublicBaseURL + "/l/" + slug
}

// canAccessLink scopes visibility: an operator sees only what they created,
// a merchant sees their whole workspace, the bank admin sees everything.
func canAccessLink(u *domain.User, l *domain.PayLink) bool {
	switch u.Role {
	case domain.RoleAdmin:
		return true
	case domain.RoleMerchant:
		return l.MerchantID == u.MerchantID
	case domain.RoleSales:
		return l.CreatedByID == u.ID
	}
	return false
}

type createLinkRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Reference   string `json:"reference"`
	Type        string `json:"type"`
	PaymentMode string `json:"paymentMode"`
	Amount      string `json:"amount"`
	// Target is the bill total on a split link.
	Target    string `json:"target"`
	Currency  string `json:"currency"`
	Min       string `json:"min"`
	Max       string `json:"max"`
	MaxUses   *int   `json:"maxUses"`
	ExpiresAt string `json:"expiresAt"`
	BranchID  string `json:"branchId"`
}

func parseExpiry(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	// A bare date means "usable through the end of that day".
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		end := t.Add(24*time.Hour - time.Second).UTC()
		return &end, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		t = t.UTC()
		return &t, nil
	}
	return nil, fmt.Errorf("expiry must be a date (YYYY-MM-DD)")
}

func (s *Server) handleCreateLink(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	if !rateLimit(s.linkLimit, "link:"+user.ID, w,
		"Too many payment links created in a short time. Wait a moment and try again.") {
		return
	}

	var req createLinkRequest
	if !httpx.Decode(w, r, &req) {
		return
	}

	// An operator can only issue links once their own MPGS identity is stored,
	// because that is what the eventual payment is initiated with.
	if user.Role == domain.RoleSales {
		connected, err := s.store.HasVerifiedCredential(user.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "Could not check your gateway connection.")
			return
		}
		if !connected {
			httpx.ErrorCode(w, http.StatusConflict, "gateway_required",
				"Connect your Mastercard gateway credentials before creating payment links.")
			return
		}
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		httpx.Error(w, http.StatusBadRequest, "Give the payment link a title so your customer knows what it is for.")
		return
	}

	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = "USD"
		if m, err := s.store.MerchantByID(user.MerchantID); err == nil && m.DefaultCurrency != "" {
			currency = m.DefaultCurrency
		}
	}
	if len(currency) != 3 {
		httpx.Error(w, http.StatusBadRequest, "Currency must be a three-letter code such as USD or ETB.")
		return
	}

	linkType := domain.LinkStatic
	switch strings.ToLower(strings.TrimSpace(req.Type)) {
	case "dynamic":
		linkType = domain.LinkDynamic
	case "split":
		linkType = domain.LinkSplit
	}

	// Purchase takes the money at checkout; authorize only reserves it, leaving
	// the merchant to capture later, in one go or in parts.
	mode := domain.ModePurchase
	if strings.EqualFold(req.PaymentMode, string(domain.ModeAuthorize)) {
		mode = domain.ModeAuthorize
	} else if req.PaymentMode != "" && !domain.PaymentMode(strings.ToLower(req.PaymentMode)).Valid() {
		httpx.Error(w, http.StatusBadRequest, "Payment mode must be purchase or authorize.")
		return
	}

	link := &domain.PayLink{
		MerchantID:  user.MerchantID,
		CreatedByID: user.ID,
		BranchID:    strings.TrimSpace(req.BranchID),
		Title:       title,
		Description: strings.TrimSpace(req.Description),
		Reference:   strings.TrimSpace(req.Reference),
		Type:        linkType,
		PaymentMode: mode,
		// Fixed here and never changed: the gateway that will settle every
		// payment against this link, even after the operator has gone live.
		Environment: s.environmentFor(user),
		Currency:    currency,
		Status:      domain.LinkActive,
	}
	if link.BranchID == "" {
		link.BranchID = user.BranchID
	}

	if linkType == domain.LinkSplit {
		// A split bill needs a total to divide; without one there is nothing to
		// count down and the link could never settle.
		target, err := money.Parse(req.Target, currency)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "Bill total: "+err.Error())
			return
		}
		if target <= 0 {
			httpx.Error(w, http.StatusBadRequest, "Enter the total amount of the bill to be split.")
			return
		}
		link.TargetMinor = target

		// Optional bounds on a single contribution.
		if strings.TrimSpace(req.Min) != "" {
			min, err := money.Parse(req.Min, currency)
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "Minimum contribution: "+err.Error())
				return
			}
			link.MinMinor = min
		}
		if link.MinMinor > target {
			httpx.Error(w, http.StatusBadRequest,
				"The minimum contribution cannot be more than the bill total.")
			return
		}
	} else if linkType == domain.LinkStatic {
		amount, err := money.Parse(req.Amount, currency)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		if amount <= 0 {
			httpx.Error(w, http.StatusBadRequest, "Enter an amount greater than zero.")
			return
		}
		link.AmountMinor = amount
	} else {
		if strings.TrimSpace(req.Min) != "" {
			min, err := money.Parse(req.Min, currency)
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "Minimum amount: "+err.Error())
				return
			}
			link.MinMinor = min
		}
		if strings.TrimSpace(req.Max) != "" {
			max, err := money.Parse(req.Max, currency)
			if err != nil {
				httpx.Error(w, http.StatusBadRequest, "Maximum amount: "+err.Error())
				return
			}
			link.MaxMinor = max
		}
		if link.MinMinor > 0 && link.MaxMinor > 0 && link.MinMinor > link.MaxMinor {
			httpx.Error(w, http.StatusBadRequest, "The minimum amount cannot be greater than the maximum.")
			return
		}
	}

	if req.MaxUses != nil && *req.MaxUses > 0 {
		link.MaxUses = req.MaxUses
	}

	expiry, err := parseExpiry(req.ExpiresAt)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	link.ExpiresAt = expiry

	if err := s.store.CreateLink(link); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not create the payment link.")
		return
	}

	created, err := s.store.LinkByID(link.ID)
	if err != nil {
		created = link
	}
	httpx.JSON(w, http.StatusCreated, s.linkView(created))
}

func (s *Server) handleListLinks(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	// Test and live are separate worlds; a listing only ever shows one of them.
	filter := store.LinkFilter{Limit: 200, Environment: s.environmentFor(user)}
	switch user.Role {
	case domain.RoleSales:
		filter.CreatedByID = user.ID
	case domain.RoleMerchant:
		filter.MerchantID = user.MerchantID
	}

	links, err := s.store.Links(filter)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load payment links.")
		return
	}
	views := make([]linkView, 0, len(links))
	for _, l := range links {
		views = append(views, s.linkView(l))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"links": views})
}

// linkSummary is the at-a-glance answer to "did people pay this link?".
type linkSummary struct {
	Attempts   int `json:"attempts"`
	Paid       int `json:"paid"`
	Authorized int `json:"authorized"`
	Pending    int `json:"pending"`
	Failed     int `json:"failed"`
	Abandoned  int `json:"abandoned"`
	Refunded   int `json:"refunded"`

	CollectedMinor   int64  `json:"collectedMinor"`
	CollectedDisplay string `json:"collectedDisplay"`
	HeldMinor        int64  `json:"heldMinor"`
	HeldDisplay      string `json:"heldDisplay"`
	RefundedMinor    int64  `json:"refundedMinor"`
	RefundedDisplay  string `json:"refundedDisplay"`
}

func (s *Server) handleGetLink(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	link, err := s.store.LinkByID(r.PathValue("id"))
	if err != nil || !canAccessLink(user, link) {
		httpx.Error(w, http.StatusNotFound, "That payment link could not be found.")
		return
	}

	// Ask the gateway about anything still in flight before answering, so the
	// operator sees the real outcome even when the payer never came back to us.
	force := r.URL.Query().Get("force") == "1"
	s.reconcileLink(r.Context(), link.ID, force)

	// Re-read: reconciliation may have moved the link's totals or status.
	if refreshed, err := s.store.LinkByID(link.ID); err == nil {
		link = refreshed
	}

	payments, err := s.store.Payments(store.PaymentFilter{PayLinkID: link.ID, Limit: 200})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load payments for this link.")
		return
	}
	counts, err := s.store.CountPaymentsForLink(link.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not summarise this link.")
		return
	}

	// Who has chipped in. Only shown to the operator, never on the pay page.
	contributors := []map[string]any{}
	if link.IsSplit() {
		records, err := s.store.ContributorsForLink(link.ID)
		if err == nil {
			for _, c := range records {
				name := c.Name
				if name == "" {
					name = c.Email
				}
				if name == "" {
					name = "Anonymous"
				}
				contributors = append(contributors, map[string]any{
					"name":          name,
					"amountDisplay": money.Display(c.AmountMinor, link.Currency),
					"cardBrand":     c.CardBrand,
					"cardLast4":     c.CardLast4,
					"paidAt":        c.PaidAt.Format("02 Jan 2006 15:04"),
				})
			}
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"link":         s.linkView(link),
		"payments":     s.paymentViews(payments),
		"contributors": contributors,
		"summary": linkSummary{
			Attempts:         counts.Attempts,
			Paid:             counts.Paid,
			Authorized:       counts.Authorized,
			Pending:          counts.Pending,
			Failed:           counts.Failed,
			Abandoned:        counts.Abandoned,
			Refunded:         counts.Refunded,
			CollectedMinor:   counts.CollectedMinor,
			CollectedDisplay: money.Display(counts.CollectedMinor, link.Currency),
			HeldMinor:        counts.HeldMinor,
			HeldDisplay:      money.Display(counts.HeldMinor, link.Currency),
			RefundedMinor:    counts.RefundedMinor,
			RefundedDisplay:  money.Display(counts.RefundedMinor, link.Currency),
		},
	})
}

type setStatusRequest struct {
	Status string `json:"status"`
}

func (s *Server) handleSetLinkStatus(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	link, err := s.store.LinkByID(r.PathValue("id"))
	if err != nil || !canAccessLink(user, link) {
		httpx.Error(w, http.StatusNotFound, "That payment link could not be found.")
		return
	}
	var req setStatusRequest
	if !httpx.Decode(w, r, &req) {
		return
	}

	var status domain.LinkStatus
	switch strings.ToLower(strings.TrimSpace(req.Status)) {
	case "active":
		status = domain.LinkActive
	case "paused":
		status = domain.LinkPaused
	case "cancelled", "canceled":
		status = domain.LinkCancelled
	default:
		httpx.Error(w, http.StatusBadRequest, "Status must be active, paused or cancelled.")
		return
	}

	if err := s.store.SetLinkStatus(link.ID, status); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not update the payment link.")
		return
	}
	updated, _ := s.store.LinkByID(link.ID)
	httpx.JSON(w, http.StatusOK, s.linkView(updated))
}

// ------------------------------------------------------------------- sharing

type shareRequest struct {
	Channel string `json:"channel"`
	To      string `json:"to"`
	Message string `json:"message"`
}

// handleShareLink records the share and, for email, actually delivers it.
// SMS and WhatsApp are deep links opened by the browser, so the server returns
// a ready-made URL rather than sending anything itself.
func (s *Server) handleShareLink(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	// Sharing can send mail on the operator's behalf, so an abused session must
	// not be able to use the portal as a relay.
	if !rateLimit(s.shareLimit, "share:"+user.ID, w,
		"Too many shares in a short time. Wait a moment and try again.") {
		return
	}

	link, err := s.store.LinkByID(r.PathValue("id"))
	if err != nil || !canAccessLink(user, link) {
		httpx.Error(w, http.StatusNotFound, "That payment link could not be found.")
		return
	}

	var req shareRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	channel := domain.ShareChannel(strings.ToLower(strings.TrimSpace(req.Channel)))
	if !channel.Valid() {
		httpx.Error(w, http.StatusBadRequest, "Unsupported share channel.")
		return
	}

	payURL := s.linkURL(link.Slug)
	amount := "the amount shown"
	if link.Type == domain.LinkStatic {
		amount = money.Display(link.AmountMinor, link.Currency)
	}
	merchantName := link.MerchantName
	if merchantName == "" {
		merchantName = "our team"
	}
	text := req.Message
	if strings.TrimSpace(text) == "" {
		text = fmt.Sprintf("%s — %s. Pay securely here: %s", link.Title, amount, payURL)
	}

	response := map[string]any{
		"channel":   channel,
		"url":       payURL,
		"message":   text,
		"delivered": false,
	}

	switch channel {
	case domain.ShareEmail:
		to := strings.TrimSpace(req.To)
		if to == "" || !strings.Contains(to, "@") {
			httpx.Error(w, http.StatusBadRequest, "Enter a valid email address.")
			return
		}
		subject := fmt.Sprintf("Payment request from %s — %s", merchantName, link.Title)
		err := s.mail.Send(mailerMessage(to, subject, text, s.shareEmailHTML(link, payURL, amount, merchantName)))
		if err != nil {
			httpx.Error(w, http.StatusBadGateway, "Could not send the email. Check the address and try again.")
			return
		}
		response["delivered"] = s.mail.Enabled()
		if !s.mail.Enabled() {
			response["note"] = "Email delivery is not configured on this server; the link was not sent."
		}
		req.To = to

	case domain.ShareWhatsApp:
		target := "https://wa.me/"
		if phone := digitsOnly(req.To); phone != "" {
			target += phone
		}
		response["shareUrl"] = target + "?text=" + url.QueryEscape(text)

	case domain.ShareSMS:
		target := "sms:" + strings.TrimSpace(req.To)
		response["shareUrl"] = target + "?&body=" + url.QueryEscape(text)
	}

	share := &domain.LinkShare{
		PayLinkID:   link.ID,
		Channel:     channel,
		Destination: strings.TrimSpace(req.To),
		SharedByID:  user.ID,
	}
	if err := s.store.CreateShare(share); err != nil {
		// The share already happened; losing the audit row must not fail it.
		httpx.JSON(w, http.StatusOK, response)
		return
	}
	httpx.JSON(w, http.StatusOK, response)
}

func digitsOnly(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (s *Server) handleListPayments(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	// Refresh what this user can see before listing it.
	s.reconcileScope(r.Context(), user)

	filter := store.PaymentFilter{Limit: 200, Environment: s.environmentFor(user)}
	switch user.Role {
	case domain.RoleSales:
		filter.CreatedByID = user.ID
	case domain.RoleMerchant:
		filter.MerchantID = user.MerchantID
	}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
		filter.Status = status
	}

	payments, err := s.store.Payments(filter)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load payments.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payments": s.paymentViews(payments)})
}

type paymentView struct {
	*domain.Payment
	AmountDisplay string `json:"amountDisplay"`
	Date          string `json:"date"`
	Time          string `json:"time"`
}

func (s *Server) paymentViews(payments []*domain.Payment) []paymentView {
	out := make([]paymentView, 0, len(payments))
	for _, p := range payments {
		out = append(out, paymentView{
			Payment:       p,
			AmountDisplay: money.Display(p.AmountMinor, p.Currency),
			Date:          p.CreatedAt.Format("02 Jan 2006"),
			Time:          p.CreatedAt.Format("15:04"),
		})
	}
	return out
}

func (s *Server) handleListBranches(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	branches, err := s.store.BranchesByMerchant(user.MerchantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load branches.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"branches": branches})
}
