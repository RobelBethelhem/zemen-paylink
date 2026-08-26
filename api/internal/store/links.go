package store

import (
	"database/sql"
	"errors"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const linkColumns = `l.id, l.slug, l.merchant_id, l.created_by_id, COALESCE(l.branch_id,''),
	l.title, l.description, l.reference, l.type, l.payment_mode, l.environment,
	l.amount_minor, l.target_minor, l.currency,
	l.min_minor, l.max_minor, l.max_uses, l.used_count, l.paid_count, l.paid_minor,
	l.expires_at, l.status, l.created_at,
	COALESCE(m.name,''), COALESCE(u.full_name,''), COALESCE(b.name,'')`

const linkJoins = `FROM pay_links l
	LEFT JOIN merchants m ON m.id = l.merchant_id
	LEFT JOIN users u ON u.id = l.created_by_id
	LEFT JOIN branches b ON b.id = l.branch_id`

func scanLink(row interface{ Scan(...any) error }) (*domain.PayLink, error) {
	var l domain.PayLink
	var maxUses sql.NullInt64
	var expiresAt sql.NullString
	var createdAt string
	err := row.Scan(&l.ID, &l.Slug, &l.MerchantID, &l.CreatedByID, &l.BranchID,
		&l.Title, &l.Description, &l.Reference, &l.Type, &l.PaymentMode, &l.Environment,
		&l.AmountMinor, &l.TargetMinor, &l.Currency,
		&l.MinMinor, &l.MaxMinor, &maxUses, &l.UsedCount, &l.PaidCount, &l.PaidMinor,
		&expiresAt, &l.Status, &createdAt,
		&l.MerchantName, &l.CreatedBy, &l.BranchName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if maxUses.Valid {
		n := int(maxUses.Int64)
		l.MaxUses = &n
	}
	l.ExpiresAt = parseTimePtr(expiresAt)
	l.CreatedAt = parseTime(createdAt)
	return &l, nil
}

func (s *Store) CreateLink(l *domain.PayLink) error {
	if l.ID == "" {
		id, err := s.uniqueID("pay_links", "PL", 3400, 6000)
		if err != nil {
			return err
		}
		l.ID = id
	}
	if l.Slug == "" {
		slug, err := s.UniqueSlug()
		if err != nil {
			return err
		}
		l.Slug = slug
	}
	if l.CreatedAt.IsZero() {
		l.CreatedAt = time.Now().UTC()
	}
	if l.Status == "" {
		l.Status = domain.LinkActive
	}
	var maxUses any
	if l.MaxUses != nil {
		maxUses = *l.MaxUses
	}
	if l.PaymentMode == "" {
		l.PaymentMode = domain.ModePurchase
	}
	if !l.Environment.Valid() {
		l.Environment = domain.EnvTest
	}
	_, err := s.db.Exec(`
		INSERT INTO pay_links (id, slug, merchant_id, created_by_id, branch_id, title,
			description, reference, type, payment_mode, environment, amount_minor, target_minor,
			currency, min_minor, max_minor,
			max_uses, used_count, paid_count, paid_minor, expires_at, status, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		l.ID, l.Slug, l.MerchantID, l.CreatedByID, nullString(l.BranchID), l.Title,
		l.Description, l.Reference, string(l.Type), string(l.PaymentMode), string(l.Environment),
		l.AmountMinor, l.TargetMinor, l.Currency,
		l.MinMinor, l.MaxMinor, maxUses, l.UsedCount, l.PaidCount, l.PaidMinor,
		fmtTimePtr(l.ExpiresAt), string(l.Status), fmtTime(l.CreatedAt))
	return err
}

func (s *Store) LinkByID(id string) (*domain.PayLink, error) {
	return scanLink(s.db.QueryRow(`SELECT `+linkColumns+` `+linkJoins+` WHERE l.id = ?`, id))
}

func (s *Store) LinkBySlug(slug string) (*domain.PayLink, error) {
	return scanLink(s.db.QueryRow(`SELECT `+linkColumns+` `+linkJoins+` WHERE l.slug = ?`, slug))
}

// LinkFilter scopes a listing to what the caller is allowed to see.
type LinkFilter struct {
	MerchantID  string
	CreatedByID string
	// Environment keeps a rehearsal out of a live listing and vice versa.
	Environment domain.Environment
	Limit       int
}

func (s *Store) Links(f LinkFilter) ([]*domain.PayLink, error) {
	q := `SELECT ` + linkColumns + ` ` + linkJoins + ` WHERE 1=1`
	var args []any
	if f.MerchantID != "" {
		q += ` AND l.merchant_id = ?`
		args = append(args, f.MerchantID)
	}
	if f.CreatedByID != "" {
		q += ` AND l.created_by_id = ?`
		args = append(args, f.CreatedByID)
	}
	if f.Environment.Valid() {
		q += ` AND l.environment = ?`
		args = append(args, string(f.Environment))
	}
	q += ` ORDER BY l.created_at DESC`
	if f.Limit > 0 {
		q += ` LIMIT ?`
		args = append(args, f.Limit)
	}

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.PayLink{}
	for rows.Next() {
		l, err := scanLink(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *Store) SetLinkStatus(id string, status domain.LinkStatus) error {
	_, err := s.db.Exec(`UPDATE pay_links SET status = ? WHERE id = ?`, string(status), id)
	return err
}

// IncrementLinkUse records that a checkout was started against the link.
func (s *Store) IncrementLinkUse(id string) error {
	_, err := s.db.Exec(`UPDATE pay_links SET used_count = used_count + 1 WHERE id = ?`, id)
	return err
}

// RecomputeLinkTotals derives a link's counters from its payments rather than
// incrementing them.
//
// Captures and refunds move the collected figure in both directions and can be
// replayed, so deriving is the only way the totals stay correct. A use is
// consumed once the payer commits funds; a voided authorization gives it back,
// which is why a link can reopen after a void.
func (s *Store) RecomputeLinkTotals(linkID string) error {
	committed := `('authorized','partially_captured','paid','partially_refunded','refunded')`

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
		UPDATE pay_links SET
			paid_count = (SELECT COUNT(1) FROM payments
			              WHERE pay_link_id = ? AND status IN `+committed+`),
			paid_minor = (SELECT COALESCE(SUM(captured_minor - refunded_minor), 0)
			              FROM payments WHERE pay_link_id = ?)
		WHERE id = ?`, linkID, linkID, linkID); err != nil {
		return err
	}

	// Close the link once its limit is met, and reopen it if a void freed a use.
	if _, err := tx.Exec(`
		UPDATE pay_links SET status = ?
		WHERE id = ? AND max_uses IS NOT NULL AND paid_count >= max_uses AND status = ?`,
		string(domain.LinkLimitReached), linkID, string(domain.LinkActive)); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		UPDATE pay_links SET status = ?
		WHERE id = ? AND status = ? AND (max_uses IS NULL OR paid_count < max_uses)`,
		string(domain.LinkActive), linkID, string(domain.LinkLimitReached)); err != nil {
		return err
	}

	// A split bill settles when its target is met, and reopens if a refund puts
	// it back below — the same symmetry a void gives a limited-use link.
	if _, err := tx.Exec(`
		UPDATE pay_links SET status = ?
		WHERE id = ? AND type = ? AND target_minor > 0 AND paid_minor >= target_minor AND status = ?`,
		string(domain.LinkSettled), linkID, string(domain.LinkSplit),
		string(domain.LinkActive)); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		UPDATE pay_links SET status = ?
		WHERE id = ? AND status = ? AND (target_minor = 0 OR paid_minor < target_minor)`,
		string(domain.LinkActive), linkID, string(domain.LinkSettled)); err != nil {
		return err
	}
	return tx.Commit()
}

// Contributor is one payer's total on a split bill.
type Contributor struct {
	Name        string
	Email       string
	AmountMinor int64
	CardBrand   string
	CardLast4   string
	PaidAt      time.Time
}

// ContributorsForLink lists who has paid toward a link, most recent first.
// Only settled money counts, so an abandoned attempt never appears.
func (s *Store) ContributorsForLink(linkID string) ([]Contributor, error) {
	rows, err := s.db.Query(`
		SELECT customer_name, customer_email, (captured_minor - refunded_minor),
		       card_brand, card_last4, COALESCE(completed_at, created_at)
		FROM payments
		WHERE pay_link_id = ? AND (captured_minor - refunded_minor) > 0
		ORDER BY COALESCE(completed_at, created_at) DESC`, linkID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Contributor{}
	for rows.Next() {
		var c Contributor
		var paidAt string
		if err := rows.Scan(&c.Name, &c.Email, &c.AmountMinor,
			&c.CardBrand, &c.CardLast4, &paidAt); err != nil {
			return nil, err
		}
		c.PaidAt = parseTime(paidAt)
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) CreateShare(sh *domain.LinkShare) error {
	if sh.ID == "" {
		id, err := s.uniqueID("link_shares", "SH", 100000, 900000)
		if err != nil {
			return err
		}
		sh.ID = id
	}
	if sh.CreatedAt.IsZero() {
		sh.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.Exec(`
		INSERT INTO link_shares (id, pay_link_id, channel, destination, shared_by_id, created_at)
		VALUES (?,?,?,?,?,?)`,
		sh.ID, sh.PayLinkID, string(sh.Channel), sh.Destination, sh.SharedByID, fmtTime(sh.CreatedAt))
	return err
}
