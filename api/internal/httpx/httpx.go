// Package httpx holds the small HTTP helpers shared by every handler.
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
)

type ErrorBody struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Error("write response", "error", err)
	}
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, ErrorBody{Error: message})
}

func ErrorCode(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, ErrorBody{Error: message, Code: code})
}

// Decode reads a JSON body, rejecting unknown fields so typos in a client
// surface immediately instead of being silently ignored.
func Decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var syntax *json.SyntaxError
		switch {
		case errors.As(err, &syntax):
			Error(w, http.StatusBadRequest, "Request body is not valid JSON.")
		case errors.Is(err, io.EOF):
			Error(w, http.StatusBadRequest, "Request body is empty.")
		default:
			Error(w, http.StatusBadRequest, "Request body could not be read: "+err.Error())
		}
		return false
	}
	return true
}
