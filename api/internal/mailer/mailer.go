// Package mailer sends the outbound email the product needs (pay-link shares
// and operator invitations). When SMTP is not configured it logs instead, so
// local development works without a mail server.
package mailer

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"

	"github.com/zemenbank/paylink/api/internal/config"
)

type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

type Mailer interface {
	Send(Message) error
	Enabled() bool
}

func New(cfg config.SMTP) Mailer {
	if !cfg.Configured() {
		slog.Warn("SMTP is not configured; outbound email will be logged instead of sent")
		return logMailer{}
	}
	return &smtpMailer{cfg: cfg}
}

type logMailer struct{}

func (logMailer) Enabled() bool { return false }

func (logMailer) Send(m Message) error {
	slog.Info("email not sent (SMTP unconfigured)", "to", m.To, "subject", m.Subject)
	return nil
}

type smtpMailer struct{ cfg config.SMTP }

func (m *smtpMailer) Enabled() bool { return true }

func (m *smtpMailer) Send(msg Message) error {
	if msg.To == "" {
		return fmt.Errorf("mailer: recipient is required")
	}

	boundary := "zemen-paylink-boundary"
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", m.cfg.From)
	fmt.Fprintf(&b, "To: %s\r\n", msg.To)
	fmt.Fprintf(&b, "Subject: %s\r\n", msg.Subject)
	b.WriteString("MIME-Version: 1.0\r\n")

	if msg.HTML != "" {
		fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)
		fmt.Fprintf(&b, "--%s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n", boundary, msg.Text)
		fmt.Fprintf(&b, "--%s\r\nContent-Type: text/html; charset=utf-8\r\n\r\n%s\r\n", boundary, msg.HTML)
		fmt.Fprintf(&b, "--%s--\r\n", boundary)
	} else {
		b.WriteString("Content-Type: text/plain; charset=utf-8\r\n\r\n")
		b.WriteString(msg.Text)
	}

	addr := m.cfg.Host + ":" + m.cfg.Port
	var auth smtp.Auth
	if m.cfg.Username != "" {
		auth = smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
	}
	if err := smtp.SendMail(addr, auth, m.cfg.From, []string{msg.To}, []byte(b.String())); err != nil {
		return fmt.Errorf("mailer: send: %w", err)
	}
	return nil
}
