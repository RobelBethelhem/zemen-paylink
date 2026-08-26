// Command server runs the Zemen PayLink API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zemenbank/paylink/api/internal/api"
	"github.com/zemenbank/paylink/api/internal/config"
	"github.com/zemenbank/paylink/api/internal/mailer"
	"github.com/zemenbank/paylink/api/internal/secrets"
	"github.com/zemenbank/paylink/api/internal/seed"
	"github.com/zemenbank/paylink/api/internal/store"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	if err := config.LoadDotEnv(".env"); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	st, err := store.Open(cfg.Database)
	if err != nil {
		return err
	}
	defer st.Close()

	// Run seeds a fresh database and stops the moment any user exists, so
	// Backfill has to follow it: on a fresh database Run has already done the
	// work, and on an existing one Run is a no-op and Backfill is the migration.
	if err := seed.Run(st, cfg.Env); err != nil {
		return err
	}
	if err := seed.Backfill(st, cfg.Env, cfg.BootstrapPassword); err != nil {
		return err
	}

	sealer, err := secrets.NewSealer(cfg.EncryptionKey)
	if err != nil {
		return err
	}

	srv, err := api.NewServer(cfg, st, sealer, mailer.New(cfg.SMTP))
	if err != nil {
		return err
	}

	// Keep in-flight payments up to date even when nobody is watching, so
	// reporting stays accurate for payers who never returned to the site.
	reconcilerCtx, stopReconciler := context.WithCancel(context.Background())
	defer stopReconciler()
	srv.StartReconciler(reconcilerCtx, 2*time.Minute)

	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	shutdownDone := make(chan struct{})
	go func() {
		defer close(shutdownDone)
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop

		slog.Info("shutting down")
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(ctx); err != nil {
			slog.Error("graceful shutdown failed", "error", err)
		}
	}()

	slog.Info("zemen paylink api listening",
		"addr", cfg.Addr,
		"env", cfg.Env,
		"gateway", cfg.DefaultGatewayHost,
		"publicBaseURL", cfg.PublicBaseURL)

	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	<-shutdownDone
	return nil
}
