package store

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const integrationColumns = `id, merchant_id, owner_id, name, environment, api_key,
	secret_sealed, secret_hint, payload_key_sealed, callback_success_url,
	callback_failure_url, webhook_url, status, last_used_at, created_at, updated_at`

func scanIntegration(row interface{ Scan(...any) error }) (*domain.Integration, error) {
	var i domain.Integration
	var lastUsed sql.NullString
	var createdAt, updatedAt string
	err := row.Scan(&i.ID, &i.MerchantID, &i.OwnerID, &i.Name, &i.Environment, &i.APIKey,
		&i.SecretSealed, &i.SecretHint, &i.PayloadKeySealed, &i.CallbackSuccessURL,
		&i.CallbackFailureURL, &i.WebhookURL, &i.Status, &lastUsed, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	i.LastUsedAt = parseTimePtr(lastUsed)
	i.CreatedAt = parseTime(createdAt)
	i.UpdatedAt = parseTime(updatedAt)
	return &i, nil
}

func (s *Store) CreateIntegration(i *domain.Integration) error {
	if i.ID == "" {
		id, err := s.uniqueID("integrations", "INT", 1000, 9000)
		if err != nil {
			return err
		}
		i.ID = id
	}
	now := time.Now().UTC()
	if i.CreatedAt.IsZero() {
		i.CreatedAt = now
	}
	i.UpdatedAt = now
	if i.Status == "" {
		i.Status = domain.IntegrationActive
	}
	if !i.Environment.Valid() {
		i.Environment = domain.EnvTest
	}
	_, err := s.db.Exec(`
		INSERT INTO integrations (`+integrationColumns+`)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		i.ID, i.MerchantID, i.OwnerID, i.Name, string(i.Environment), i.APIKey,
		i.SecretSealed, i.SecretHint, i.PayloadKeySealed, i.CallbackSuccessURL,
		i.CallbackFailureURL, i.WebhookURL, string(i.Status), fmtTimePtr(i.LastUsedAt),
		fmtTime(i.CreatedAt), fmtTime(i.UpdatedAt))
	return err
}

// IntegrationByAPIKey is the hot path: every API call starts here. Indexed on
// a unique key, and it deliberately does not filter on status — a suspended
// integration must be told it is suspended rather than that its key is wrong,
// which would send an integrator hunting for a credential problem they do not
// have.
func (s *Store) IntegrationByAPIKey(apiKey string) (*domain.Integration, error) {
	return scanIntegration(s.db.QueryRow(
		`SELECT `+integrationColumns+` FROM integrations WHERE api_key = ?`,
		strings.TrimSpace(apiKey)))
}

func (s *Store) IntegrationByID(id string) (*domain.Integration, error) {
	return scanIntegration(s.db.QueryRow(
		`SELECT `+integrationColumns+` FROM integrations WHERE id = ?`, id))
}

// IntegrationFor finds one owner's integration in one environment.
func (s *Store) IntegrationFor(
	ownerID, name string, env domain.Environment,
) (*domain.Integration, error) {
	return scanIntegration(s.db.QueryRow(
		`SELECT `+integrationColumns+` FROM integrations
		 WHERE owner_id = ? AND name = ? AND environment = ?`,
		ownerID, name, string(env)))
}

func (s *Store) IntegrationsForOwner(ownerID string) ([]*domain.Integration, error) {
	return s.integrationList(
		`SELECT `+integrationColumns+` FROM integrations WHERE owner_id = ?
		 ORDER BY name ASC, environment ASC`, ownerID)
}

func (s *Store) IntegrationsForMerchant(merchantID string) ([]*domain.Integration, error) {
	return s.integrationList(
		`SELECT `+integrationColumns+` FROM integrations WHERE merchant_id = ?
		 ORDER BY name ASC, environment ASC`, merchantID)
}

func (s *Store) integrationList(query string, args ...any) ([]*domain.Integration, error) {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.Integration{}
	for rows.Next() {
		i, err := scanIntegration(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, i)
	}
	return out, rows.Err()
}

// UpdateIntegrationEndpoints changes where a payer is returned to and where we
// report server to server. Credentials are untouched: changing a URL must not
// require reissuing keys, or nobody will ever correct a typo.
func (s *Store) UpdateIntegrationEndpoints(
	id, successURL, failureURL, webhookURL string,
) error {
	_, err := s.db.Exec(`
		UPDATE integrations
		SET callback_success_url = ?, callback_failure_url = ?, webhook_url = ?, updated_at = ?
		WHERE id = ?`,
		strings.TrimSpace(successURL), strings.TrimSpace(failureURL),
		strings.TrimSpace(webhookURL), fmtTime(time.Now().UTC()), id)
	return err
}

// RotateIntegrationSecrets replaces the signing secret and payload key in place.
// The API key stays, so an integrator rotates without re-registering.
func (s *Store) RotateIntegrationSecrets(id string, secretSealed []byte, hint string, payloadKeySealed []byte) error {
	_, err := s.db.Exec(`
		UPDATE integrations
		SET secret_sealed = ?, secret_hint = ?, payload_key_sealed = ?, updated_at = ?
		WHERE id = ?`,
		secretSealed, hint, payloadKeySealed, fmtTime(time.Now().UTC()), id)
	return err
}

func (s *Store) SetIntegrationStatus(id string, status domain.IntegrationStatus) error {
	_, err := s.db.Exec(
		`UPDATE integrations SET status = ?, updated_at = ? WHERE id = ?`,
		string(status), fmtTime(time.Now().UTC()), id)
	return err
}

// TouchIntegration records that credentials were used. Written on a best-effort
// basis by the middleware: knowing an integration has gone quiet is worth a
// cheap write, and losing one such write costs nothing.
func (s *Store) TouchIntegration(id string) error {
	_, err := s.db.Exec(
		`UPDATE integrations SET last_used_at = ? WHERE id = ?`,
		fmtTime(time.Now().UTC()), id)
	return err
}

// ------------------------------------------------------------ live requests

const liveRequestColumns = `id, integration_id, merchant_id, requested_by, status,
	note, reviewed_by, requested_at, reviewed_at`

func scanLiveRequest(row interface{ Scan(...any) error }) (*domain.LiveRequest, error) {
	var r domain.LiveRequest
	var reviewedAt sql.NullString
	var requestedAt string
	err := row.Scan(&r.ID, &r.IntegrationID, &r.MerchantID, &r.RequestedBy, &r.Status,
		&r.Note, &r.ReviewedBy, &requestedAt, &reviewedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	r.RequestedAt = parseTime(requestedAt)
	r.ReviewedAt = parseTimePtr(reviewedAt)
	return &r, nil
}

func (s *Store) CreateLiveRequest(r *domain.LiveRequest) error {
	if r.ID == "" {
		id, err := s.uniqueID("integration_live_requests", "LR", 100, 900)
		if err != nil {
			return err
		}
		r.ID = id
	}
	if r.RequestedAt.IsZero() {
		r.RequestedAt = time.Now().UTC()
	}
	if r.Status == "" {
		r.Status = domain.ReviewPending
	}
	_, err := s.db.Exec(`
		INSERT INTO integration_live_requests (`+liveRequestColumns+`)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		r.ID, r.IntegrationID, r.MerchantID, r.RequestedBy, string(r.Status),
		r.Note, r.ReviewedBy, fmtTime(r.RequestedAt), fmtTimePtr(r.ReviewedAt))
	return err
}

func (s *Store) LiveRequestByID(id string) (*domain.LiveRequest, error) {
	return scanLiveRequest(s.db.QueryRow(
		`SELECT `+liveRequestColumns+` FROM integration_live_requests WHERE id = ?`, id))
}

// OpenLiveRequestFor is what stops an integrator queuing the same request many
// times while an administrator is looking at the first one.
func (s *Store) OpenLiveRequestFor(integrationID string) (*domain.LiveRequest, error) {
	return scanLiveRequest(s.db.QueryRow(
		`SELECT `+liveRequestColumns+` FROM integration_live_requests
		 WHERE integration_id = ? AND status = 'pending'
		 ORDER BY requested_at DESC LIMIT 1`, integrationID))
}

func (s *Store) LiveRequests(status domain.ReviewStatus) ([]*domain.LiveRequest, error) {
	query := `SELECT ` + liveRequestColumns + ` FROM integration_live_requests`
	args := []any{}
	if status != "" {
		query += ` WHERE status = ?`
		args = append(args, string(status))
	}
	query += ` ORDER BY requested_at DESC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.LiveRequest{}
	for rows.Next() {
		r, err := scanLiveRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ReviewLiveRequest records a decision. Conditional on the request still being
// pending, so two administrators opening the same queue cannot both decide it.
func (s *Store) ReviewLiveRequest(
	id string, status domain.ReviewStatus, reviewedBy, note string,
) error {
	result, err := s.db.Exec(`
		UPDATE integration_live_requests
		SET status = ?, reviewed_by = ?, note = ?, reviewed_at = ?
		WHERE id = ? AND status = 'pending'`,
		string(status), reviewedBy, note, fmtTime(time.Now().UTC()), id)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------- metadata

// SetLinkMetadata replaces every pair on a link. Replacing rather than merging
// because the caller sent the whole set, and a key they dropped should not
// linger and be handed back to them later as though they still wanted it.
func (s *Store) SetLinkMetadata(linkID string, pairs []domain.MetadataPair) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM link_metadata WHERE pay_link_id = ?`, linkID); err != nil {
		return err
	}
	if len(pairs) > 0 {
		stmt, err := tx.Prepare(
			`INSERT INTO link_metadata (pay_link_id, meta_key, meta_value) VALUES (?,?,?)`)
		if err != nil {
			return err
		}
		defer stmt.Close()
		for _, p := range pairs {
			if _, err := stmt.Exec(linkID, p.Key, p.Value); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (s *Store) LinkMetadata(linkID string) ([]domain.MetadataPair, error) {
	rows, err := s.db.Query(
		`SELECT meta_key, meta_value FROM link_metadata WHERE pay_link_id = ? ORDER BY meta_key`,
		linkID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.MetadataPair{}
	for rows.Next() {
		var p domain.MetadataPair
		if err := rows.Scan(&p.Key, &p.Value); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// MetadataForPayment resolves the pairs through the link a payment was made
// against, which is what lets an integrator ask "which campaign was this for"
// with the order id alone.
func (s *Store) MetadataForPayment(orderID string) ([]domain.MetadataPair, error) {
	rows, err := s.db.Query(`
		SELECT m.meta_key, m.meta_value
		FROM link_metadata m
		JOIN pay_links l ON l.id = m.pay_link_id
		JOIN payments p ON p.pay_link_id = l.id
		WHERE p.order_id = ?
		ORDER BY m.meta_key`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.MetadataPair{}
	for rows.Next() {
		var p domain.MetadataPair
		if err := rows.Scan(&p.Key, &p.Value); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
