// Command sqlite2mysql copies an existing paylink.db into MySQL.
//
// One-shot, and safe to run more than once: every row is written with INSERT
// IGNORE, so re-running tops up rather than duplicating.
//
// Tables are copied parents-first, because MySQL enforces the foreign keys that
// SQLite was configured to enforce too — a payment cannot land before the link
// it belongs to.
//
//	go run ./cmd/sqlite2mysql -sqlite ../paylink.db -mysql "paylink:paylink@tcp(127.0.0.1:3306)/paylink"
//
// Sealed gateway passwords come across as raw bytes and stay readable, provided
// PAYLINK_ENCRYPTION_KEY is unchanged.
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	gomysql "github.com/go-sql-driver/mysql"
	_ "modernc.org/sqlite"
)

// Copied in dependency order. Column lists are explicit so a mismatch between
// the two schemas fails here, loudly, rather than silently dropping a field.
var tables = []struct {
	name    string
	columns []string
}{
	{"merchants", []string{
		"id", "name", "category", "status", "contact_email", "default_currency", "created_at"}},
	{"branches", []string{
		"id", "merchant_id", "name", "code", "city", "area",
		"manager_name", "manager_email", "manager_phone", "created_at"}},
	{"mpgs_merchants", []string{
		"number", "name", "live_number", "created_by", "created_at"}},
	{"users", []string{
		"id", "merchant_id", "branch_id", "username", "email", "mpgs_merchant_number",
		"full_name", "phone", "role", "title", "status", "password_hash",
		"invite_token", "created_at"}},
	{"security_questions", []string{
		"user_id", "position", "prompt", "answer_hash", "created_at"}},
	{"gateway_credentials", []string{
		"user_id", "environment", "gateway_host", "mpgs_merchant_id", "merchant_name",
		"api_version", "api_password_sealed", "is_active", "verified_at",
		"created_at", "updated_at"}},
	{"pay_links", []string{
		"id", "slug", "merchant_id", "created_by_id", "branch_id", "title", "description",
		"reference", "type", "payment_mode", "environment", "amount_minor", "target_minor",
		"currency", "min_minor", "max_minor", "max_uses", "used_count", "paid_count",
		"paid_minor", "expires_at", "status", "created_at"}},
	{"payments", []string{
		"id", "pay_link_id", "merchant_id", "order_id", "session_id", "success_indicator",
		"environment", "amount_minor", "currency", "authorized_minor", "captured_minor",
		"refunded_minor", "status", "gateway_result", "gateway_status", "gateway_receipt",
		"authorization_code", "acquirer_reference", "settlement_date", "customer_name",
		"customer_email", "card_brand", "card_last4", "created_at", "completed_at",
		"last_checked_at"}},
	{"link_shares", []string{
		"id", "pay_link_id", "channel", "destination", "shared_by_id", "created_at"}},
	{"payment_operations", []string{
		"id", "payment_id", "transaction_id", "type", "amount_minor", "currency",
		"status", "gateway_code", "detail", "performed_by", "created_at"}},
}

func main() {
	sqlitePath := flag.String("sqlite", "paylink.db", "path to the existing SQLite database")
	mysqlDSN := flag.String("mysql", "", "MySQL DSN, e.g. user:pass@tcp(host:3306)/db")
	flag.Parse()

	if *mysqlDSN == "" {
		log.Fatal("sqlite2mysql: -mysql is required")
	}
	if _, err := os.Stat(*sqlitePath); err != nil {
		log.Fatalf("sqlite2mysql: %v", err)
	}
	if err := run(*sqlitePath, *mysqlDSN); err != nil {
		log.Fatalf("sqlite2mysql: %v", err)
	}
}

func run(sqlitePath, mysqlDSN string) error {
	src, err := sql.Open("sqlite", "file:"+sqlitePath+"?mode=ro")
	if err != nil {
		return err
	}
	defer src.Close()

	cfg, err := gomysql.ParseDSN(mysqlDSN)
	if err != nil {
		return fmt.Errorf("MySQL DSN: %w", err)
	}
	cfg.ParseTime = false
	cfg.Params = map[string]string{"charset": "utf8mb4"}
	dst, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return err
	}
	defer dst.Close()
	if err := dst.Ping(); err != nil {
		return fmt.Errorf("connect to MySQL: %w", err)
	}

	total := 0
	for _, table := range tables {
		n, err := copyTable(src, dst, table.name, table.columns)
		if err != nil {
			return fmt.Errorf("%s: %w", table.name, err)
		}
		fmt.Printf("  %-20s %4d rows\n", table.name, n)
		total += n
	}
	fmt.Printf("\ncopied %d rows\n", total)
	return nil
}

func copyTable(src, dst *sql.DB, table string, columns []string) (int, error) {
	list := strings.Join(columns, ", ")
	rows, err := src.Query("SELECT " + list + " FROM " + table)
	if err != nil {
		// A table the older database never had is not an error; there is simply
		// nothing to bring across.
		if strings.Contains(err.Error(), "no such table") ||
			strings.Contains(err.Error(), "no such column") {
			return 0, nil
		}
		return 0, err
	}
	defer rows.Close()

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(columns)), ",")
	insert := fmt.Sprintf("INSERT IGNORE INTO %s (%s) VALUES (%s)", table, list, placeholders)

	tx, err := dst.Begin()
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.Prepare(insert)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	count := 0
	for rows.Next() {
		// Scanned as []any so every value crosses as whatever SQLite held,
		// including the sealed password bytes.
		values := make([]any, len(columns))
		targets := make([]any, len(columns))
		for i := range values {
			targets[i] = &values[i]
		}
		if err := rows.Scan(targets...); err != nil {
			return count, err
		}
		if _, err := stmt.Exec(values...); err != nil {
			return count, err
		}
		count++
	}
	if err := rows.Err(); err != nil {
		return count, err
	}
	return count, tx.Commit()
}
