package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

// EnsureMerchant makes the merchant table agree with the MPGS register.
//
// pay_links.merchant_id and payments.merchant_id are foreign keys into
// merchants, but the number an operator actually trades under is recorded in
// mpgs_merchants — a different table, filled by a different screen. Outside
// development nothing ever writes to merchants, so every link an operator
// created referenced a merchant row that did not exist and MySQL refused the
// insert with error 1452.
//
// The MPGS merchant number is the identity: one number, one merchant row, the
// same string on both sides. Idempotent, so registering a merchant twice or
// renaming one both land correctly.
func (s *Store) EnsureMerchant(id, name string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("store: a merchant id is required")
	}
	if name = strings.TrimSpace(name); name == "" {
		name = id
	}
	_, err := s.db.Exec(`
		INSERT INTO merchants (id, name, category, status, contact_email, default_currency, created_at)
		VALUES (?,?,'','Active','','USD',?)
		ON DUPLICATE KEY UPDATE name = VALUES(name)`,
		id, name, fmtTime(time.Now().UTC()))
	return err
}

func (s *Store) CreateMerchant(m *domain.Merchant) error {
	if m.ID == "" {
		id, err := s.uniqueID("merchants", "MER", 1000, 9000)
		if err != nil {
			return err
		}
		m.ID = id
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now().UTC()
	}
	if m.DefaultCurrency == "" {
		m.DefaultCurrency = "USD"
	}
	_, err := s.db.Exec(`
		INSERT INTO merchants (id, name, category, status, contact_email, default_currency, created_at)
		VALUES (?,?,?,?,?,?,?)`,
		m.ID, m.Name, m.Category, m.Status, m.ContactEmail, m.DefaultCurrency, fmtTime(m.CreatedAt))
	return err
}

func (s *Store) MerchantByID(id string) (*domain.Merchant, error) {
	var m domain.Merchant
	var createdAt string
	err := s.db.QueryRow(`
		SELECT id, name, category, status, contact_email, default_currency, created_at
		FROM merchants WHERE id = ?`, id).
		Scan(&m.ID, &m.Name, &m.Category, &m.Status, &m.ContactEmail, &m.DefaultCurrency, &createdAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	m.CreatedAt = parseTime(createdAt)
	return &m, nil
}

func (s *Store) CreateBranch(b *domain.Branch) error {
	if b.ID == "" {
		id, err := s.uniqueID("branches", "BR", 10, 990)
		if err != nil {
			return err
		}
		b.ID = id
	}
	if b.CreatedAt.IsZero() {
		b.CreatedAt = time.Now().UTC()
	}
	_, err := s.db.Exec(`
		INSERT INTO branches (id, merchant_id, name, code, city, area,
			manager_name, manager_email, manager_phone, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?)`,
		b.ID, b.MerchantID, b.Name, b.Code, b.City, b.Area,
		b.ManagerName, b.ManagerEmail, b.ManagerPhone, fmtTime(b.CreatedAt))
	return err
}

func (s *Store) BranchesByMerchant(merchantID string) ([]*domain.Branch, error) {
	rows, err := s.db.Query(`
		SELECT id, merchant_id, name, code, city, area,
		       manager_name, manager_email, manager_phone, created_at
		FROM branches WHERE merchant_id = ? ORDER BY name`, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.Branch{}
	for rows.Next() {
		var b domain.Branch
		var createdAt string
		if err := rows.Scan(&b.ID, &b.MerchantID, &b.Name, &b.Code, &b.City, &b.Area,
			&b.ManagerName, &b.ManagerEmail, &b.ManagerPhone, &createdAt); err != nil {
			return nil, err
		}
		b.CreatedAt = parseTime(createdAt)
		out = append(out, &b)
	}
	return out, rows.Err()
}
