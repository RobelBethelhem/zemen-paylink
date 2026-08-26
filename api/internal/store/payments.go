package store

import (
	"database/sql"
	"errors"
	"strconv"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const paymentColumns = `p.id, p.pay_link_id, p.merchant_id, p.order_id, p.session_id,
	p.success_indicator, p.environment, p.amount_minor, p.currency,
	p.authorized_minor, p.captured_minor, p.refunded_minor, p.status, p.gateway_result,
	p.gateway_status, p.gateway_receipt, p.authorization_code, p.acquirer_reference,
	p.settlement_date, p.customer_name, p.customer_email, p.card_brand, p.card_last4,
	p.created_at, p.completed_at, COALESCE(l.title,''), COALESCE(u.full_name,'')`

const paymentJoins = `FROM payments p
	LEFT JOIN pay_links l ON l.id = p.pay_link_id
	LEFT JOIN users u ON u.id = l.created_by_id`

func scanPayment(row interface{ Scan(...any) error }) (*domain.Payment, error) {
	var p domain.Payment
	var completedAt sql.NullString
	var createdAt string
	err := row.Scan(&p.ID, &p.PayLinkID, &p.MerchantID, &p.OrderID, &p.SessionID,
		&p.SuccessIndicator, &p.Environment, &p.AmountMinor, &p.Currency,
		&p.AuthorizedMinor, &p.CapturedMinor, &p.RefundedMinor, &p.Status, &p.GatewayResult,
		&p.GatewayStatus, &p.GatewayReceipt, &p.AuthorizationCode, &p.AcquirerReference,
		&p.SettlementDate, &p.CustomerName, &p.CustomerEmail, &p.CardBrand, &p.CardLast4,
		&createdAt, &completedAt, &p.LinkTitle, &p.CreatedBy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	p.CreatedAt = parseTime(createdAt)
	p.CompletedAt = parseTimePtr(completedAt)
	return &p, nil
}

func (s *Store) CreatePayment(p *domain.Payment) error {
	if p.ID == "" {
		id, err := s.uniqueID("payments", "TXN", 90000, 900000)
		if err != nil {
			return err
		}
		p.ID = id
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now().UTC()
	}
	if p.Status == "" {
		p.Status = domain.PaymentInitiated
	}
	if !p.Environment.Valid() {
		p.Environment = domain.EnvTest
	}
	_, err := s.db.Exec(`
		INSERT INTO payments (id, pay_link_id, merchant_id, order_id, session_id,
			success_indicator, environment, amount_minor, currency, status, gateway_result, gateway_status,
			customer_name, customer_email, card_brand, card_last4, created_at, completed_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		p.ID, p.PayLinkID, p.MerchantID, p.OrderID, p.SessionID, p.SuccessIndicator,
		string(p.Environment), p.AmountMinor, p.Currency, string(p.Status), p.GatewayResult, p.GatewayStatus,
		p.CustomerName, p.CustomerEmail, p.CardBrand, p.CardLast4,
		fmtTime(p.CreatedAt), fmtTimePtr(p.CompletedAt))
	return err
}

func (s *Store) PaymentByOrderID(orderID string) (*domain.Payment, error) {
	return scanPayment(s.db.QueryRow(
		`SELECT `+paymentColumns+` `+paymentJoins+` WHERE p.order_id = ?`, orderID))
}

// UpdatePaymentOutcome writes back what the gateway reported for an order,
// including the authorized/captured/refunded totals.
func (s *Store) UpdatePaymentOutcome(p *domain.Payment) error {
	_, err := s.db.Exec(`
		UPDATE payments SET status = ?, gateway_result = ?, gateway_status = ?,
			gateway_receipt = ?, authorization_code = ?, acquirer_reference = ?, settlement_date = ?,
			authorized_minor = ?, captured_minor = ?, refunded_minor = ?,
			customer_name = ?, customer_email = ?, card_brand = ?, card_last4 = ?,
			completed_at = ?
		WHERE id = ?`,
		string(p.Status), p.GatewayResult, p.GatewayStatus,
		p.GatewayReceipt, p.AuthorizationCode, p.AcquirerReference, p.SettlementDate,
		p.AuthorizedMinor, p.CapturedMinor, p.RefundedMinor, p.CustomerName,
		p.CustomerEmail, p.CardBrand, p.CardLast4, fmtTimePtr(p.CompletedAt), p.ID)
	return err
}

// ---------------------------------------------------------------- operations

func (s *Store) CreatePaymentOperation(op *domain.PaymentOperation) error {
	if op.ID == "" {
		id, err := s.uniqueID("payment_operations", "OP", 100000, 900000)
		if err != nil {
			return err
		}
		op.ID = id
	}
	if op.CreatedAt.IsZero() {
		op.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.Exec(`
		INSERT INTO payment_operations (id, payment_id, transaction_id, type, amount_minor,
			currency, status, gateway_code, detail, performed_by, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		op.ID, op.PaymentID, op.TransactionID, string(op.Type), op.AmountMinor,
		op.Currency, op.Status, op.GatewayCode, op.Detail, op.PerformedBy, fmtTime(op.CreatedAt))
	return err
}

func (s *Store) OperationsForPayment(paymentID string) ([]*domain.PaymentOperation, error) {
	rows, err := s.db.Query(`
		SELECT id, payment_id, transaction_id, type, amount_minor, currency, status,
		       gateway_code, detail, performed_by, created_at
		FROM payment_operations WHERE payment_id = ? ORDER BY created_at ASC`, paymentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.PaymentOperation{}
	for rows.Next() {
		var op domain.PaymentOperation
		var createdAt string
		if err := rows.Scan(&op.ID, &op.PaymentID, &op.TransactionID, &op.Type, &op.AmountMinor,
			&op.Currency, &op.Status, &op.GatewayCode, &op.Detail, &op.PerformedBy, &createdAt); err != nil {
			return nil, err
		}
		op.CreatedAt = parseTime(createdAt)
		out = append(out, &op)
	}
	return out, rows.Err()
}

// NextTransactionID allocates the next MPGS transaction id for an order.
// Transaction 1 is always the original authorize/pay, so operations start at 2
// and every attempt — including failed ones — consumes an id, which keeps them
// unique at the gateway.
func (s *Store) NextTransactionID(paymentID string) (string, error) {
	var used int
	err := s.db.QueryRow(
		`SELECT COUNT(1) FROM payment_operations WHERE payment_id = ?`, paymentID).Scan(&used)
	if err != nil {
		return "", err
	}
	return strconv.Itoa(used + 2), nil
}

// PendingFilter selects attempts that still need an answer from the gateway.
type PendingFilter struct {
	PayLinkID   string
	MerchantID  string
	CreatedByID string
	// NotCheckedSince throttles repeat lookups: rows checked more recently than
	// this are skipped. Zero means check everything.
	NotCheckedSince time.Time
	// NewerThan ignores ancient attempts that will never be resolved.
	NewerThan time.Time
	Limit     int
}

// PendingPayments returns attempts still recorded as initiated, oldest first so
// a bounded sweep eventually covers everything.
func (s *Store) PendingPayments(f PendingFilter) ([]*domain.Payment, error) {
	q := `SELECT ` + paymentColumns + ` ` + paymentJoins + ` WHERE p.status = ?`
	args := []any{string(domain.PaymentInitiated)}

	if f.PayLinkID != "" {
		q += ` AND p.pay_link_id = ?`
		args = append(args, f.PayLinkID)
	}
	if f.MerchantID != "" {
		q += ` AND p.merchant_id = ?`
		args = append(args, f.MerchantID)
	}
	if f.CreatedByID != "" {
		q += ` AND l.created_by_id = ?`
		args = append(args, f.CreatedByID)
	}
	if !f.NotCheckedSince.IsZero() {
		q += ` AND (p.last_checked_at IS NULL OR p.last_checked_at < ?)`
		args = append(args, fmtTime(f.NotCheckedSince))
	}
	if !f.NewerThan.IsZero() {
		q += ` AND p.created_at > ?`
		args = append(args, fmtTime(f.NewerThan))
	}
	q += ` ORDER BY p.created_at ASC`
	if f.Limit > 0 {
		q += ` LIMIT ?`
		args = append(args, f.Limit)
	}

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// PaymentsMissingReferences finds settled payments whose gateway references we
// never captured — rows written before we started recording them, or where the
// gateway had not yet assigned a receipt. Fetching is self-limiting: once a
// receipt lands the row stops matching.
func (s *Store) PaymentsMissingReferences(payLinkID string, limit int) ([]*domain.Payment, error) {
	q := `SELECT ` + paymentColumns + ` ` + paymentJoins + `
		WHERE p.gateway_receipt = ''
		  AND p.status NOT IN ('initiated','failed','expired')`
	args := []any{}
	if payLinkID != "" {
		q += ` AND p.pay_link_id = ?`
		args = append(args, payLinkID)
	}
	q += ` ORDER BY p.created_at DESC`
	if limit > 0 {
		q += ` LIMIT ?`
		args = append(args, limit)
	}

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// MarkPaymentChecked records that the gateway was asked about this attempt,
// whatever the answer, so repeat views do not hammer it.
func (s *Store) MarkPaymentChecked(id string, at time.Time) error {
	_, err := s.db.Exec(`UPDATE payments SET last_checked_at = ? WHERE id = ?`, fmtTime(at), id)
	return err
}

// PaymentCounts totals a link's attempts by outcome.
//
// Money is counted from the captured and refunded figures rather than the
// requested amount, so a partial capture or a refund is reflected honestly.
type PaymentCounts struct {
	Attempts   int
	Paid       int // money taken and at least partly kept
	Authorized int // funds reserved, awaiting capture
	Pending    int // payer has not finished
	Failed     int
	Abandoned  int // cancelled, voided or timed out
	Refunded   int // taken then fully returned

	CollectedMinor int64 // net kept: captured minus refunded
	HeldMinor      int64 // reserved and not yet captured
	RefundedMinor  int64
}

func (s *Store) CountPaymentsForLink(payLinkID string) (PaymentCounts, error) {
	var c PaymentCounts
	rows, err := s.db.Query(`
		SELECT status, COUNT(1),
		       COALESCE(SUM(captured_minor), 0),
		       COALESCE(SUM(refunded_minor), 0),
		       COALESCE(SUM(authorized_minor - captured_minor), 0)
		FROM payments WHERE pay_link_id = ? GROUP BY status`, payLinkID)
	if err != nil {
		return c, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		var captured, refunded, outstanding int64
		if err := rows.Scan(&status, &count, &captured, &refunded, &outstanding); err != nil {
			return c, err
		}
		c.Attempts += count
		c.CollectedMinor += captured - refunded
		c.RefundedMinor += refunded

		switch domain.PaymentStatus(status) {
		case domain.PaymentPaid, domain.PaymentPartiallyRefunded:
			c.Paid += count
		case domain.PaymentRefunded:
			c.Refunded += count
		case domain.PaymentAuthorized, domain.PaymentPartiallyCaptured:
			c.Authorized += count
			if outstanding > 0 {
				c.HeldMinor += outstanding
			}
		case domain.PaymentInitiated:
			c.Pending += count
		case domain.PaymentFailed:
			c.Failed += count
		case domain.PaymentCancelled, domain.PaymentExpired:
			c.Abandoned += count
		}
	}
	return c, rows.Err()
}

type PaymentFilter struct {
	MerchantID  string
	PayLinkID   string
	CreatedByID string // operator who owns the underlying link
	Status      string
	// Environment keeps test takings out of a live listing and vice versa.
	Environment domain.Environment
	Limit       int
}

func (s *Store) Payments(f PaymentFilter) ([]*domain.Payment, error) {
	q := `SELECT ` + paymentColumns + ` ` + paymentJoins + ` WHERE 1=1`
	var args []any
	if f.MerchantID != "" {
		q += ` AND p.merchant_id = ?`
		args = append(args, f.MerchantID)
	}
	if f.PayLinkID != "" {
		q += ` AND p.pay_link_id = ?`
		args = append(args, f.PayLinkID)
	}
	if f.CreatedByID != "" {
		q += ` AND l.created_by_id = ?`
		args = append(args, f.CreatedByID)
	}
	if f.Status != "" {
		q += ` AND p.status = ?`
		args = append(args, f.Status)
	}
	if f.Environment.Valid() {
		q += ` AND p.environment = ?`
		args = append(args, string(f.Environment))
	}
	q += ` ORDER BY p.created_at DESC`
	if f.Limit > 0 {
		q += ` LIMIT ?`
		args = append(args, f.Limit)
	}

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
