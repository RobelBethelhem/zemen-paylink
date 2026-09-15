// Command paylinkadm does the few things an operator needs before the portal
// screens for them exist: create an integrator account, issue an integration
// and its credentials, and approve one for live.
//
// It reads the same environment the server does, so inside the running API
// container it is already configured:
//
//	docker compose -f docker-compose.prod.yml exec api /paylinkadm integrator \
//	  -username zcare -merchant 600123456789 -name "Z-Care Integration"
//
// Every credential it prints is shown once. Nothing stores them in the clear.
package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/config"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/secrets"
	"github.com/zemenbank/paylink/api/internal/store"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	if err := run(os.Args[1], os.Args[2:]); err != nil {
		fmt.Fprintf(os.Stderr, "paylinkadm: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `paylinkadm — integration administration

  admin         create a bank administrator, who reviews go-live requests
  integrator    create an integrator account against a registered merchant
  integration   issue a test integration and its credentials
  approve-live  create the live integration for an approved integrator
  rotate        issue a fresh secret and encryption key, keeping the API key
  list          show the integrations on this deployment

Run a subcommand with -h for its flags.
`)
}

// open connects using the same configuration the server uses.
func open() (*store.Store, *secrets.Sealer, error) {
	_ = config.LoadDotEnv(".env")
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}
	st, err := store.Open(cfg.Database)
	if err != nil {
		return nil, nil, err
	}
	sealer, err := secrets.NewSealer(cfg.EncryptionKey)
	if err != nil {
		return nil, nil, err
	}
	return st, sealer, nil
}

func run(command string, args []string) error {
	switch command {
	case "admin":
		return createAdmin(args)
	case "integrator":
		return createIntegrator(args)
	case "integration":
		return createIntegration(args)
	case "approve-live":
		return approveLive(args)
	case "rotate":
		return rotate(args)
	case "list":
		return list(args)
	default:
		usage()
		return fmt.Errorf("unknown command %q", command)
	}
}

// createAdmin makes a bank administrator: the person who decides whether an
// integration may touch real money.
//
// Attached to no merchant on purpose. An administrator reviews merchants and
// must not belong to one of them.
func createAdmin(args []string) error {
	fs := flag.NewFlagSet("admin", flag.ExitOnError)
	username := fs.String("username", "", "login name for the administrator")
	fullName := fs.String("name", "", "who this account belongs to")
	password := fs.String("password", "", "leave empty to generate one")
	_ = fs.Parse(args)

	if *username == "" {
		return errors.New("-username is required")
	}

	st, _, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	taken, err := st.UsernameTaken(*username)
	if err != nil {
		return err
	}
	if taken {
		return fmt.Errorf("the username %q is already in use", *username)
	}

	secret := *password
	if secret == "" {
		secret = store.NewToken()[:20]
	}
	if err := auth.ValidatePassword(secret, *username, ""); err != nil {
		return fmt.Errorf("password: %w", err)
	}
	hash, err := auth.HashPassword(secret)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(*fullName)
	if name == "" {
		name = *username
	}
	user := &domain.User{
		Username:     *username,
		FullName:     name,
		Role:         domain.RoleAdmin,
		Title:        "Bank administrator",
		Status:       domain.UserActive,
		PasswordHash: hash,
	}
	if err := st.CreateUser(user); err != nil {
		return err
	}

	fmt.Printf(`
Administrator account created.

  Username   %s
  Password   %s
  User id    %s

Sign in at the portal. The first screen asks for recovery questions — an
administrator who loses their password cannot be recovered any other way.

This account reviews go-live requests: it sees the merchant, the integration
and what its test traffic actually did, and decides. It cannot create payment
links or take money.

`, user.Username, secret, user.ID)
	return nil
}

func createIntegrator(args []string) error {
	fs := flag.NewFlagSet("integrator", flag.ExitOnError)
	username := fs.String("username", "", "login name for the integrator")
	merchant := fs.String("merchant", "", "registered MPGS merchant number they trade under")
	fullName := fs.String("name", "", "person or team responsible")
	password := fs.String("password", "", "leave empty to generate one")
	_ = fs.Parse(args)

	if *username == "" || *merchant == "" {
		return errors.New("-username and -merchant are required")
	}

	st, _, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	// The merchant must already be in the register. Same rule as an operator
	// self-registering: the number is what proves they belong to somebody.
	registered, err := st.MPGSMerchantByNumber(*merchant)
	if err != nil {
		return fmt.Errorf("merchant %s is not registered — add it in the portal first", *merchant)
	}
	if err := st.EnsureMerchant(registered.Number, registered.Name); err != nil {
		return err
	}

	taken, err := st.UsernameTaken(*username)
	if err != nil {
		return err
	}
	if taken {
		return fmt.Errorf("the username %q is already in use", *username)
	}

	secret := *password
	if secret == "" {
		secret = store.NewToken()[:20]
	}
	if err := auth.ValidatePassword(secret, *username, *merchant); err != nil {
		return fmt.Errorf("password: %w", err)
	}
	hash, err := auth.HashPassword(secret)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(*fullName)
	if name == "" {
		name = *username
	}
	user := &domain.User{
		Username:           *username,
		FullName:           name,
		MerchantID:         registered.Number,
		MPGSMerchantNumber: registered.Number,
		Role:               domain.RoleIntegrator,
		Title:              "Integration",
		Status:             domain.UserActive,
		PasswordHash:       hash,
	}
	if err := st.CreateUser(user); err != nil {
		return err
	}

	fmt.Printf(`
Integrator account created.

  Username   %s
  Password   %s
  Merchant   %s (%s)
  User id    %s

They sign in at the portal to set their recovery questions and connect the
MPGS gateway their links will settle against. Issue their integration with:

  paylinkadm integration -username %s -name "<system name>"

`, user.Username, secret, registered.Name, registered.Number, user.ID, user.Username)
	return nil
}

func createIntegration(args []string) error {
	fs := flag.NewFlagSet("integration", flag.ExitOnError)
	username := fs.String("username", "", "the integrator account this belongs to")
	name := fs.String("name", "", "the system being integrated, e.g. Z-Care")
	webhook := fs.String("webhook", "", "where to report payments server to server")
	success := fs.String("success-url", "", "where a payer is returned after paying")
	failure := fs.String("failure-url", "", "where a payer is returned after a failure")
	_ = fs.Parse(args)

	if *username == "" || *name == "" {
		return errors.New("-username and -name are required")
	}

	st, sealer, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	user, err := st.UserByLogin(*username)
	if err != nil {
		return fmt.Errorf("no such account %q", *username)
	}
	if user.MerchantID == "" {
		return fmt.Errorf("%s is not attached to a merchant", *username)
	}
	if _, err := st.IntegrationFor(user.ID, *name, domain.EnvTest); err == nil {
		return fmt.Errorf("%s already has an integration called %q", *username, *name)
	}

	// Test, always. Live is the outcome of a review, never of a command.
	issued, integration, err := issue(st, sealer, user, *name, domain.EnvTest)
	if err != nil {
		return err
	}
	if *webhook != "" || *success != "" || *failure != "" {
		if err := st.UpdateIntegrationEndpoints(integration.ID, *success, *failure, *webhook); err != nil {
			return err
		}
	}
	printCredentials(integration, issued)
	return nil
}

func approveLive(args []string) error {
	fs := flag.NewFlagSet("approve-live", flag.ExitOnError)
	id := fs.String("integration", "", "the test integration id to promote, e.g. INT-1042")
	_ = fs.Parse(args)
	if *id == "" {
		return errors.New("-integration is required")
	}

	st, sealer, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	test, err := st.IntegrationByID(*id)
	if err != nil {
		return fmt.Errorf("no such integration %q", *id)
	}
	if test.Environment.IsLive() {
		return errors.New("that one is already live")
	}
	owner, err := st.UserByID(test.OwnerID)
	if err != nil {
		return err
	}
	if _, err := st.IntegrationFor(owner.ID, test.Name, domain.EnvLive); err == nil {
		return errors.New("live credentials for this integration already exist")
	}

	payments, err := st.PaymentsForIntegration(test.ID, 200)
	if err != nil {
		return err
	}
	settled := 0
	for _, p := range payments {
		if p.CapturedMinor > 0 {
			settled++
		}
	}
	fmt.Printf("\nTest activity for %s: %d payments, %d settled.\n", test.Name, len(payments), settled)
	if len(payments) == 0 {
		fmt.Println("Nothing has been taken through it yet — approving this is approving something nobody has seen work.")
	}

	issued, live, err := issue(st, sealer, owner, test.Name, domain.EnvLive)
	if err != nil {
		return err
	}
	// Carried over so going live does not silently stop delivering to the
	// endpoints they already proved work.
	if err := st.UpdateIntegrationEndpoints(
		live.ID, test.CallbackSuccessURL, test.CallbackFailureURL, test.WebhookURL,
	); err != nil {
		return err
	}
	printCredentials(live, issued)
	return nil
}

func rotate(args []string) error {
	fs := flag.NewFlagSet("rotate", flag.ExitOnError)
	id := fs.String("integration", "", "the integration id to rotate")
	_ = fs.Parse(args)
	if *id == "" {
		return errors.New("-integration is required")
	}

	st, sealer, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	integration, err := st.IntegrationByID(*id)
	if err != nil {
		return fmt.Errorf("no such integration %q", *id)
	}
	issued, err := domain.NewCredentials(integration.Environment)
	if err != nil {
		return err
	}
	// The API key survives, so rotating a secret does not also force a config
	// change and a redeploy on their side.
	issued.APIKey = integration.APIKey

	secretSealed, err := sealer.Seal(issued.Secret)
	if err != nil {
		return err
	}
	payloadSealed, err := sealer.Seal(issued.PayloadKey)
	if err != nil {
		return err
	}
	if err := st.RotateIntegrationSecrets(
		integration.ID, secretSealed, domain.SecretHint(issued.Secret), payloadSealed,
	); err != nil {
		return err
	}
	fmt.Println("\nThe previous secret and encryption key stopped working just now.")
	printCredentials(integration, issued)
	return nil
}

func list(args []string) error {
	fs := flag.NewFlagSet("list", flag.ExitOnError)
	username := fs.String("username", "", "limit to one integrator")
	_ = fs.Parse(args)

	st, _, err := open()
	if err != nil {
		return err
	}
	defer st.Close()

	var integrations []*domain.Integration
	if *username != "" {
		user, err := st.UserByLogin(*username)
		if err != nil {
			return fmt.Errorf("no such account %q", *username)
		}
		integrations, err = st.IntegrationsForOwner(user.ID)
		if err != nil {
			return err
		}
	} else {
		for _, role := range []domain.Role{domain.RoleIntegrator} {
			users, err := st.UsersByRole(role)
			if err != nil {
				return err
			}
			for _, u := range users {
				owned, err := st.IntegrationsForOwner(u.ID)
				if err != nil {
					return err
				}
				integrations = append(integrations, owned...)
			}
		}
	}

	if len(integrations) == 0 {
		fmt.Println("No integrations yet.")
		return nil
	}
	fmt.Printf("\n%-12s %-22s %-6s %-30s %s\n", "ID", "NAME", "ENV", "API KEY", "STATUS")
	for _, i := range integrations {
		fmt.Printf("%-12s %-22s %-6s %-30s %s\n",
			i.ID, truncate(i.Name, 22), i.Environment, i.APIKey, i.Status)
	}
	fmt.Println()
	return nil
}

// ------------------------------------------------------------------ helpers

func issue(
	st *store.Store, sealer *secrets.Sealer,
	owner *domain.User, name string, env domain.Environment,
) (domain.IssuedCredentials, *domain.Integration, error) {
	issued, err := domain.NewCredentials(env)
	if err != nil {
		return issued, nil, err
	}
	secretSealed, err := sealer.Seal(issued.Secret)
	if err != nil {
		return issued, nil, err
	}
	payloadSealed, err := sealer.Seal(issued.PayloadKey)
	if err != nil {
		return issued, nil, err
	}
	integration := &domain.Integration{
		MerchantID:       owner.MerchantID,
		OwnerID:          owner.ID,
		Name:             name,
		Environment:      env,
		APIKey:           issued.APIKey,
		SecretSealed:     secretSealed,
		SecretHint:       domain.SecretHint(issued.Secret),
		PayloadKeySealed: payloadSealed,
		Status:           domain.IntegrationActive,
	}
	if err := st.CreateIntegration(integration); err != nil {
		return issued, nil, err
	}
	return issued, integration, nil
}

func printCredentials(i *domain.Integration, c domain.IssuedCredentials) {
	fmt.Printf(`
Integration    %s  (%s)
Environment    %s

  API key         %s
  Secret key      %s
  Encryption key  %s

Copy these now. The secret and encryption keys are stored sealed and cannot be
shown again; if they are lost, rotate to issue a new set.

`, i.Name, i.ID, i.Environment, c.APIKey, c.Secret, c.PayloadKey)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
