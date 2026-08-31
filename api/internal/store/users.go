package store

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

const userColumns = `id, COALESCE(merchant_id,''), COALESCE(branch_id,''), username, email,
	mpgs_merchant_number, full_name,
	phone, role, title, status, password_hash, invite_token, created_at`

func scanUser(row interface{ Scan(...any) error }) (*domain.User, error) {
	var u domain.User
	var createdAt string
	err := row.Scan(&u.ID, &u.MerchantID, &u.BranchID, &u.Username, &u.Email,
		&u.MPGSMerchantNumber, &u.FullName,
		&u.Phone, &u.Role, &u.Title, &u.Status, &u.PasswordHash, &u.InviteToken, &createdAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	u.CreatedAt = parseTime(createdAt)
	return &u, nil
}

func (s *Store) CreateUser(u *domain.User) error {
	if u.ID == "" {
		prefix, base, span := "USR", int64(1000), int64(9000)
		switch u.Role {
		case domain.RoleSales:
			prefix, base, span = "SL", 10, 990
		case domain.RoleMerchant:
			prefix, base, span = "MU", 100, 900
		case domain.RoleAdmin:
			prefix, base, span = "AD", 10, 90
		case domain.RoleMerchantManagement:
			prefix, base, span = "MM", 10, 90
		}
		id, err := s.uniqueID("users", prefix, base, span)
		if err != nil {
			return err
		}
		u.ID = id
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	if strings.TrimSpace(u.Username) == "" {
		u.Username = strings.TrimSpace(u.Email)
	}
	_, err := s.db.Exec(`
		INSERT INTO users (id, merchant_id, branch_id, username, email, mpgs_merchant_number,
		                   full_name, phone, role,
		                   title, status, password_hash, invite_token, created_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		u.ID, nullString(u.MerchantID), nullString(u.BranchID),
		strings.TrimSpace(u.Username), strings.TrimSpace(u.Email), u.MPGSMerchantNumber,
		u.FullName, u.Phone, string(u.Role), u.Title, string(u.Status),
		u.PasswordHash, u.InviteToken, fmtTime(u.CreatedAt))
	return err
}

// UserByLogin resolves what someone typed in the sign-in box. Username is the
// identifier now; the email fallback keeps accounts created before that change
// working with the address their owners already know.
func (s *Store) UserByLogin(login string) (*domain.User, error) {
	login = strings.TrimSpace(login)
	if login == "" {
		return nil, ErrNotFound
	}
	u, err := scanUser(s.db.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE username = ?`, login))
	if err == nil || !errors.Is(err, ErrNotFound) {
		return u, err
	}
	return s.UserByEmail(login)
}

// UsernameTaken reports whether a username is already registered.
func (s *Store) UsernameTaken(username string) (bool, error) {
	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(1) FROM users WHERE username = ?`,
		strings.TrimSpace(username)).Scan(&n)
	return n > 0, err
}

func (s *Store) UserByEmail(email string) (*domain.User, error) {
	return scanUser(s.db.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE email = ?`,
		strings.TrimSpace(email)))
}

func (s *Store) UserByID(id string) (*domain.User, error) {
	return scanUser(s.db.QueryRow(`SELECT `+userColumns+` FROM users WHERE id = ?`, id))
}

func (s *Store) UserByInviteToken(token string) (*domain.User, error) {
	if token == "" {
		return nil, ErrNotFound
	}
	return scanUser(s.db.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE invite_token = ?`, token))
}

// ActivateUser sets the password chosen during invite acceptance and burns the
// invite token so the link cannot be replayed.
func (s *Store) ActivateUser(id, passwordHash string) error {
	_, err := s.db.Exec(
		`UPDATE users SET password_hash = ?, status = ?, invite_token = '' WHERE id = ?`,
		passwordHash, string(domain.UserActive), id)
	return err
}

func (s *Store) SetPassword(id, passwordHash string) error {
	_, err := s.db.Exec(`UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, id)
	return err
}

func (s *Store) TeamByMerchant(merchantID string) ([]*domain.User, error) {
	rows, err := s.db.Query(
		`SELECT `+userColumns+` FROM users
		 WHERE merchant_id = ? AND role = ? ORDER BY created_at`,
		merchantID, string(domain.RoleSales))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*domain.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) CountUsers() (int, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(1) FROM users`).Scan(&n)
	return n, err
}

// UsersByRole lists every account holding a role, oldest first.
func (s *Store) UsersByRole(role domain.Role) ([]*domain.User, error) {
	rows, err := s.db.Query(
		`SELECT `+userColumns+` FROM users WHERE role = ? ORDER BY created_at`, string(role))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.User{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// SetUserMerchantNumber ties an operator to a registered merchant.
func (s *Store) SetUserMerchantNumber(id, number string) error {
	_, err := s.db.Exec(
		`UPDATE users SET mpgs_merchant_number = ? WHERE id = ?`, strings.TrimSpace(number), id)
	return err
}

// SetUserMerchant records which merchant row an operator's work belongs to.
// Written as NULL rather than '' when empty: merchant_id is a foreign key, and
// no merchant is ever called the empty string.
func (s *Store) SetUserMerchant(id, merchantID string) error {
	_, err := s.db.Exec(
		`UPDATE users SET merchant_id = ? WHERE id = ?`,
		nullString(strings.TrimSpace(merchantID)), id)
	return err
}
