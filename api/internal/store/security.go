package store

import (
	"time"

	"github.com/zemenbank/paylink/api/internal/domain"
)

// SetSecurityQuestions replaces an account's recovery challenges wholesale.
//
// Replaced rather than merged: a half-updated set would leave an account
// answerable partly with old answers and partly with new, which is exactly the
// state someone changing them is trying to get out of.
func (s *Store) SetSecurityQuestions(userID string, questions []*domain.SecurityQuestion) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`DELETE FROM security_questions WHERE user_id = ?`, userID); err != nil {
		return err
	}
	now := fmtTime(time.Now().UTC())
	for _, q := range questions {
		if _, err := tx.Exec(`
			INSERT INTO security_questions (user_id, position, prompt, answer_hash, created_at)
			VALUES (?,?,?,?,?)`,
			userID, q.Position, q.Prompt, q.AnswerHash, now); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// SecurityQuestions returns an account's challenges in order.
func (s *Store) SecurityQuestions(userID string) ([]*domain.SecurityQuestion, error) {
	rows, err := s.db.Query(
		`SELECT position, prompt, answer_hash FROM security_questions
		 WHERE user_id = ? ORDER BY position`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*domain.SecurityQuestion{}
	for rows.Next() {
		var q domain.SecurityQuestion
		if err := rows.Scan(&q.Position, &q.Prompt, &q.AnswerHash); err != nil {
			return nil, err
		}
		out = append(out, &q)
	}
	return out, rows.Err()
}

// HasSecurityQuestions reports whether recovery is set up for an account.
func (s *Store) HasSecurityQuestions(userID string) (bool, error) {
	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(1) FROM security_questions WHERE user_id = ?`, userID).Scan(&n)
	return n >= domain.RequiredSecurityQuestions, err
}
