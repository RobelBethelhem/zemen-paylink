package store

import (
	"fmt"
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

// Analytics are derived from the payments table on demand rather than kept in a
// rollup: the volumes here are small, and a derived figure can never drift out
// of step with a refund or a late capture.

type AnalyticsFilter struct {
	MerchantID  string
	CreatedByID string
	// Environment is what stops rehearsal money being counted as revenue.
	Environment domain.Environment
	From        time.Time
	To          time.Time
}

// scope builds the WHERE fragment that keeps a caller to what they may see.
func (f AnalyticsFilter) scope() (string, []any) {
	where := ` WHERE p.created_at >= ? AND p.created_at < ?`
	args := []any{fmtTime(f.From), fmtTime(f.To)}
	if f.CreatedByID != "" {
		where += ` AND l.created_by_id = ?`
		args = append(args, f.CreatedByID)
	}
	if f.MerchantID != "" {
		where += ` AND p.merchant_id = ?`
		args = append(args, f.MerchantID)
	}
	if f.Environment.Valid() {
		where += ` AND p.environment = ?`
		args = append(args, string(f.Environment))
	}
	return where, args
}

const analyticsFrom = ` FROM payments p JOIN pay_links l ON l.id = p.pay_link_id`

// Money actually kept, and the payments that produced it.
const settledPredicate = ` AND p.captured_minor > 0`

// Payments where the payer committed funds, captured or merely reserved.
const committedPredicate = ` AND p.status IN ('authorized','partially_captured','paid','partially_refunded','refunded')`

type CurrencyTotal struct {
	Currency string
	NetMinor int64
	Count    int
}

// TotalsByCurrency returns net collected per currency. Amounts in different
// currencies are never added together — without an FX rate that would be a
// fabricated number.
func (s *Store) TotalsByCurrency(f AnalyticsFilter) ([]CurrencyTotal, error) {
	where, args := f.scope()
	rows, err := s.db.Query(`
		SELECT p.currency, COALESCE(SUM(p.captured_minor - p.refunded_minor),0), COUNT(1)`+
		analyticsFrom+where+settledPredicate+`
		GROUP BY p.currency ORDER BY COUNT(1) DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []CurrencyTotal{}
	for rows.Next() {
		var t CurrencyTotal
		if err := rows.Scan(&t.Currency, &t.NetMinor, &t.Count); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// StatusCounts totals every attempt in the window by outcome.
func (s *Store) StatusCounts(f AnalyticsFilter) (map[string]int, error) {
	where, args := f.scope()
	rows, err := s.db.Query(
		`SELECT p.status, COUNT(1)`+analyticsFrom+where+` GROUP BY p.status`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]int{}
	for rows.Next() {
		var status string
		var n int
		if err := rows.Scan(&status, &n); err != nil {
			return nil, err
		}
		out[status] = n
	}
	return out, rows.Err()
}

// CommittedCount is how many payers actually went through with it.
func (s *Store) CommittedCount(f AnalyticsFilter) (int, error) {
	where, args := f.scope()
	var n int
	err := s.db.QueryRow(`SELECT COUNT(1)`+analyticsFrom+where+committedPredicate, args...).Scan(&n)
	return n, err
}

type DailyPoint struct {
	Day      string
	NetMinor int64
	Count    int
}

// DailySeries buckets one currency's takings by day for the chart.
func (s *Store) DailySeries(f AnalyticsFilter, currency string) ([]DailyPoint, error) {
	where, args := f.scope()
	args = append(args, currency)
	rows, err := s.db.Query(`
		SELECT substr(p.created_at, 1, 10) AS day,
		       COALESCE(SUM(p.captured_minor - p.refunded_minor),0), COUNT(1)`+
		analyticsFrom+where+settledPredicate+` AND p.currency = ?
		GROUP BY day ORDER BY day ASC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []DailyPoint{}
	for rows.Next() {
		var d DailyPoint
		if err := rows.Scan(&d.Day, &d.NetMinor, &d.Count); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

type NamedTotal struct {
	ID       string
	Name     string
	Currency string
	NetMinor int64
	Count    int
}

// leaderboard ranks by takings within a single currency, so the ordering is
// always comparing like with like.
func (s *Store) leaderboard(
	f AnalyticsFilter, currency, idCol, nameCol string, limit int,
) ([]NamedTotal, error) {
	where, args := f.scope()
	args = append(args, currency, limit)
	// Every non-aggregated column is named in the GROUP BY. MySQL's default
	// ONLY_FULL_GROUP_BY rejects the shorter form, and it is right to: leaving
	// a column out asks the database to pick a row arbitrarily. The result is
	// unchanged — the name follows the id, and the currency is pinned by the
	// WHERE clause.
	q := fmt.Sprintf(`
		SELECT %s, %s, p.currency,
		       COALESCE(SUM(p.captured_minor - p.refunded_minor),0), COUNT(1)
		%s
		LEFT JOIN users u ON u.id = l.created_by_id
		%s %s AND p.currency = ?
		GROUP BY %s, %s, p.currency ORDER BY 4 DESC LIMIT ?`,
		idCol, nameCol, analyticsFrom, where, settledPredicate, idCol, nameCol)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []NamedTotal{}
	for rows.Next() {
		var t NamedTotal
		if err := rows.Scan(&t.ID, &t.Name, &t.Currency, &t.NetMinor, &t.Count); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) TopLinks(f AnalyticsFilter, currency string, limit int) ([]NamedTotal, error) {
	return s.leaderboard(f, currency, "l.id", "l.title", limit)
}

// TopOperators ranks the sales users whose links took the money.
func (s *Store) TopOperators(f AnalyticsFilter, currency string, limit int) ([]NamedTotal, error) {
	return s.leaderboard(f, currency, "l.created_by_id", "COALESCE(u.full_name,'Unknown')", limit)
}
