// Package money keeps amounts in minor units so nothing is ever rounded by a
// float, and formats them the way the gateway expects ("250.00").
package money

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Currencies whose minor unit is not 1/100. Everything else defaults to 2.
var exponents = map[string]int{
	"JPY": 0, "KRW": 0, "VND": 0, "CLP": 0, "ISK": 0, "XOF": 0, "XAF": 0,
	"BHD": 3, "JOD": 3, "KWD": 3, "OMR": 3, "TND": 3,
}

func Exponent(currency string) int {
	if e, ok := exponents[strings.ToUpper(currency)]; ok {
		return e
	}
	return 2
}

// Format renders minor units as the gateway's decimal string.
func Format(minor int64, currency string) string {
	exp := Exponent(currency)
	if exp == 0 {
		return strconv.FormatInt(minor, 10)
	}
	neg := minor < 0
	if neg {
		minor = -minor
	}
	div := int64(math.Pow10(exp))
	whole, frac := minor/div, minor%div
	s := fmt.Sprintf("%d.%0*d", whole, exp, frac)
	if neg {
		s = "-" + s
	}
	return s
}

// Parse reads a human-entered amount ("1,240.50") into minor units.
func Parse(raw, currency string) (int64, error) {
	s := strings.TrimSpace(raw)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, " ", "")
	if s == "" {
		return 0, fmt.Errorf("amount is required")
	}
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")

	whole, frac, hasFrac := strings.Cut(s, ".")
	if whole == "" {
		whole = "0"
	}
	exp := Exponent(currency)
	if hasFrac {
		if len(frac) > exp {
			return 0, fmt.Errorf("%s allows at most %d decimal places", strings.ToUpper(currency), exp)
		}
		frac += strings.Repeat("0", exp-len(frac))
	} else {
		frac = strings.Repeat("0", exp)
	}

	digits := whole + frac
	for _, r := range digits {
		if r < '0' || r > '9' {
			return 0, fmt.Errorf("%q is not a valid amount", raw)
		}
	}
	minor, err := strconv.ParseInt(digits, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%q is not a valid amount", raw)
	}
	if neg {
		minor = -minor
	}
	return minor, nil
}

// Symbol is used for display only.
func Symbol(currency string) string {
	switch strings.ToUpper(currency) {
	case "USD":
		return "$"
	case "ETB":
		return "Br "
	case "EUR":
		return "€"
	case "GBP":
		return "£"
	default:
		return strings.ToUpper(currency) + " "
	}
}

// Display renders an amount for the UI, e.g. "$1,240.00".
func Display(minor int64, currency string) string {
	formatted := Format(minor, currency)
	whole, frac, hasFrac := strings.Cut(formatted, ".")
	neg := strings.HasPrefix(whole, "-")
	whole = strings.TrimPrefix(whole, "-")

	var b strings.Builder
	for i, d := range whole {
		if i > 0 && (len(whole)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(d)
	}
	out := Symbol(currency) + b.String()
	if hasFrac {
		out += "." + frac
	}
	if neg {
		out = "-" + out
	}
	return out
}
