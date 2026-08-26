package api

import (
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/money"
	"github.com/zemenbank/paylink/api/internal/store"
)

type statPoint struct {
	Day     string `json:"day"`
	Label   string `json:"label"`
	Minor   int64  `json:"minor"`
	Display string `json:"display"`
	Count   int    `json:"count"`
}

type rankedItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Initials string `json:"initials,omitempty"`
	Minor    int64  `json:"minor"`
	Display  string `json:"display"`
	Count    int    `json:"count"`
	Percent  int    `json:"percent"`
}

type currencyLine struct {
	Currency string `json:"currency"`
	Minor    int64  `json:"minor"`
	Display  string `json:"display"`
	Count    int    `json:"count"`
}

type analyticsResponse struct {
	Range    string `json:"range"`
	Currency string `json:"currency"`
	// Which gateway these figures come from — test money is never real money.
	Environment string `json:"environment"`
	// How the chart is grouped: day, week or month.
	Bucket string `json:"bucket"`

	CollectedDisplay string   `json:"collectedDisplay"`
	CollectedMinor   int64    `json:"collectedMinor"`
	CollectedChange  *float64 `json:"collectedChange"`

	SuccessfulCount  int      `json:"successfulCount"`
	SuccessfulChange *float64 `json:"successfulChange"`

	SuccessRate    float64 `json:"successRate"`
	FailedCount    int     `json:"failedCount"`
	RefundedCount  int     `json:"refundedCount"`
	PendingCount   int     `json:"pendingCount"`
	AbandonedCount int     `json:"abandonedCount"`
	Attempts       int     `json:"attempts"`

	AvgTicketDisplay string `json:"avgTicketDisplay"`

	Daily        []statPoint    `json:"daily"`
	TopLinks     []rankedItem   `json:"topLinks"`
	TopOperators []rankedItem   `json:"topOperators"`
	OtherTotals  []currencyLine `json:"otherTotals"`
	HasData      bool           `json:"hasData"`
}

// rangeWindow turns the UI's chip into a window, plus the equally long window
// immediately before it so a change percentage compares like with like.
//
// Windows are day-aligned: "7D" means today and the six days before it, which
// is what the chip promises, rather than a rolling 168 hours that would cut the
// earliest day in half. The bucket is how finely that window can be charted.
func rangeWindow(key string, now time.Time) (from, to, prevFrom time.Time, label, bucket string) {
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	to = day.AddDate(0, 0, 1) // up to the end of today
	switch strings.ToLower(key) {
	case "7d":
		from, bucket = day.AddDate(0, 0, -6), bucketDay
	case "90d":
		from, bucket = day.AddDate(0, 0, -89), bucketWeek
	case "ytd":
		from, bucket = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC), bucketMonth
	default:
		key, from, bucket = "30d", day.AddDate(0, 0, -29), bucketDay
	}
	return from, to, from.Add(-to.Sub(from)), key, bucket
}

const (
	bucketDay   = "day"
	bucketWeek  = "week"
	bucketMonth = "month"
)

// buildSeries lays the window out bucket by bucket, empty ones included: a day
// that took nothing is a fact about the period, not a gap to be skipped. Ninety
// days would be unreadable as ninety bars, so the longer ranges group up.
func buildSeries(points []store.DailyPoint, from, to time.Time, bucket, currency string) []statPoint {
	var starts []time.Time
	switch bucket {
	case bucketWeek:
		for d := from; d.Before(to); d = d.AddDate(0, 0, 7) {
			starts = append(starts, d)
		}
	case bucketMonth:
		first := time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, time.UTC)
		for d := first; d.Before(to); d = d.AddDate(0, 1, 0) {
			starts = append(starts, d)
		}
	default:
		for d := from; d.Before(to); d = d.AddDate(0, 0, 1) {
			starts = append(starts, d)
		}
	}

	series := make([]statPoint, 0, len(starts))
	for _, start := range starts {
		label := start.Format("02 Jan")
		if bucket == bucketMonth {
			label = start.Format("Jan")
		}
		series = append(series, statPoint{
			Day: start.Format("2006-01-02"), Label: label,
			Display: money.Display(0, currency),
		})
	}

	for _, p := range points {
		day, err := time.Parse("2006-01-02", p.Day)
		if err != nil {
			continue
		}
		// The last bucket that starts on or before this day owns it.
		idx := -1
		for i, start := range starts {
			if !day.Before(start) {
				idx = i
			}
		}
		if idx < 0 {
			continue
		}
		series[idx].Minor += p.NetMinor
		series[idx].Count += p.Count
		series[idx].Display = money.Display(series[idx].Minor, currency)
	}
	return series
}

// changePercent is nil when the preceding window has nothing to compare
// against. Reporting that as +100% would invent a trend out of a first week.
func changePercent(current, previous int64) *float64 {
	if previous == 0 {
		return nil
	}
	v := math.Round((float64(current-previous)/float64(previous))*1000) / 10
	return &v
}

func (s *Server) handleAnalytics(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	// Bring in-flight payments up to date first, so the figures are not stale.
	s.reconcileScope(r.Context(), user)

	now := time.Now().UTC()
	from, to, prevFrom, rangeKey, bucket := rangeWindow(r.URL.Query().Get("range"), now)

	// Figures are for one environment only. Rehearsal money is not revenue, and
	// adding the two would misstate both.
	env := s.environmentFor(user)
	filter := store.AnalyticsFilter{From: from, To: to, Environment: env}
	previous := store.AnalyticsFilter{From: prevFrom, To: from, Environment: env}
	switch user.Role {
	case domain.RoleSales:
		filter.CreatedByID, previous.CreatedByID = user.ID, user.ID
	case domain.RoleMerchant:
		filter.MerchantID, previous.MerchantID = user.MerchantID, user.MerchantID
	}

	totals, err := s.store.TotalsByCurrency(filter)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not build your analytics.")
		return
	}

	// Everything below is reported in one currency. Mixing them would need an FX
	// rate we do not have, so the busiest currency leads and the rest are listed
	// separately rather than being folded in.
	primary := "USD"
	if m, err := s.store.MerchantByID(user.MerchantID); err == nil && m.DefaultCurrency != "" {
		primary = m.DefaultCurrency
	}
	if len(totals) > 0 {
		primary = totals[0].Currency
	}

	// Every list is initialised: a nil slice marshals to `null`, and a client
	// reading `.length` off it would crash rather than render an empty section.
	resp := analyticsResponse{
		Range: rangeKey, Currency: primary, Bucket: bucket, Environment: string(env),
		Daily: []statPoint{}, TopLinks: []rankedItem{},
		TopOperators: []rankedItem{}, OtherTotals: []currencyLine{},
	}
	for _, t := range totals {
		if t.Currency == primary {
			resp.CollectedMinor = t.NetMinor
			resp.CollectedDisplay = money.Display(t.NetMinor, t.Currency)
			if t.Count > 0 {
				resp.AvgTicketDisplay = money.Display(t.NetMinor/int64(t.Count), t.Currency)
			}
			resp.HasData = t.Count > 0
			continue
		}
		resp.OtherTotals = append(resp.OtherTotals, currencyLine{
			Currency: t.Currency,
			Minor:    t.NetMinor,
			Display:  money.Display(t.NetMinor, t.Currency),
			Count:    t.Count,
		})
	}
	if resp.CollectedDisplay == "" {
		resp.CollectedDisplay = money.Display(0, primary)
		resp.AvgTicketDisplay = money.Display(0, primary)
	}

	// Change against the preceding window of the same length. A currency that
	// was not traded then leaves the comparison at nil rather than at zero.
	if prevTotals, err := s.store.TotalsByCurrency(previous); err == nil {
		for _, t := range prevTotals {
			if t.Currency == primary {
				resp.CollectedChange = changePercent(resp.CollectedMinor, t.NetMinor)
				break
			}
		}
	}

	committed, _ := s.store.CommittedCount(filter)
	resp.SuccessfulCount = committed
	if prevCommitted, err := s.store.CommittedCount(previous); err == nil {
		resp.SuccessfulChange = changePercent(int64(committed), int64(prevCommitted))
	}

	if counts, err := s.store.StatusCounts(filter); err == nil {
		for status, n := range counts {
			resp.Attempts += n
			switch domain.PaymentStatus(status) {
			case domain.PaymentFailed:
				resp.FailedCount += n
			case domain.PaymentRefunded, domain.PaymentPartiallyRefunded:
				resp.RefundedCount += n
			case domain.PaymentInitiated:
				resp.PendingCount += n
			case domain.PaymentCancelled, domain.PaymentExpired:
				// A checkout that was opened and never finished.
				resp.AbandonedCount += n
			}
		}
		if resp.Attempts > 0 {
			rate := float64(committed) / float64(resp.Attempts) * 100
			resp.SuccessRate = math.Round(rate*10) / 10
		}
	}

	if series, err := s.store.DailySeries(filter, primary); err == nil {
		resp.Daily = buildSeries(series, from, to, bucket, primary)
	}

	resp.TopLinks = rank(s.store.TopLinks(filter, primary, 5))
	// An operator only ever sees themselves here, so the leaderboard is for the
	// merchant and the bank; it is still returned and the client decides.
	resp.TopOperators = rank(s.store.TopOperators(filter, primary, 5))
	for i := range resp.TopOperators {
		resp.TopOperators[i].Initials = initials(resp.TopOperators[i].Name)
	}

	httpx.JSON(w, http.StatusOK, resp)
}

// rank converts store rows into view items, sized against the leader so the
// bars are relative to the best performer rather than an arbitrary maximum.
func rank(items []store.NamedTotal, err error) []rankedItem {
	out := []rankedItem{}
	if err != nil || len(items) == 0 {
		return out
	}
	top := items[0].NetMinor
	for _, it := range items {
		percent := 0
		if top > 0 {
			percent = int(it.NetMinor * 100 / top)
		}
		out = append(out, rankedItem{
			ID: it.ID, Name: it.Name, Minor: it.NetMinor,
			Display: money.Display(it.NetMinor, it.Currency),
			Count:   it.Count, Percent: percent,
		})
	}
	return out
}
