package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/secure"
	"github.com/zemenbank/paylink/api/internal/store"
)

// How long to wait before each attempt. Six tries across a day: quick enough
// that a receiver restarting misses nothing, spread widely enough that one
// which is properly down is not hammered while it recovers.
var webhookBackoff = []time.Duration{
	30 * time.Second,
	2 * time.Minute,
	10 * time.Minute,
	time.Hour,
	6 * time.Hour,
	24 * time.Hour,
}

// webhookDispatcher delivers queued notifications to integrators.
//
// Delivery is out of band on purpose. A payer finishes at the gateway and
// closes the tab; whether their donation platform was reachable at that
// instant is not something their payment should depend on, and not something
// we can make them wait for.
type webhookDispatcher struct {
	srv    *Server
	client *http.Client
}

func newWebhookDispatcher(s *Server) *webhookDispatcher {
	return &webhookDispatcher{
		srv: s,
		client: &http.Client{
			// Short on purpose: a receiver that cannot answer in fifteen
			// seconds is down as far as we are concerned, and will be retried.
			Timeout: 15 * time.Second,
		},
	}
}

// Start runs the delivery loop until the context is cancelled.
func (d *webhookDispatcher) Start(ctx context.Context, every time.Duration) {
	go func() {
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				d.drain(ctx)
			}
		}
	}()
}

func (d *webhookDispatcher) drain(ctx context.Context) {
	due, err := d.srv.store.DueWebhooks(25)
	if err != nil {
		slog.Error("could not read the webhook queue", "error", err)
		return
	}
	for _, delivery := range due {
		select {
		case <-ctx.Done():
			return
		default:
		}
		d.attempt(ctx, delivery)
	}
}

func (d *webhookDispatcher) attempt(ctx context.Context, delivery *domain.WebhookDelivery) {
	integration, err := d.srv.store.IntegrationByID(delivery.IntegrationID)
	if err != nil {
		slog.Error("webhook for an unknown integration",
			"delivery", delivery.ID, "integration", delivery.IntegrationID)
		d.fail(delivery, 0, "integration no longer exists", true)
		return
	}
	if integration.WebhookURL == "" {
		d.fail(delivery, 0, "no webhook URL is configured", true)
		return
	}

	secret, err := d.srv.sealer.Open(integration.SecretSealed)
	if err != nil {
		d.fail(delivery, 0, "could not open the signing secret", true)
		return
	}
	payloadKey, err := d.srv.integrationPayloadKey(integration)
	if err != nil {
		d.fail(delivery, 0, "could not open the payload key", true)
		return
	}

	// Sealed with the same key and envelope as an API response, so an
	// integrator writes one open() and uses it in both directions. The delivery
	// id is bound in as additional data, which is what stops a captured body
	// being replayed as a different notification.
	env, err := secure.Seal(payloadKey, []byte(delivery.Payload), integration.APIKey, delivery.ID)
	if err != nil {
		d.fail(delivery, 0, "could not seal the payload", true)
		return
	}
	body, err := json.Marshal(env)
	if err != nil {
		d.fail(delivery, 0, "could not encode the payload", true)
		return
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, integration.WebhookURL, bytes.NewReader(body))
	if err != nil {
		d.fail(delivery, 0, "webhook URL is not usable: "+err.Error(), true)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "ZemenPayLink-Webhook/1")
	req.Header.Set("X-PL-Event", delivery.Event)
	req.Header.Set("X-PL-Delivery", delivery.ID)
	req.Header.Set("X-PL-TS", timestamp)
	req.Header.Set("X-PL-Signature", secure.SignOutbound([]byte(secret), timestamp, body))

	resp, err := d.client.Do(req)
	if err != nil {
		d.fail(delivery, 0, err.Error(), false)
		return
	}
	defer resp.Body.Close()

	// Any 2xx is acceptance. Anything else is retried, including a 5xx, because
	// a receiver having a bad minute is the ordinary case this exists for.
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if err := d.srv.store.MarkWebhookDelivered(delivery.ID, resp.StatusCode); err != nil {
			slog.Error("could not record a delivered webhook", "delivery", delivery.ID, "error", err)
		}
		slog.Info("webhook delivered",
			"delivery", delivery.ID, "event", delivery.Event,
			"integration", integration.ID, "status", resp.StatusCode)
		return
	}
	d.fail(delivery, resp.StatusCode, fmt.Sprintf("receiver answered %d", resp.StatusCode), false)
}

// fail schedules the next attempt, or gives up when they are spent. permanent
// marks the failures no retry can fix — a missing URL, an unopenable key —
// where trying again for a day would only fill a log.
func (d *webhookDispatcher) fail(
	delivery *domain.WebhookDelivery, code int, reason string, permanent bool,
) {
	next := delivery.Attempts // this attempt has not been counted yet
	exhausted := permanent || next >= len(webhookBackoff)-1

	wait := webhookBackoff[len(webhookBackoff)-1]
	if next < len(webhookBackoff) {
		wait = webhookBackoff[next]
	}

	if err := d.srv.store.MarkWebhookRetry(
		delivery.ID, code, reason, time.Now().UTC().Add(wait), exhausted,
	); err != nil {
		slog.Error("could not record a webhook failure", "delivery", delivery.ID, "error", err)
	}
	level := slog.LevelWarn
	if exhausted {
		level = slog.LevelError
	}
	slog.Log(context.Background(), level, "webhook not delivered",
		"delivery", delivery.ID, "event", delivery.Event,
		"attempt", delivery.Attempts+1, "reason", reason, "exhausted", exhausted)
}

// ------------------------------------------------------------------ queueing

// eventFor maps a payment to the thing that happened to the money, or "" when
// nothing worth telling anyone about has.
func eventFor(p *domain.Payment) string {
	switch p.Status {
	case domain.PaymentPaid, domain.PaymentPartiallyCaptured:
		return domain.EventPaymentSucceeded
	case domain.PaymentAuthorized:
		return domain.EventPaymentAuthorized
	case domain.PaymentRefunded, domain.PaymentPartiallyRefunded:
		return domain.EventPaymentRefunded
	case domain.PaymentFailed:
		return domain.EventPaymentFailed
	}
	return ""
}

// Notify queues a notification about a payment, if the link it belongs to was
// created by an integration that wants to hear about it.
//
// Quiet when there is nothing to do: most payments are made from the portal and
// have no integration behind them at all.
func (s *Server) Notify(payment *domain.Payment) {
	event := eventFor(payment)
	if event == "" {
		return
	}
	link, err := s.store.LinkByID(payment.PayLinkID)
	if err != nil || link.IntegrationID == "" {
		return
	}
	integration, err := s.store.IntegrationByID(link.IntegrationID)
	if err != nil || integration.WebhookURL == "" {
		return
	}

	metadata, err := s.store.LinkMetadata(link.ID)
	if err != nil {
		slog.Error("could not read link metadata for a webhook", "link", link.ID, "error", err)
	}

	body, err := json.Marshal(map[string]any{
		"event":     event,
		"createdAt": time.Now().UTC().Format(time.RFC3339),
		"data":      paymentPayload(payment, link, metadata),
	})
	if err != nil {
		slog.Error("could not build a webhook payload", "payment", payment.OrderID, "error", err)
		return
	}

	err = s.store.QueueWebhook(&domain.WebhookDelivery{
		IntegrationID: integration.ID,
		Event:         event,
		PaymentID:     payment.OrderID,
		Payload:       string(body),
	})
	switch {
	case errors.Is(err, store.ErrAlreadyQueued):
		// The reconciler saw the same outcome again. Nothing to do: the guard
		// on (integration, event, payment) is exactly what should happen here.
	case err != nil:
		slog.Error("could not queue a webhook",
			"payment", payment.OrderID, "event", event, "error", err)
	default:
		slog.Info("webhook queued",
			"payment", payment.OrderID, "event", event, "integration", integration.ID)
	}
}

// paymentPayload is the shape an integrator receives, both on a webhook and
// when they ask for a payment directly. One shape, so code that handles a
// notification also handles a lookup.
func paymentPayload(
	p *domain.Payment, link *domain.PayLink, metadata []domain.MetadataPair,
) map[string]any {
	meta := map[string]string{}
	for _, pair := range metadata {
		meta[pair.Key] = pair.Value
	}
	out := map[string]any{
		"orderId":       p.OrderID,
		"linkId":        p.PayLinkID,
		"status":        string(p.Status),
		"environment":   string(p.Environment),
		"amountMinor":   p.AmountMinor,
		"amount":        money.Display(p.AmountMinor, p.Currency),
		"currency":      p.Currency,
		"capturedMinor": p.CapturedMinor,
		"refundedMinor": p.RefundedMinor,
		"createdAt":     p.CreatedAt.UTC().Format(time.RFC3339),
		"metadata":      meta,
	}
	if link != nil {
		out["reference"] = link.Reference
		out["title"] = link.Title
	}
	if p.CompletedAt != nil {
		out["completedAt"] = p.CompletedAt.UTC().Format(time.RFC3339)
	}
	// Present only when the gateway gave them. A card brand on a failed attempt
	// is genuinely absent, not empty.
	for key, value := range map[string]string{
		"cardBrand":         p.CardBrand,
		"cardLast4":         p.CardLast4,
		"customerName":      p.CustomerName,
		"customerEmail":     p.CustomerEmail,
		"authorizationCode": p.AuthorizationCode,
		"gatewayReceipt":    p.GatewayReceipt,
	} {
		if value != "" {
			out[key] = value
		}
	}
	return out
}

// StartWebhookDelivery runs the outbound queue until the context is cancelled.
func (s *Server) StartWebhookDelivery(ctx context.Context, every time.Duration) {
	s.hooks.Start(ctx, every)
	slog.Info("webhook delivery started", "interval", every)
}
