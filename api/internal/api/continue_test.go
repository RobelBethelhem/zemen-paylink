package api

import (
	"testing"

	"github.com/zemenbank/paylink/api/internal/domain"
)

func linkWith(success, failure string) *domain.PayLink {
	return &domain.PayLink{CallbackSuccessURL: success, CallbackFailureURL: failure}
}

// Which address a payer is returned to is a judgement about the payment, made
// here so the browser never re-decides what "succeeded" means.
func TestContinueURLPicksByOutcome(t *testing.T) {
	link := linkWith("https://z-care.et/thanks", "https://z-care.et/retry")

	for _, status := range []domain.PaymentStatus{
		domain.PaymentPaid,
		domain.PaymentPartiallyCaptured,
		// An authorization is a success for the payer: the money is committed,
		// just not yet taken. Sending them to a failure page would be a lie.
		domain.PaymentAuthorized,
		domain.PaymentRefunded,
		domain.PaymentPartiallyRefunded,
	} {
		got := continueURL(&domain.Payment{Status: status}, link)
		if got != "https://z-care.et/thanks" {
			t.Fatalf("%s should return to the success page, got %q", status, got)
		}
	}

	for _, status := range []domain.PaymentStatus{
		domain.PaymentFailed,
		domain.PaymentCancelled,
		domain.PaymentExpired,
	} {
		got := continueURL(&domain.Payment{Status: status}, link)
		if got != "https://z-care.et/retry" {
			t.Fatalf("%s should return to the failure page, got %q", status, got)
		}
	}
}

// Nobody is redirected while the money is still in the air. A payer handed to a
// page claiming an outcome neither side knows yet is worse than a short wait.
func TestContinueURLStaysSilentWhileInFlight(t *testing.T) {
	link := linkWith("https://z-care.et/thanks", "https://z-care.et/retry")
	if got := continueURL(&domain.Payment{Status: domain.PaymentInitiated}, link); got != "" {
		t.Fatalf("an in-flight payment offered a redirect to %q", got)
	}
}

// A link made in the portal has no integrator behind it, and its payer stays on
// our own receipt.
func TestContinueURLIsEmptyWithoutCallbacks(t *testing.T) {
	if got := continueURL(&domain.Payment{Status: domain.PaymentPaid}, linkWith("", "")); got != "" {
		t.Fatalf("a portal link offered a redirect to %q", got)
	}
}

// The receiving page has to know which payment it is being shown for, without
// correlating on timing.
func TestWithOrderAppendsTheOrderID(t *testing.T) {
	got := withOrder("https://z-care.et/thanks", "PL-4611-ZunsGsqW")
	want := "https://z-care.et/thanks?order=PL-4611-ZunsGsqW"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

// An integrator's own query string survives: they may be identifying a campaign
// with it, and dropping it would break the page we are sending the payer to.
func TestWithOrderKeepsAnExistingQueryString(t *testing.T) {
	got := withOrder("https://z-care.et/thanks?campaign=clean-water", "PL-4611-Abc")
	if got != "https://z-care.et/thanks?campaign=clean-water&order=PL-4611-Abc" {
		t.Fatalf("an existing query string was not preserved: %q", got)
	}
}

func TestWithOrderIsEmptyForAnEmptyURL(t *testing.T) {
	if got := withOrder("", "PL-4611-Abc"); got != "" {
		t.Fatalf("an absent callback produced %q", got)
	}
}
