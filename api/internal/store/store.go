// Package store is the persistence layer, on MySQL 8.
//
// Every statement is parameterised and the SQL stays close to standard, so the
// only MySQL-specific pieces are the upserts (ON DUPLICATE KEY UPDATE) and the
// information_schema lookups used by migrations.
package store

import (
	"crypto/rand"
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

//go:embed schema.sql
var schema string

var ErrNotFound = errors.New("not found")

type Store struct{ db *sql.DB }

// Open connects to MySQL and applies the schema.
//
// dsn is a go-sql-driver DSN — user:pass@tcp(host:3306)/db. Three parameters
// are forced on rather than left to whoever writes the connection string,
// because each one is a correctness issue, not a preference:
//
//	parseTime=false   timestamps are RFC3339 strings; letting the driver hand
//	                  back time.Time would break the string comparisons the
//	                  analytics queries are built on
//	charset utf8mb4   Amharic has to survive the round trip
//	multiStatements   the schema is applied in one Exec
func Open(dsn string) (*Store, error) {
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("store: PAYLINK_DATABASE is not a valid MySQL DSN: %w", err)
	}
	cfg.ParseTime = false
	cfg.MultiStatements = true
	cfg.Params = map[string]string{"charset": "utf8mb4"}
	if cfg.Collation == "" {
		cfg.Collation = "utf8mb4_0900_ai_ci"
	}
	// Without this a network blip leaves a connection that looks alive and
	// fails on the next statement instead of being replaced.
	cfg.CheckConnLiveness = true

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("store: open: %w", err)
	}
	// MySQL handles concurrent writers, so the single-connection limit that
	// SQLite needed is gone. Bounded so a burst cannot exhaust the server's
	// connection budget, and recycled so a load balancer's idle timeout does
	// not leave us holding dead sockets.
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(time.Minute)

	// A managed database may still be starting when we are; a few seconds of
	// patience beats a crash loop.
	if err := waitForDatabase(db, 30*time.Second); err != nil {
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("store: apply schema: %w", err)
	}
	st := &Store{db: db}
	if err := st.migrate(); err != nil {
		return nil, err
	}
	return st, nil
}

// migrate brings a database created by an earlier version up to date.
//
// CREATE TABLE IF NOT EXISTS in schema.sql covers a new table, but it does
// nothing at all to a table that already exists. A column added later has to be
// applied here instead, where it reaches a database that is already carrying
// data — which on a live deployment is every database that matters.
func (s *Store) migrate() error {
	// Which integration created a link, so a payment made against it can be
	// reported back to the system that asked for it. NULL for anything made in
	// the portal by hand, which is most links.
	if err := s.ensureColumn("pay_links", "integration_id", "VARCHAR(64) NULL"); err != nil {
		return err
	}
	// Where this link's payer is returned to. Per link rather than per
	// integration because a fundraising platform wants a donor sent back to the
	// campaign they gave to, not to one address for everything it runs.
	if err := s.ensureColumn(
		"pay_links", "callback_success_url", "VARCHAR(512) NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	return s.ensureColumn(
		"pay_links", "callback_failure_url", "VARCHAR(512) NOT NULL DEFAULT ''")
}

func waitForDatabase(db *sql.DB, limit time.Duration) error {
	deadline := time.Now().Add(limit)
	var err error
	for {
		if err = db.Ping(); err == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("store: database not reachable after %s: %w", limit, err)
		}
		slog.Info("waiting for the database", "error", err)
		time.Sleep(time.Second)
	}
}

// hasColumn reports whether a column exists, for migrations added later.
// MySQL has no ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so this is how a
// column is added to a database that is already carrying data.
func (s *Store) hasColumn(table, column string) (bool, error) {
	var n int
	err := s.db.QueryRow(`
		SELECT COUNT(1) FROM information_schema.columns
		WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
		table, column).Scan(&n)
	if err != nil {
		return false, fmt.Errorf("store: inspect %s.%s: %w", table, column, err)
	}
	return n > 0, nil
}

// ensureColumn adds a column when the database predates it.
func (s *Store) ensureColumn(table, column, definition string) error {
	has, err := s.hasColumn(table, column)
	if err != nil || has {
		return err
	}
	if _, err := s.db.Exec(
		fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition),
	); err != nil {
		return fmt.Errorf("store: add %s.%s: %w", table, column, err)
	}
	slog.Info("added column", "table", table, "column", column)
	return nil
}

func (s *Store) Close() error { return s.db.Close() }
func (s *Store) DB() *sql.DB  { return s.db }

// ---------------------------------------------------------------- time helpers

// Times are stored as RFC3339 text so behaviour does not depend on driver
// timestamp conversion.
func fmtTime(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }

func fmtTimePtr(t *time.Time) any {
	if t == nil {
		return nil
	}
	return fmtTime(*t)
}

func parseTime(s string) time.Time {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC()
		}
	}
	return time.Time{}
}

func parseTimePtr(ns sql.NullString) *time.Time {
	if !ns.Valid || ns.String == "" {
		return nil
	}
	t := parseTime(ns.String)
	if t.IsZero() {
		return nil
	}
	return &t
}

func nullString(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// ------------------------------------------------------------------ id helpers

const slugAlphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func randomInt(max int64) int64 {
	n, err := rand.Int(rand.Reader, big.NewInt(max))
	if err != nil {
		// crypto/rand failing is not something we can paper over.
		panic(fmt.Sprintf("store: crypto/rand unavailable: %v", err))
	}
	return n.Int64()
}

// NewSlug returns the short, unambiguous code that appears in a pay link URL.
func NewSlug(n int) string {
	var b strings.Builder
	for i := 0; i < n; i++ {
		b.WriteByte(slugAlphabet[randomInt(int64(len(slugAlphabet)))])
	}
	return b.String()
}

// NewToken returns a URL-safe secret for invite links.
func NewToken() string { return NewSlug(40) }

func newID(prefix string, digits int64) string {
	return fmt.Sprintf("%s-%d", prefix, randomInt(digits))
}

// UniqueSlug retries until it finds a slug no link is using.
func (s *Store) UniqueSlug() (string, error) {
	for attempt := 0; attempt < 12; attempt++ {
		slug := NewSlug(6)
		var exists int
		err := s.db.QueryRow(`SELECT COUNT(1) FROM pay_links WHERE slug = ?`, slug).Scan(&exists)
		if err != nil {
			return "", err
		}
		if exists == 0 {
			return slug, nil
		}
	}
	return "", errors.New("store: could not allocate a unique slug")
}

func (s *Store) uniqueID(table, prefix string, base, span int64) (string, error) {
	for attempt := 0; attempt < 24; attempt++ {
		id := fmt.Sprintf("%s-%d", prefix, base+randomInt(span))
		var exists int
		q := fmt.Sprintf(`SELECT COUNT(1) FROM %s WHERE id = ?`, table)
		if err := s.db.QueryRow(q, id).Scan(&exists); err != nil {
			return "", err
		}
		if exists == 0 {
			return id, nil
		}
	}
	return "", fmt.Errorf("store: could not allocate a unique %s id", table)
}
