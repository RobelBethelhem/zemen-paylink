package api

import (
	"fmt"
	"html"

	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/mailer"
)

func mailerMessage(to, subject, text, htmlBody string) mailer.Message {
	return mailer.Message{To: to, Subject: subject, Text: text, HTML: htmlBody}
}

// shareEmailHTML renders the payment request in the same visual language as
// the portal: Zemen red, dark type, generous spacing.
func (s *Server) shareEmailHTML(link *domain.PayLink, payURL, amount, merchantName string) string {
	esc := html.EscapeString
	return fmt.Sprintf(`<!doctype html>
<html><body style="margin:0;padding:0;background:#F5F5F6;font-family:'IBM Plex Sans',Segoe UI,Helvetica,Arial,sans-serif;color:#141519">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F6;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ECECEE">
        <tr><td style="background:#141519;padding:20px 26px;color:#ffffff;font-size:15px;font-weight:600;letter-spacing:-.01em">
          Zemen PayLink
        </td></tr>
        <tr><td style="padding:28px 26px 8px">
          <div style="font-size:13px;color:#6B6D76;margin-bottom:6px">Payment request from</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:22px">%s</div>
          <div style="font-size:13px;color:#6B6D76">%s</div>
          <div style="font-size:32px;font-weight:700;letter-spacing:-.02em;margin:6px 0 24px">%s</div>
          <a href="%s" style="display:inline-block;background:#DA1E28;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:11px;font-size:15px;font-weight:600">Pay securely</a>
          <div style="font-size:12.5px;color:#9A9CA5;margin-top:20px;line-height:1.6">
            Or open this link in your browser:<br>
            <a href="%s" style="color:#DA1E28;word-break:break-all">%s</a>
          </div>
        </td></tr>
        <tr><td style="padding:22px 26px 28px;border-top:1px solid #F0F0F2;font-size:11.5px;color:#9A9CA5;line-height:1.6">
          Payments are processed securely through the Mastercard Payment Gateway. Zemen Bank will never ask you for your card PIN or full card number by email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
		esc(merchantName), esc(link.Title), esc(amount), esc(payURL), esc(payURL), esc(payURL))
}

// inviteEmailHTML is sent when a merchant adds a sales operator.
func (s *Server) inviteEmailHTML(fullName, merchantName, activateURL string) string {
	esc := html.EscapeString
	return fmt.Sprintf(`<!doctype html>
<html><body style="margin:0;padding:0;background:#F5F5F6;font-family:'IBM Plex Sans',Segoe UI,Helvetica,Arial,sans-serif;color:#141519">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F5F6;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ECECEE">
        <tr><td style="background:#141519;padding:20px 26px;color:#ffffff;font-size:15px;font-weight:600">Zemen PayLink</td></tr>
        <tr><td style="padding:28px 26px">
          <div style="font-size:20px;font-weight:600;margin-bottom:10px">Hello %s,</div>
          <div style="font-size:14px;color:#3A3B42;line-height:1.65;margin-bottom:22px">
            %s has added you as a sales operator on Zemen PayLink. Set a password to activate your account, then connect your Mastercard gateway credentials so you can start issuing payment links.
          </div>
          <a href="%s" style="display:inline-block;background:#DA1E28;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:11px;font-size:15px;font-weight:600">Activate your account</a>
          <div style="font-size:12.5px;color:#9A9CA5;margin-top:20px;line-height:1.6">
            This invitation link is single-use. If you did not expect it, you can ignore this email.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`, esc(fullName), esc(merchantName), esc(activateURL))
}
