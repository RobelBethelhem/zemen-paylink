// Package mpgs is a client for the Mastercard Payment Gateway Services REST
// API.
//
// Authentication is HTTP Basic with the username "merchant.<merchantId>" and
// the merchant's API password. Every call is scoped to one operator's
// credentials rather than a process-wide config, because each operator
// connects their own MPGS identity.
package mpgs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
)

const defaultAPIVersion = "100"

// Credentials identify one operator's gateway access.
type Credentials struct {
	Host         string // e.g. test-gateway.mastercard.com
	MerchantID   string // e.g. 000000001100
	MerchantName string
	APIVersion   string
	APIPassword  string
}

func (c Credentials) version() string {
	if c.APIVersion == "" {
		return defaultAPIVersion
	}
	return c.APIVersion
}

func (c Credentials) baseURL() string {
	host := strings.TrimSuffix(strings.TrimPrefix(strings.TrimPrefix(c.Host, "https://"), "http://"), "/")
	return fmt.Sprintf("https://%s/api/rest/version/%s/merchant/%s", host, c.version(), c.MerchantID)
}

// Error carries the gateway's own explanation so it can be surfaced to the
// operator without guessing.
type Error struct {
	StatusCode  int
	Cause       string
	Explanation string
	Result      string
}

func (e *Error) Error() string {
	if e.Explanation != "" {
		return e.Explanation
	}
	if e.Cause != "" {
		return fmt.Sprintf("gateway rejected the request (%s)", e.Cause)
	}
	return fmt.Sprintf("gateway returned HTTP %d", e.StatusCode)
}

// Unauthorized reports a credential problem as opposed to a request problem.
func (e *Error) Unauthorized() bool { return e.StatusCode == http.StatusUnauthorized }

type errorEnvelope struct {
	Result string `json:"result"`
	Error  struct {
		Cause       string `json:"cause"`
		Explanation string `json:"explanation"`
	} `json:"error"`
}

type Client struct{ http *http.Client }

func New(timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &Client{http: &http.Client{Timeout: timeout}}
}

func (c *Client) do(ctx context.Context, creds Credentials, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("mpgs: encode request: %w", err)
		}
		reader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, creds.baseURL()+path, reader)
	if err != nil {
		return fmt.Errorf("mpgs: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.SetBasicAuth("merchant."+creds.MerchantID, creds.APIPassword)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("mpgs: could not reach %s: %w", creds.Host, err)
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("mpgs: read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		gwErr := &Error{StatusCode: resp.StatusCode}
		var env errorEnvelope
		if json.Unmarshal(payload, &env) == nil {
			gwErr.Cause = env.Error.Cause
			gwErr.Explanation = env.Error.Explanation
			gwErr.Result = env.Result
		}
		return gwErr
	}

	if out != nil {
		if err := json.Unmarshal(payload, out); err != nil {
			return fmt.Errorf("mpgs: decode response: %w", err)
		}
	}
	return nil
}

// ------------------------------------------------------------- verification

type sessionResponse struct {
	Result           string `json:"result"`
	Merchant         string `json:"merchant"`
	SuccessIndicator string `json:"successIndicator"`
	Session          struct {
		ID           string `json:"id"`
		Version      string `json:"version"`
		UpdateStatus string `json:"updateStatus"`
	} `json:"session"`
}

// Verify proves a set of credentials works by creating a throwaway session.
// It is the cheapest call that exercises authentication end to end.
func (c *Client) Verify(ctx context.Context, creds Credentials) error {
	var resp sessionResponse
	if err := c.do(ctx, creds, http.MethodPost, "/session", map[string]any{}, &resp); err != nil {
		return err
	}
	if !strings.EqualFold(resp.Result, "SUCCESS") {
		return &Error{StatusCode: http.StatusOK, Result: resp.Result,
			Explanation: "the gateway did not accept these credentials"}
	}
	return nil
}

// ---------------------------------------------------------- hosted checkout

// CheckoutRequest is one payment attempt against a pay link.
type CheckoutRequest struct {
	OrderID     string
	Amount      string // already formatted for the currency, e.g. "120.00"
	Currency    string
	Description string
	ReturnURL   string
	MerchantURL string
	// Operation is PURCHASE (take the money now) or AUTHORIZE (reserve it).
	Operation string
	// CustomerName and CustomerEmail are optional. Hosted Checkout does not ask
	// for a cardholder name, so anything we know is worth passing on — it comes
	// back on the order and shows up in Merchant Administration too.
	CustomerName  string
	CustomerEmail string
}

type CheckoutSession struct {
	SessionID        string
	SessionVersion   string
	SuccessIndicator string
}

// InitiateCheckout opens a Hosted Checkout session. The returned session id is
// handed to the gateway's checkout.js in the payer's browser, so card data
// never touches our servers.
func (c *Client) InitiateCheckout(ctx context.Context, creds Credentials, r CheckoutRequest) (*CheckoutSession, error) {
	merchantName := creds.MerchantName
	if merchantName == "" {
		merchantName = creds.MerchantID
	}

	operation := r.Operation
	if operation == "" {
		operation = "PURCHASE"
	}

	body := map[string]any{
		"apiOperation": "INITIATE_CHECKOUT",
		"checkoutMode": "WEBSITE",
		"interaction": map[string]any{
			"operation": operation,
			"merchant": map[string]any{
				"name": merchantName,
				"url":  r.MerchantURL,
			},
			"returnUrl": r.ReturnURL,
		},
		"order": map[string]any{
			"id":          r.OrderID,
			"amount":      r.Amount,
			"currency":    strings.ToUpper(r.Currency),
			"description": r.Description,
		},
	}

	// The gateway rejects empty-string fields, so only send what we actually have.
	customer := map[string]any{}
	if first, last, ok := splitName(r.CustomerName); ok {
		customer["firstName"] = first
		if last != "" {
			customer["lastName"] = last
		}
	}
	if r.CustomerEmail != "" {
		customer["email"] = r.CustomerEmail
	}
	if len(customer) > 0 {
		body["customer"] = customer
	}

	var resp sessionResponse
	if err := c.do(ctx, creds, http.MethodPost, "/session", body, &resp); err != nil {
		return nil, err
	}
	if resp.Session.ID == "" {
		return nil, &Error{Result: resp.Result, Explanation: "the gateway did not return a checkout session"}
	}
	return &CheckoutSession{
		SessionID:        resp.Session.ID,
		SessionVersion:   resp.Session.Version,
		SuccessIndicator: resp.SuccessIndicator,
	}, nil
}

// splitName turns a single typed name into the first/last pair the gateway
// expects. Returns ok=false when there is nothing usable to send.
func splitName(full string) (first, last string, ok bool) {
	parts := strings.Fields(full)
	if len(parts) == 0 {
		return "", "", false
	}
	if len(parts) == 1 {
		return parts[0], "", true
	}
	return parts[0], strings.Join(parts[1:], " "), true
}

// --------------------------------------------------------------- retrieval

type Card struct {
	Brand  string `json:"brand"`
	Scheme string `json:"scheme"`
	Number string `json:"number"` // masked, e.g. 512345xxxxxx0008
}

type Transaction struct {
	Result        string `json:"result"`
	SourceOfFunds struct {
		Type     string `json:"type"`
		Provided struct {
			Card Card `json:"card"`
		} `json:"provided"`
	} `json:"sourceOfFunds"`
	Response struct {
		GatewayCode string `json:"gatewayCode"`
	} `json:"response"`
	Transaction struct {
		ID       string  `json:"id"`
		Type     string  `json:"type"`
		Amount   float64 `json:"amount"`
		Currency string  `json:"currency"`
		// The references a bank quotes when reconciling or disputing:
		// the gateway receipt, the issuer's approval code, and the acquirer's
		// own transaction id and settlement batch.
		Receipt           string `json:"receipt"`
		AuthorizationCode string `json:"authorizationCode"`
		Acquirer          struct {
			ID             string `json:"id"`
			TransactionID  string `json:"transactionId"`
			SettlementDate string `json:"settlementDate"`
		} `json:"acquirer"`
	} `json:"transaction"`
}

// References are the identifiers this payment is known by outside our system.
type References struct {
	Receipt           string
	AuthorizationCode string
	AcquirerReference string
	AcquirerID        string
	SettlementDate    string
}

// References gathers the identifiers spread across an order's transactions.
// The receipt and approval code come from the authorization and stay constant;
// the settlement date only appears once funds are captured, so the latest one
// wins.
func (o *Order) References() References {
	var refs References
	for _, t := range o.Transactions {
		if refs.Receipt == "" {
			refs.Receipt = t.Transaction.Receipt
		}
		if refs.AuthorizationCode == "" {
			refs.AuthorizationCode = t.Transaction.AuthorizationCode
		}
		if refs.AcquirerReference == "" {
			refs.AcquirerReference = t.Transaction.Acquirer.TransactionID
		}
		if refs.AcquirerID == "" {
			refs.AcquirerID = t.Transaction.Acquirer.ID
		}
		if t.Transaction.Acquirer.SettlementDate != "" {
			refs.SettlementDate = t.Transaction.Acquirer.SettlementDate
		}
	}
	return refs
}

type Order struct {
	ID                    string  `json:"id"`
	Result                string  `json:"result"`
	Status                string  `json:"status"`
	Amount                float64 `json:"amount"`
	Currency              string  `json:"currency"`
	TotalCapturedAmount   float64 `json:"totalCapturedAmount"`
	TotalAuthorizedAmount float64 `json:"totalAuthorizedAmount"`
	TotalRefundedAmount   float64 `json:"totalRefundedAmount"`
	Description           string  `json:"description"`
	// Set from the enclosing response when an operation returns the order.
	GatewayCode string `json:"-"`
	Customer    struct {
		Email     string `json:"email"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	} `json:"customer"`
	Transactions []Transaction `json:"transaction"`
}

// Settled reports whether money actually moved.
func (o *Order) Settled() bool {
	switch strings.ToUpper(o.Status) {
	case "CAPTURED", "PARTIALLY_CAPTURED", "DISBURSED":
		return true
	}
	return false
}

// Terminal reports whether the order can still change on its own.
func (o *Order) Terminal() bool {
	switch strings.ToUpper(o.Status) {
	case "CAPTURED", "PARTIALLY_CAPTURED", "DISBURSED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED":
		return true
	}
	return false
}

// CardDetails returns the brand and last four digits of the paying card.
func (o *Order) CardDetails() (brand, last4 string) {
	for i := len(o.Transactions) - 1; i >= 0; i-- {
		card := o.Transactions[i].SourceOfFunds.Provided.Card
		if card.Brand == "" && card.Number == "" {
			continue
		}
		brand = card.Brand
		if brand == "" {
			brand = card.Scheme
		}
		if n := card.Number; len(n) >= 4 {
			last4 = n[len(n)-4:]
		}
		return brand, last4
	}
	return "", ""
}

// CustomerName joins whatever name parts the gateway captured.
func (o *Order) CustomerName() string {
	return strings.TrimSpace(o.Customer.FirstName + " " + o.Customer.LastName)
}

// ------------------------------------------------------- money movement
//
// Capture, Refund and Void each add a transaction to an existing order. MPGS
// requires the transaction id to be unique within the order, so the caller
// allocates one and never reuses it — that is what stops a retried request from
// taking the money twice.

// Capture takes funds that were reserved by an AUTHORIZE. It may be called more
// than once for less than the full amount, which is how a single authorization
// is settled in parts.
func (c *Client) Capture(
	ctx context.Context, creds Credentials,
	orderID, transactionID, amount, currency string,
) (*Order, error) {
	return c.transactionOp(ctx, creds, orderID, transactionID, map[string]any{
		"apiOperation": "CAPTURE",
		"transaction":  map[string]any{"amount": amount, "currency": strings.ToUpper(currency)},
	})
}

// Refund returns captured funds to the payer, in full or in part.
func (c *Client) Refund(
	ctx context.Context, creds Credentials,
	orderID, transactionID, amount, currency string,
) (*Order, error) {
	return c.transactionOp(ctx, creds, orderID, transactionID, map[string]any{
		"apiOperation": "REFUND",
		"transaction":  map[string]any{"amount": amount, "currency": strings.ToUpper(currency)},
	})
}

// Void releases an authorization that has not been captured, freeing the hold
// on the payer's card.
func (c *Client) Void(
	ctx context.Context, creds Credentials,
	orderID, transactionID, targetTransactionID string,
) (*Order, error) {
	return c.transactionOp(ctx, creds, orderID, transactionID, map[string]any{
		"apiOperation": "VOID",
		"transaction":  map[string]any{"targetTransactionId": targetTransactionID},
	})
}

// transactionOp performs one operation and returns the order as it stands
// afterwards, so callers can mirror the gateway's totals without a second call.
type transactionResponse struct {
	Result   string `json:"result"`
	Order    Order  `json:"order"`
	Response struct {
		GatewayCode string `json:"gatewayCode"`
	} `json:"response"`
}

func (c *Client) transactionOp(
	ctx context.Context, creds Credentials,
	orderID, transactionID string, body map[string]any,
) (*Order, error) {
	var resp transactionResponse
	path := fmt.Sprintf("/order/%s/transaction/%s", orderID, transactionID)
	if err := c.do(ctx, creds, http.MethodPut, path, body, &resp); err != nil {
		return nil, err
	}
	order := resp.Order
	if order.ID == "" {
		order.ID = orderID
	}
	if order.Result == "" {
		order.Result = resp.Result
	}
	order.GatewayCode = resp.Response.GatewayCode
	return &order, nil
}

// RetrieveOrder is the authoritative check on a payment's outcome; the
// browser's redirect parameters are only a hint.
func (c *Client) RetrieveOrder(ctx context.Context, creds Credentials, orderID string) (*Order, error) {
	var order Order
	if err := c.do(ctx, creds, http.MethodGet, "/order/"+orderID, nil, &order); err != nil {
		return nil, err
	}
	return &order, nil
}

// MinorUnits converts a gateway decimal amount into integer minor units.
func MinorUnits(amount float64, exponent int) int64 {
	return int64(math.Round(amount * math.Pow10(exponent)))
}

// CheckoutScriptURL is the gateway-hosted checkout.js for a given host.
func CheckoutScriptURL(host string) string {
	host = strings.TrimSuffix(strings.TrimPrefix(strings.TrimPrefix(host, "https://"), "http://"), "/")
	return fmt.Sprintf("https://%s/static/checkout/checkout.min.js", host)
}
