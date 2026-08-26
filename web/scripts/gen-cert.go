//go:build ignore

// Generates the self-signed certificate the portal is served with in
// development.
//
// It exists because browsers only expose WebCrypto — and therefore the sealed
// channel the API insists on — to a secure context. Plain HTTP is a secure
// context only on localhost, so testing from a phone or another PC needs TLS,
// and a LAN address needs a certificate that actually names it.
//
// Every local IPv4 address is written into the SAN list, so the same
// certificate covers localhost and whatever the current DHCP lease is.
//
//	go run scripts/gen-cert.go
//
// The certificate is self-signed: a browser will warn once, and that warning is
// accurate. Production needs a certificate from a CA the device already trusts.
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "gen-cert:", err)
		os.Exit(1)
	}
}

func run() error {
	dir := "certificates"
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	ips := []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return err
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() {
			continue
		}
		if v4 := ipNet.IP.To4(); v4 != nil {
			ips = append(ips, v4)
		}
	}

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return err
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return err
	}

	template := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			Organization: []string{"Zemen PayLink (development)"},
			CommonName:   "Zemen PayLink development",
		},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().AddDate(0, 6, 0),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		DNSNames:              []string{"localhost"},
		IPAddresses:           ips,
	}

	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return err
	}

	certPath := filepath.Join(dir, "localhost.pem")
	certOut, err := os.Create(certPath)
	if err != nil {
		return err
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: der}); err != nil {
		return err
	}

	keyBytes, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return err
	}
	keyPath := filepath.Join(dir, "localhost-key.pem")
	// The private key is readable only by its owner, and certificates/ is in
	// .gitignore — a development key is still a key.
	keyOut, err := os.OpenFile(keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer keyOut.Close()
	if err := pem.Encode(keyOut, &pem.Block{Type: "PRIVATE KEY", Bytes: keyBytes}); err != nil {
		return err
	}

	names := make([]string, 0, len(ips))
	for _, ip := range ips {
		names = append(names, ip.String())
	}
	fmt.Printf("wrote %s and %s\ncovers: localhost, %v\nvalid until %s\n",
		certPath, keyPath, names, template.NotAfter.Format("2006-01-02"))
	return nil
}
