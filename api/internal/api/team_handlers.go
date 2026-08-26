package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/zemenbank/paylink/api/internal/auth"
	"github.com/zemenbank/paylink/api/internal/domain"
	"github.com/zemenbank/paylink/api/internal/httpx"
	"github.com/zemenbank/paylink/api/internal/store"
)

type teamMemberView struct {
	ID               string            `json:"id"`
	FullName         string            `json:"name"`
	Email            string            `json:"email"`
	Phone            string            `json:"phone,omitempty"`
	Title            string            `json:"title,omitempty"`
	BranchID         string            `json:"branchId,omitempty"`
	Status           domain.UserStatus `json:"status"`
	Initials         string            `json:"initials"`
	GatewayConnected bool              `json:"gatewayConnected"`
	Links            int               `json:"links"`
}

func (s *Server) handleListTeam(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())
	if user.MerchantID == "" {
		httpx.JSON(w, http.StatusOK, map[string]any{"team": []teamMemberView{}})
		return
	}

	members, err := s.store.TeamByMerchant(user.MerchantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not load your team.")
		return
	}

	views := make([]teamMemberView, 0, len(members))
	for _, m := range members {
		connected, _ := s.store.HasVerifiedCredential(m.ID)
		links, _ := s.store.Links(store.LinkFilter{CreatedByID: m.ID})
		views = append(views, teamMemberView{
			ID:               m.ID,
			FullName:         m.FullName,
			Email:            m.Email,
			Phone:            m.Phone,
			Title:            m.Title,
			BranchID:         m.BranchID,
			Status:           m.Status,
			Initials:         initials(m.FullName),
			GatewayConnected: connected,
			Links:            len(links),
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"team": views})
}

type inviteRequest struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	BranchID string `json:"branchId"`
	Title    string `json:"title"`
}

// handleInviteTeam creates the operator account in an invited state and returns
// the activation link. The operator sets a password, then connects their own
// MPGS credentials before they can issue links.
func (s *Server) handleInviteTeam(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFrom(r.Context())

	var req inviteRequest
	if !httpx.Decode(w, r, &req) {
		return
	}
	fullName := strings.TrimSpace(req.FullName)
	email := strings.TrimSpace(req.Email)
	if fullName == "" {
		httpx.Error(w, http.StatusBadRequest, "Enter the team member's full name.")
		return
	}
	if email == "" || !strings.Contains(email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Enter a valid email address.")
		return
	}
	if _, err := s.store.UserByEmail(email); err == nil {
		httpx.Error(w, http.StatusConflict, "Someone with that email address already has an account.")
		return
	}

	merchantID := user.MerchantID
	if user.Role == domain.RoleAdmin && merchantID == "" {
		httpx.Error(w, http.StatusBadRequest, "A bank administrator must invite operators from within a merchant workspace.")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Sales agent"
	}

	member := &domain.User{
		MerchantID:  merchantID,
		BranchID:    strings.TrimSpace(req.BranchID),
		Email:       email,
		FullName:    fullName,
		Phone:       strings.TrimSpace(req.Phone),
		Role:        domain.RoleSales,
		Title:       title,
		Status:      domain.UserInvited,
		InviteToken: store.NewToken(),
	}
	if err := s.store.CreateUser(member); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Could not create the account.")
		return
	}

	activateURL := fmt.Sprintf("%s/activate?token=%s", s.cfg.PublicBaseURL, member.InviteToken)

	merchantName := "Your merchant"
	if m, err := s.store.MerchantByID(merchantID); err == nil {
		merchantName = m.Name
	}
	text := fmt.Sprintf("%s added you as a sales operator on Zemen PayLink. Activate your account: %s",
		merchantName, activateURL)
	if err := s.mail.Send(mailerMessage(email,
		"You have been added to "+merchantName+" on Zemen PayLink",
		text, s.inviteEmailHTML(fullName, merchantName, activateURL))); err != nil {
		slog.Error("invite email failed", "email", email, "error", err)
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"member": teamMemberView{
			ID:       member.ID,
			FullName: member.FullName,
			Email:    member.Email,
			Phone:    member.Phone,
			Title:    member.Title,
			BranchID: member.BranchID,
			Status:   member.Status,
			Initials: initials(member.FullName),
		},
		// Returned so the merchant can pass the link on directly when email
		// delivery is not configured.
		"activateUrl": activateURL,
		"emailSent":   s.mail.Enabled(),
	})
}
