package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/mpgs"
	"github.com/zemenbank/paylink/api/internal/store"
)

const (
	// A Hosted Checkout page times out well inside this window. Once an attempt
	// is older and the gateway still has no order for it, the payer walked away.
	abandonAfter = 45 * time.Minute

	// Attempts older than this will never resolve; stop asking about them.
	reconcileHorizon = 14 * 24 * time.Hour

	// Repeat views inside this window reuse what we already know.
	recheckInterval = 15 * time.Second

	// Bounds one reconcile pass so a request cannot fan out unboundedly.
	maxReconcileBatch = 12
	reconcileWorkers  = 4
)

// reconcilePending brings a set of in-flight attempts up to date with the
// gateway.
//
// This is what makes the operator's view truthful. A payer who closes the tab
// after paying never hits our return URL, so without this the attempt would sit
// at "Pending" forever even though the money moved.
func (s *Server) reconcilePending(ctx context.Context, payments []*domain.Payment) {
	if len(payments) == 0 {
		return
	}

	// Credentials belong to whoever created the link, so resolve them once per
	// link rather than once per attempt.
	type target struct {
		payment *domain.Payment
		link    *domain.PayLink
		creds   mpgs.Credentials
	}

	links := map[string]*domain.PayLink{}
	creds := map[string]mpgs.Credentials{}
	targets := make([]target, 0, len(payments))

	for _, p := range payments {
		link, ok := links[p.PayLinkID]
		if !ok {
			found, err := s.store.LinkByID(p.PayLinkID)
			if err != nil {
				continue
			}
			link = found
			links[p.PayLinkID] = link
		}
		// Keyed by environment as well as operator: one person can hold both a
		// test and a live profile, and an order only exists on one of them.
		key := link.CreatedByID + "/" + string(link.Environment)
		c, ok := creds[key]
		if !ok {
			resolved, err := s.gatewayCredentialsFor(link.CreatedByID, link.Environment)
			if err != nil {
				// Operator disconnected that gateway; nothing to ask.
				continue
			}
			c = resolved
			creds[key] = c
		}
		targets = append(targets, target{payment: p, link: link, creds: c})
	}

	queue := make(chan target)
	var wg sync.WaitGroup
	workers := reconcileWorkers
	if len(targets) < workers {
		workers = len(targets)
	}

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range queue {
				s.reconcileOne(ctx, t.payment, t.link, t.creds)
			}
		}()
	}
	for _, t := range targets {
		select {
		case <-ctx.Done():
			close(queue)
			wg.Wait()
			return
		case queue <- t:
		}
	}
	close(queue)
	wg.Wait()
}

func (s *Server) reconcileOne(
	ctx context.Context,
	payment *domain.Payment,
	link *domain.PayLink,
	creds mpgs.Credentials,
) {
	now := time.Now().UTC()
	// Record the attempt to check regardless of outcome, so a gateway that is
	// down does not turn every page view into a retry storm.
	defer func() { _ = s.store.MarkPaymentChecked(payment.ID, now) }()

	order, err := s.gateway.RetrieveOrder(ctx, creds, payment.OrderID)
	if err == nil {
		s.applyOrderOutcome(payment, link, order)
		return
	}

	var gwErr *mpgs.Error
	if errors.As(err, &gwErr) && gwErr.StatusCode == http.StatusBadRequest {
		// The gateway has no such order: the payer never completed checkout.
		// Give the session time to run its course before calling it abandoned.
		if now.Sub(payment.CreatedAt) > abandonAfter {
			payment.Status = domain.PaymentExpired
			payment.GatewayStatus = "NOT_STARTED"
			payment.CompletedAt = &now
			if err := s.store.UpdatePaymentOutcome(payment); err != nil {
				slog.Error("could not mark payment abandoned", "order", payment.OrderID, "error", err)
			}
		}
		return
	}
	slog.Warn("reconcile failed", "order", payment.OrderID, "error", err)
}

// reconcileLink refreshes every in-flight attempt against one link.
func (s *Server) reconcileLink(ctx context.Context, linkID string, force bool) {
	filter := store.PendingFilter{
		PayLinkID: linkID,
		NewerThan: time.Now().UTC().Add(-reconcileHorizon),
		Limit:     maxReconcileBatch,
	}
	if !force {
		filter.NotCheckedSince = time.Now().UTC().Add(-recheckInterval)
	}
	pending, err := s.store.PendingPayments(filter)
	if err != nil {
		slog.Error("could not load pending payments", "link", linkID, "error", err)
		return
	}

	// Also pick up settled payments whose gateway references we never captured,
	// so the reconciliation identifiers appear without a migration.
	if missing, err := s.store.PaymentsMissingReferences(linkID, maxReconcileBatch); err == nil {
		pending = append(pending, missing...)
	}
	s.reconcilePending(ctx, pending)
}

// reconcileScope refreshes what the signed-in user is allowed to see, so their
// list is accurate without waiting for the background sweep.
func (s *Server) reconcileScope(ctx context.Context, user *domain.User) {
	filter := store.PendingFilter{
		NewerThan:       time.Now().UTC().Add(-reconcileHorizon),
		NotCheckedSince: time.Now().UTC().Add(-recheckInterval),
		Limit:           maxReconcileBatch,
	}
	switch user.Role {
	case domain.RoleSales:
		filter.CreatedByID = user.ID
	case domain.RoleMerchant:
		filter.MerchantID = user.MerchantID
	}
	pending, err := s.store.PendingPayments(filter)
	if err != nil {
		return
	}
	s.reconcilePending(ctx, pending)
}

// StartReconciler sweeps in-flight payments in the background so reports stay
// accurate even when nobody has the portal open.
func (s *Server) StartReconciler(ctx context.Context, every time.Duration) {
	if every <= 0 {
		every = 2 * time.Minute
	}
	go func() {
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				pending, err := s.store.PendingPayments(store.PendingFilter{
					NewerThan:       time.Now().UTC().Add(-reconcileHorizon),
					NotCheckedSince: time.Now().UTC().Add(-every),
					Limit:           maxReconcileBatch * 4,
				})
				if err != nil {
					slog.Error("reconciler sweep failed", "error", err)
					continue
				}
				if len(pending) == 0 {
					continue
				}
				slog.Info("reconciling in-flight payments", "count", len(pending))
				s.reconcilePending(ctx, pending)
			}
		}
	}()
}
