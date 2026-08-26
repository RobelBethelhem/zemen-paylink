package config

import "testing"

// A managed MySQL hands out a URL; the Go driver wants its own shape. Getting
// this wrong surfaces as a connection error that names neither cause, so it is
// worth pinning down here.
func TestNormaliseDSN(t *testing.T) {
	for _, tc := range []struct {
		name, in, want string
		wantErr        bool
	}{
		{
			name: "railway style url",
			in:   "mysql://root:s3cret@containers-us-west-1.railway.app:6543/railway",
			want: "root:s3cret@tcp(containers-us-west-1.railway.app:6543)/railway",
		},
		{
			name: "url without a port defaults to 3306",
			in:   "mysql://paylink:pw@db.internal/paylink",
			want: "paylink:pw@tcp(db.internal:3306)/paylink",
		},
		{
			name: "query parameters are carried across",
			in:   "mysql://u:p@host:3306/db?tls=true&timeout=5s",
			want: "u:p@tcp(host:3306)/db?tls=true&timeout=5s",
		},
		{
			name: "a native dsn is left exactly as it is",
			in:   "paylink:paylink@tcp(127.0.0.1:3306)/paylink",
			want: "paylink:paylink@tcp(127.0.0.1:3306)/paylink",
		},
		{
			name: "a password with reserved characters survives",
			in:   "mysql://root:p%40ss%3Aword@host:3306/db",
			want: "root:p@ss:word@tcp(host:3306)/db",
		},
		{name: "url naming no database", in: "mysql://root:pw@host:3306/", wantErr: true},
		{name: "url with no host", in: "mysql:///db", wantErr: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := normaliseDSN(tc.in)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected %q to be refused, got %q", tc.in, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got  %q\nwant %q", got, tc.want)
			}
		})
	}
}
