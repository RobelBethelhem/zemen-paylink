package store

import (
	"database/sql"
	"errors"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const credentialColumns = `user_id, environment, gateway_host, mpgs_merchant_id, merchant_name,
	api_version, api_password_sealed, is_active, verified_at, created_at, updated_at`

func scanCredential(row interface{ Scan(...any) error }) (*domain.GatewayCredential, error) {
	var c domain.GatewayCredential
	var verifiedAt sql.NullString
	var createdAt, updatedAt string
	var active int
	err := row.Scan(&c.UserID, &c.Environment, &c.GatewayHost, &c.MerchantID, &c.MerchantName,
		&c.APIVersion, &c.APIPasswordSealed, &active, &verifiedAt, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	c.Active = active != 0
	c.VerifiedAt = parseTimePtr(verifiedAt)
	c.CreatedAt = parseTime(createdAt)
	c.UpdatedAt = parseTime(updatedAt)
	return &c, nil
}

// UpsertGatewayCredential stores one of an operator's MPGS identities and makes
// it the one they are working in. The caller is responsible for having already
// sealed the API password.
func (s *Store) UpsertGatewayCredential(c *domain.GatewayCredential) error {
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	if !c.Environment.Valid() {
		c.Environment = domain.EnvTest
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
		INSERT INTO gateway_credentials
			(user_id, environment, gateway_host, mpgs_merchant_id, merchant_name, api_version,
			 api_password_sealed, is_active, verified_at, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,1,?,?,?)
		ON DUPLICATE KEY UPDATE
			gateway_host        = VALUES(gateway_host),
			mpgs_merchant_id    = VALUES(mpgs_merchant_id),
			merchant_name       = VALUES(merchant_name),
			api_version         = VALUES(api_version),
			api_password_sealed = VALUES(api_password_sealed),
			is_active           = 1,
			verified_at         = VALUES(verified_at),
			updated_at          = VALUES(updated_at)`,
		c.UserID, string(c.Environment), c.GatewayHost, c.MerchantID, c.MerchantName, c.APIVersion,
		c.APIPasswordSealed, fmtTimePtr(c.VerifiedAt), fmtTime(c.CreatedAt), fmtTime(c.UpdatedAt),
	); err != nil {
		return err
	}
	// At most one active connection per operator — connecting a gateway is also
	// how you switch to it.
	if _, err := tx.Exec(
		`UPDATE gateway_credentials SET is_active = 0 WHERE user_id = ? AND environment <> ?`,
		c.UserID, string(c.Environment),
	); err != nil {
		return err
	}
	c.Active = true
	return tx.Commit()
}

// GatewayCredentialFor returns one specific environment's connection.
func (s *Store) GatewayCredentialFor(
	userID string, env domain.Environment,
) (*domain.GatewayCredential, error) {
	return scanCredential(s.db.QueryRow(
		`SELECT `+credentialColumns+` FROM gateway_credentials
		 WHERE user_id = ? AND environment = ?`, userID, string(env)))
}

// ActiveGatewayCredential is the connection the operator is currently working
// in. Falls back to any verified connection, so a database that predates the
// is_active flag still resolves.
func (s *Store) ActiveGatewayCredential(userID string) (*domain.GatewayCredential, error) {
	return scanCredential(s.db.QueryRow(
		`SELECT `+credentialColumns+` FROM gateway_credentials WHERE user_id = ?
		 ORDER BY is_active DESC, verified_at IS NULL, updated_at DESC LIMIT 1`, userID))
}

// GatewayCredentials returns every environment an operator has connected.
func (s *Store) GatewayCredentials(userID string) ([]*domain.GatewayCredential, error) {
	rows, err := s.db.Query(
		`SELECT `+credentialColumns+` FROM gateway_credentials WHERE user_id = ?
		 ORDER BY environment ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.GatewayCredential{}
	for rows.Next() {
		c, err := scanCredential(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ActiveEnvironment is which mode the operator's screens are showing. Test
// unless they have deliberately connected and switched to live.
func (s *Store) ActiveEnvironment(userID string) domain.Environment {
	record, err := s.ActiveGatewayCredential(userID)
	if err != nil || record.VerifiedAt == nil {
		return domain.EnvTest
	}
	return record.Environment
}

// SetActiveEnvironment switches the operator between connections they already
// hold. It refuses to switch to one that was never verified.
func (s *Store) SetActiveEnvironment(userID string, env domain.Environment) error {
	record, err := s.GatewayCredentialFor(userID, env)
	if err != nil {
		return err
	}
	if record.VerifiedAt == nil {
		return ErrNotFound
	}
	_, err = s.db.Exec(
		`UPDATE gateway_credentials SET is_active = (environment = ?) WHERE user_id = ?`,
		string(env), userID)
	return err
}

func (s *Store) DeleteGatewayCredential(userID string, env domain.Environment) error {
	_, err := s.db.Exec(
		`DELETE FROM gateway_credentials WHERE user_id = ? AND environment = ?`,
		userID, string(env))
	if err != nil {
		return err
	}
	// Leave the operator in whatever connection remains rather than in none.
	//
	// Two statements rather than one: MySQL refuses to update a table while a
	// subquery reads from it (error 1093), so the check happens here instead.
	var active int
	if err := s.db.QueryRow(
		`SELECT COUNT(1) FROM gateway_credentials WHERE user_id = ? AND is_active = 1`,
		userID).Scan(&active); err != nil {
		return err
	}
	if active > 0 {
		return nil
	}
	_, err = s.db.Exec(
		`UPDATE gateway_credentials SET is_active = 1 WHERE user_id = ?`, userID)
	return err
}

// HasVerifiedCredentialFor reports whether one specific gateway is connected.
//
// The API needs this rather than the any-environment question: a test API key
// must produce a test link even when its owner has since connected live and is
// working in it, so "are they connected at all" is the wrong thing to ask.
func (s *Store) HasVerifiedCredentialFor(userID string, env domain.Environment) (bool, error) {
	var n int
	err := s.db.QueryRow(`
		SELECT COUNT(1) FROM gateway_credentials
		WHERE user_id = ? AND environment = ? AND verified_at IS NOT NULL`,
		userID, string(env)).Scan(&n)
	return n > 0, err
}

// HasVerifiedCredential reports whether the operator may create payment links
// at all — in any environment.
func (s *Store) HasVerifiedCredential(userID string) (bool, error) {
	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(1) FROM gateway_credentials WHERE user_id = ? AND verified_at IS NOT NULL`,
		userID).Scan(&n)
	return n > 0, err
}
