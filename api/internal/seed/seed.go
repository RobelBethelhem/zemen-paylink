// Package seed populates a fresh database with the demo workspace the
// prototype was designed around, so the portal has something to show on first
// run. It is a no-op once any user exists.
package seed

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/store"
)

const DemoPassword = "Zemen@2026"

type merchantSeed struct {
	id, name, category, status, contact, currency string
}

var merchants = []merchantSeed{
	{"MER-1042", "Sheba Trading PLC", "Retail & Trade", "Active", "admin@sheba.et", "USD"},
	{"MER-1039", "Habesha Breweries", "Manufacturing", "Active", "finance@habesha.et", "USD"},
	{"MER-1051", "Addis Electronics", "Electronics", "Active", "sales@addiselec.et", "USD"},
	{"MER-1063", "Lucy Boutique", "Fashion & Apparel", "Active", "hello@lucy.et", "USD"},
	{"MER-1070", "Enat Pharmacy", "Healthcare", "Suspended", "care@enat.et", "ETB"},
	{"MER-1088", "Ras Hotel Group", "Hospitality", "Pending", "it@rashotels.et", "ETB"},
}

type branchSeed struct {
	id, name, code, city, area, manager string
}

var branches = []branchSeed{
	{"BR-01", "Bole Branch", "BOL-001", "Addis Ababa", "Bole", "Yonas Kebede"},
	{"BR-02", "Kazanchis Branch", "KAZ-002", "Addis Ababa", "Kazanchis", "Hana Tesfaye"},
	{"BR-03", "Piassa Branch", "PIA-003", "Addis Ababa", "Piassa", "Dawit Alemu"},
	{"BR-04", "Megenagna Branch", "MEG-004", "Addis Ababa", "Megenagna", "Sara Girma"},
}

// The merchant number the demo operators trade under, and the name it trades
// as. Merchant management owns this register in real use; seeding one entry
// keeps the demo operators able to connect the test gateway.
const (
	demoMerchantNumber = "000000001100"
	demoMerchantName   = "Kunu Foods"
)

type operatorSeed struct {
	id, name, email, branch string
}

// Sales operators. These are the MPGS "Operator" accounts: each one connects
// their own gateway credentials after activating.
var operators = []operatorSeed{
	{"SL-11", "Meseret Abebe", "meseret.a@sheba.et", "BR-01"},
	{"SL-12", "Dawit Alemu", "dawit.a@sheba.et", "BR-02"},
	{"SL-13", "Selam Bekele", "selam.b@sheba.et", "BR-01"},
	{"SL-14", "Yohannes Tadesse", "yoh.t@sheba.et", "BR-04"},
}

// Run seeds the demo workspace if the database has no users yet.
//
// Demo accounts exist only in development. Their password is in the README, so
// creating them anywhere else would be handing out a working sign-in — the
// single worst thing this file could do.
func Run(st *store.Store, env string) error {
	if !IsDevelopment(env) {
		slog.Info("skipping demo seed outside development", "env", env)
		return nil
	}
	count, err := st.CountUsers()
	if err != nil {
		return fmt.Errorf("seed: count users: %w", err)
	}
	if count > 0 {
		return nil
	}

	hash, err := auth.HashPassword(DemoPassword)
	if err != nil {
		return fmt.Errorf("seed: hash demo password: %w", err)
	}
	created := time.Now().UTC().Add(-30 * 24 * time.Hour)

	for _, m := range merchants {
		if err := st.CreateMerchant(&domain.Merchant{
			ID: m.id, Name: m.name, Category: m.category, Status: m.status,
			ContactEmail: m.contact, DefaultCurrency: m.currency, CreatedAt: created,
		}); err != nil {
			return fmt.Errorf("seed: merchant %s: %w", m.id, err)
		}
	}

	const primary = "MER-1042" // Sheba Trading PLC is the demo workspace
	for _, b := range branches {
		if err := st.CreateBranch(&domain.Branch{
			ID: b.id, MerchantID: primary, Name: b.name, Code: b.code,
			City: b.city, Area: b.area, ManagerName: b.manager, CreatedAt: created,
		}); err != nil {
			return fmt.Errorf("seed: branch %s: %w", b.id, err)
		}
	}

	if err := st.CreateMPGSMerchant(&domain.MPGSMerchant{
		Number: demoMerchantNumber, Name: demoMerchantName, CreatedAt: created,
	}); err != nil {
		return fmt.Errorf("seed: merchant register: %w", err)
	}

	users := []*domain.User{
		{
			ID: "AD-01", Username: "admin", Email: "admin@zemenbank.et", FullName: "Nahom Wolde",
			Role: domain.RoleAdmin, Title: "Bank Administrator",
			Status: domain.UserActive, PasswordHash: hash, CreatedAt: created,
		},
		{
			ID: "MM-01", Username: "management", Email: "management@zemenbank.et",
			FullName: "Merchant Management", Role: domain.RoleMerchantManagement,
			Title:  "Merchant onboarding",
			Status: domain.UserActive, PasswordHash: hash, CreatedAt: created,
		},
		{
			ID: "MU-01", MerchantID: primary, Email: "merchant@sheba.et",
			FullName: "Sheba Trading", Role: domain.RoleMerchant, Title: "Merchant · Bole HQ",
			Status: domain.UserActive, PasswordHash: hash, CreatedAt: created,
		},
	}
	for _, o := range operators {
		users = append(users, &domain.User{
			ID: o.id, MerchantID: primary, BranchID: o.branch,
			Username: o.email, Email: o.email, MPGSMerchantNumber: demoMerchantNumber,
			FullName: o.name, Role: domain.RoleSales, Title: "Sales agent",
			Status: domain.UserActive, PasswordHash: hash, CreatedAt: created,
		})
	}
	for _, u := range users {
		if err := st.CreateUser(u); err != nil {
			return fmt.Errorf("seed: user %s: %w", u.Username, err)
		}
	}

	slog.Warn("seeded DEMO workspace with a published password — development only",
		"merchants", len(merchants), "branches", len(branches), "users", len(users),
		"password", DemoPassword)
	return nil
}

// IsDevelopment gates everything that must never reach a real deployment.
func IsDevelopment(env string) bool {
	return env == "" || strings.EqualFold(env, "development") || strings.EqualFold(env, "dev")
}

// Backfill brings an already-populated database up to the account model that
// Run seeds from scratch. It is idempotent and runs on every boot, because Run
// stops as soon as any user exists and so never reaches a live database.
//
// It does two things: makes sure someone can administer the merchant register,
// and gives existing operators the merchant number they are now expected to
// have — taken from the gateway profile they already authenticate with, which
// is the only place that number was previously recorded.
func Backfill(st *store.Store, env, bootstrapPassword string) error {
	if err := ensureManagementAccount(st, env, bootstrapPassword); err != nil {
		return err
	}
	if err := backfillMerchantNumbers(st); err != nil {
		return err
	}
	// After the numbers, because this derives merchant rows from them.
	if err := backfillMerchantIdentities(st); err != nil {
		return err
	}
	return warnOnDemoAccounts(st, env)
}

// warnOnDemoAccounts refuses to run a non-development deployment that still has
// an account whose password is the one printed in the README.
func warnOnDemoAccounts(st *store.Store, env string) error {
	if IsDevelopment(env) {
		return nil
	}
	for _, role := range []domain.Role{
		domain.RoleAdmin, domain.RoleMerchant, domain.RoleSales, domain.RoleMerchantManagement,
	} {
		users, err := st.UsersByRole(role)
		if err != nil {
			return fmt.Errorf("seed: audit accounts: %w", err)
		}
		for _, u := range users {
			if auth.CheckPassword(u.PasswordHash, DemoPassword) {
				return fmt.Errorf(
					"seed: account %q still uses the demo password from the README; "+
						"change it before running with PAYLINK_ENV=%s", u.Username, env)
			}
		}
	}
	return nil
}

func ensureManagementAccount(st *store.Store, env, bootstrapPassword string) error {
	existing, err := st.UsersByRole(domain.RoleMerchantManagement)
	if err != nil {
		return fmt.Errorf("seed: look for merchant management: %w", err)
	}
	if len(existing) > 0 {
		return nil
	}
	// Development gets the documented password so the demo keeps working.
	// Anywhere else: whatever the bank configured, or a generated one printed
	// once here and never again.
	password := bootstrapPassword
	generated := false
	if password == "" {
		if IsDevelopment(env) {
			password = DemoPassword
		} else {
			password = store.NewToken()[:20]
			generated = true
		}
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("seed: hash management password: %w", err)
	}
	user := &domain.User{
		Username: "management", Email: "management@zemenbank.et",
		FullName: "Merchant Management", Role: domain.RoleMerchantManagement,
		Title: "Merchant onboarding", Status: domain.UserActive,
		PasswordHash: hash, CreatedAt: time.Now().UTC(),
	}
	if err := st.CreateUser(user); err != nil {
		return fmt.Errorf("seed: create merchant management account: %w", err)
	}
	if generated {
		slog.Warn("created merchant management account with a generated password — "+
			"record it now, it is not shown again",
			"username", user.Username, "password", password)
	} else {
		slog.Info("created merchant management account", "username", user.Username)
	}
	return nil
}

// backfillMerchantIdentities repairs a deployment where the merchant register
// and the merchants table were allowed to drift apart.
//
// pay_links.merchant_id and payments.merchant_id are foreign keys into
// merchants, but outside development the only table anything wrote to was
// mpgs_merchants. Operators therefore existed with no merchant row to point
// at, and every payment link they tried to create was rejected by MySQL with a
// foreign key error that surfaced as a bare 500.
//
// Idempotent and cheap, so it runs on every boot and only touches what is
// missing — an existing deployment repairs itself on the next restart rather
// than needing its merchants and operators registered again.
func backfillMerchantIdentities(st *store.Store) error {
	registered, err := st.MPGSMerchants()
	if err != nil {
		return fmt.Errorf("seed: list registered merchants: %w", err)
	}
	names := make(map[string]string, len(registered))
	for _, m := range registered {
		names[m.Number] = m.Name
		if err := st.EnsureMerchant(m.Number, m.Name); err != nil {
			return fmt.Errorf("seed: merchant row for %s: %w", m.Number, err)
		}
	}

	repaired := 0
	for _, role := range []domain.Role{
		domain.RoleSales, domain.RoleMerchant, domain.RoleAdmin, domain.RoleMerchantManagement,
	} {
		users, err := st.UsersByRole(role)
		if err != nil {
			return fmt.Errorf("seed: list %s accounts: %w", role, err)
		}
		for _, u := range users {
			if u.MerchantID != "" || u.MPGSMerchantNumber == "" {
				continue
			}
			// Only mint a row for a number the register does not know about;
			// the loop above already created the rest with their proper trading
			// names, and passing the number as a name here would overwrite one.
			if _, known := names[u.MPGSMerchantNumber]; !known {
				if err := st.EnsureMerchant(u.MPGSMerchantNumber, u.MPGSMerchantNumber); err != nil {
					return fmt.Errorf("seed: merchant row for %s: %w", u.ID, err)
				}
			}
			if err := st.SetUserMerchant(u.ID, u.MPGSMerchantNumber); err != nil {
				return fmt.Errorf("seed: attach %s to their merchant: %w", u.ID, err)
			}
			repaired++
		}
	}
	if repaired > 0 {
		slog.Info("attached accounts to their merchant", "count", repaired)
	}
	return nil
}

func backfillMerchantNumbers(st *store.Store) error {
	operators, err := st.UsersByRole(domain.RoleSales)
	if err != nil {
		return fmt.Errorf("seed: list operators: %w", err)
	}
	for _, u := range operators {
		if u.MPGSMerchantNumber != "" {
			continue
		}
		// Whatever profile they already connected is the merchant they trade
		// under; registering it keeps their links and receipts working.
		creds, err := st.GatewayCredentials(u.ID)
		if err != nil || len(creds) == 0 {
			continue
		}
		c := creds[0]
		name := c.MerchantName
		if name == "" {
			name = c.MerchantID
		}
		if err := st.CreateMPGSMerchant(&domain.MPGSMerchant{
			Number: c.MerchantID, Name: name, CreatedAt: time.Now().UTC(),
		}); err != nil {
			return fmt.Errorf("seed: register merchant %s: %w", c.MerchantID, err)
		}
		if err := st.SetUserMerchantNumber(u.ID, c.MerchantID); err != nil {
			return fmt.Errorf("seed: link operator %s: %w", u.ID, err)
		}
		slog.Info("linked operator to registered merchant",
			"user", u.ID, "merchantNumber", c.MerchantID, "merchantName", name)
	}
	return nil
}
