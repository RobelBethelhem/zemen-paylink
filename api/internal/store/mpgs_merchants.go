package store

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

// The register of merchant numbers. Merchant management owns it; operators only
// read from it, by registering against a number.

const mpgsMerchantColumns = `number, name, live_number, created_by, created_at`

func scanMPGSMerchant(row interface{ Scan(...any) error }) (*domain.MPGSMerchant, error) {
	var m domain.MPGSMerchant
	var createdAt string
	if err := row.Scan(&m.Number, &m.Name, &m.LiveNumber, &m.CreatedBy, &createdAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	m.CreatedAt = parseTime(createdAt)
	return &m, nil
}

// CreateMPGSMerchant registers a number. Re-registering an existing number
// updates its name rather than failing, so a typo is correctable.
func (s *Store) CreateMPGSMerchant(m *domain.MPGSMerchant) error {
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now().UTC()
	}
	m.Number = strings.TrimSpace(m.Number)
	m.LiveNumber = strings.TrimSpace(m.LiveNumber)
	m.Name = strings.TrimSpace(m.Name)
	_, err := s.db.Exec(`
		INSERT INTO mpgs_merchants (number, name, live_number, created_by, created_at)
		VALUES (?,?,?,?,?)
		ON DUPLICATE KEY UPDATE
			name        = VALUES(name),
			live_number = VALUES(live_number)`,
		m.Number, m.Name, m.LiveNumber, m.CreatedBy, fmtTime(m.CreatedAt))
	return err
}

func (s *Store) MPGSMerchantByNumber(number string) (*domain.MPGSMerchant, error) {
	number = strings.TrimSpace(number)
	if number == "" {
		return nil, ErrNotFound
	}
	return scanMPGSMerchant(s.db.QueryRow(
		`SELECT `+mpgsMerchantColumns+` FROM mpgs_merchants WHERE number = ?`, number))
}

func (s *Store) MPGSMerchants() ([]*domain.MPGSMerchant, error) {
	rows, err := s.db.Query(
		`SELECT ` + mpgsMerchantColumns + ` FROM mpgs_merchants ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.MPGSMerchant{}
	for rows.Next() {
		m, err := scanMPGSMerchant(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// OperatorsForMPGSMerchant counts who registered against a number, so the
// register can show whether an entry is in use before anyone edits it.
func (s *Store) OperatorsForMPGSMerchant(number string) (int, error) {
	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(1) FROM users WHERE mpgs_merchant_number = ?`,
		strings.TrimSpace(number)).Scan(&n)
	return n, err
}
