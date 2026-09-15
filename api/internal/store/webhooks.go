package store

import (
	"database/sql"
	"errors"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/zemenbank/paylink/api/internal/domain"
)

const webhookColumns = `id, integration_id, event, payment_id, payload, status,
	attempts, next_attempt_at, response_code, last_error, created_at, delivered_at`

func scanWebhook(row interface{ Scan(...any) error }) (*domain.WebhookDelivery, error) {
	var d domain.WebhookDelivery
	var deliveredAt sql.NullString
	var nextAttempt, createdAt string
	err := row.Scan(&d.ID, &d.IntegrationID, &d.Event, &d.PaymentID, &d.Payload, &d.Status,
		&d.Attempts, &nextAttempt, &d.ResponseCode, &d.LastError, &createdAt, &deliveredAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	d.NextAttemptAt = parseTime(nextAttempt)
	d.CreatedAt = parseTime(createdAt)
	d.DeliveredAt = parseTimePtr(deliveredAt)
	return &d, nil
}

// ErrAlreadyQueued means this integration has already been told about this
// event for this payment. Not a failure: it is the guard working.
var ErrAlreadyQueued = errors.New("store: this event is already queued")

// QueueWebhook records a notification to be delivered.
//
// Queued rather than sent inline, because a webhook attempted once inside the
// request that caused it is lost the moment the receiver has a bad minute —
// and the payer has already gone. The unique key on (integration, event,
// payment) is what stops the reconciler announcing the same payment twice.
func (s *Store) QueueWebhook(d *domain.WebhookDelivery) error {
	if d.ID == "" {
		d.ID = "WH-" + NewSlug(14)
	}
	now := time.Now().UTC()
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	if d.NextAttemptAt.IsZero() {
		d.NextAttemptAt = now
	}
	if d.Status == "" {
		d.Status = domain.WebhookPending
	}
	_, err := s.db.Exec(`
		INSERT INTO webhook_deliveries (`+webhookColumns+`)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		d.ID, d.IntegrationID, d.Event, d.PaymentID, d.Payload, string(d.Status),
		d.Attempts, fmtTime(d.NextAttemptAt), d.ResponseCode, d.LastError,
		fmtTime(d.CreatedAt), fmtTimePtr(d.DeliveredAt))

	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return ErrAlreadyQueued
	}
	return err
}

// DueWebhooks returns deliveries whose time has come, oldest first.
func (s *Store) DueWebhooks(limit int) ([]*domain.WebhookDelivery, error) {
	rows, err := s.db.Query(`
		SELECT `+webhookColumns+` FROM webhook_deliveries
		WHERE status = 'pending' AND next_attempt_at <= ?
		ORDER BY next_attempt_at ASC LIMIT ?`,
		fmtTime(time.Now().UTC()), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.WebhookDelivery{}
	for rows.Next() {
		d, err := scanWebhook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) MarkWebhookDelivered(id string, responseCode int) error {
	now := time.Now().UTC()
	_, err := s.db.Exec(`
		UPDATE webhook_deliveries
		SET status = 'delivered', attempts = attempts + 1, response_code = ?,
		    last_error = '', delivered_at = ?
		WHERE id = ?`, responseCode, fmtTime(now), id)
	return err
}

// MarkWebhookRetry schedules another attempt, or gives up once the attempts are
// spent. The record stays either way: an integrator who never received
// something needs to be able to see that, and to have it replayed.
func (s *Store) MarkWebhookRetry(
	id string, responseCode int, reason string, nextAttempt time.Time, exhausted bool,
) error {
	status := domain.WebhookPending
	if exhausted {
		status = domain.WebhookExhausted
	}
	if len(reason) > 500 {
		reason = reason[:500]
	}
	_, err := s.db.Exec(`
		UPDATE webhook_deliveries
		SET status = ?, attempts = attempts + 1, response_code = ?,
		    last_error = ?, next_attempt_at = ?
		WHERE id = ?`,
		string(status), responseCode, reason, fmtTime(nextAttempt), id)
	return err
}

// ReplayWebhook puts an exhausted delivery back in the queue, so a receiver who
// was down for a day can be caught up without the payment being re-run.
func (s *Store) ReplayWebhook(id string) error {
	result, err := s.db.Exec(`
		UPDATE webhook_deliveries
		SET status = 'pending', attempts = 0, next_attempt_at = ?, last_error = ''
		WHERE id = ? AND status = 'exhausted'`,
		fmtTime(time.Now().UTC()), id)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// WebhooksForIntegration is what an integrator sees when asking why something
// never arrived.
func (s *Store) WebhooksForIntegration(integrationID string, limit int) ([]*domain.WebhookDelivery, error) {
	rows, err := s.db.Query(`
		SELECT `+webhookColumns+` FROM webhook_deliveries
		WHERE integration_id = ? ORDER BY created_at DESC LIMIT ?`,
		integrationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.WebhookDelivery{}
	for rows.Next() {
		d, err := scanWebhook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}
