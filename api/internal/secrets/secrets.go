// Package secrets seals gateway API passwords so they are never stored in the
// clear. A leaked database file alone must not be enough to charge cards.
package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"strings"
)

type Sealer struct {
	aead cipher.AEAD
}

func NewSealer(key []byte) (*Sealer, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("secrets: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("secrets: %w", err)
	}
	return &Sealer{aead: aead}, nil
}

// Seal returns nonce||ciphertext. A fresh nonce per call is required for
// AES-GCM to stay safe under key reuse.
func (s *Sealer) Seal(plaintext string) ([]byte, error) {
	nonce := make([]byte, s.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("secrets: nonce: %w", err)
	}
	return s.aead.Seal(nonce, nonce, []byte(plaintext), nil), nil
}

func (s *Sealer) Open(sealed []byte) (string, error) {
	n := s.aead.NonceSize()
	if len(sealed) < n {
		return "", errors.New("secrets: ciphertext too short")
	}
	plaintext, err := s.aead.Open(nil, sealed[:n], sealed[n:], nil)
	if err != nil {
		// Usually a rotated or mismatched PAYLINK_ENCRYPTION_KEY.
		return "", errors.New("secrets: could not decrypt (wrong encryption key?)")
	}
	return string(plaintext), nil
}

// Mask renders a secret for display: enough to recognise, not enough to use.
func Mask(secret string) string {
	if secret == "" {
		return ""
	}
	if len(secret) <= 8 {
		return strings.Repeat("•", len(secret))
	}
	return secret[:4] + strings.Repeat("•", 8) + secret[len(secret)-4:]
}
