package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"expense-tracker/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExpenseRepository struct {
	pool *pgxpool.Pool
}

func NewExpenseRepository(pool *pgxpool.Pool) *ExpenseRepository {
	return &ExpenseRepository{pool: pool}
}

func (r *ExpenseRepository) Create(ctx context.Context, in models.CreateExpenseInput) (*models.Expense, error) {
	spentAt, err := time.Parse("2006-01-02", in.SpentAt)
	if err != nil {
		return nil, fmt.Errorf("invalid spent_at format: %w", err)
	}

	var e models.Expense
	err = r.pool.QueryRow(ctx, `
		INSERT INTO expenses (user_id, amount, category, spent_at, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, amount, category, spent_at, comment, created_at, updated_at`,
		in.UserID, in.Amount, in.Category, spentAt, in.Comment,
	).Scan(&e.ID, &e.UserID, &e.Amount, &e.Category, &e.SpentAt, &e.Comment, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("Create expense: %w", err)
	}
	return &e, nil
}

func (r *ExpenseRepository) GetByID(ctx context.Context, id int64) (*models.Expense, error) {
	var e models.Expense
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, amount, category, spent_at, comment, created_at, updated_at
		FROM expenses WHERE id = $1`, id,
	).Scan(&e.ID, &e.UserID, &e.Amount, &e.Category, &e.SpentAt, &e.Comment, &e.CreatedAt, &e.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return &e, nil
}

func (r *ExpenseRepository) Update(ctx context.Context, id int64, in models.UpdateExpenseInput) (*models.Expense, error) {
	sets := []string{"updated_at = NOW()"}
	args := []any{}
	i := 1

	if in.Amount != nil {
		sets = append(sets, fmt.Sprintf("amount = $%d", i))
		args = append(args, *in.Amount)
		i++
	}
	if in.Category != nil {
		sets = append(sets, fmt.Sprintf("category = $%d", i))
		args = append(args, *in.Category)
		i++
	}
	if in.SpentAt != nil {
		t, err := time.Parse("2006-01-02", *in.SpentAt)
		if err != nil {
			return nil, fmt.Errorf("invalid spent_at: %w", err)
		}
		sets = append(sets, fmt.Sprintf("spent_at = $%d", i))
		args = append(args, t)
		i++
	}
	if in.Comment != nil {
		sets = append(sets, fmt.Sprintf("comment = $%d", i))
		args = append(args, *in.Comment)
		i++
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE expenses SET %s WHERE id = $%d
		RETURNING id, user_id, amount, category, spent_at, comment, created_at, updated_at`,
		strings.Join(sets, ", "), i)

	var e models.Expense
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&e.ID, &e.UserID, &e.Amount, &e.Category, &e.SpentAt, &e.Comment, &e.CreatedAt, &e.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("Update expense: %w", err)
	}
	return &e, nil
}

func (r *ExpenseRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM expenses WHERE id = $1`, id)
	return err
}

func (r *ExpenseRepository) List(ctx context.Context, f models.ExpenseFilter) ([]*models.Expense, error) {
	where := []string{"1=1"}
	args := []any{}
	i := 1

	if f.UserID != nil {
		where = append(where, fmt.Sprintf("user_id = $%d", i))
		args = append(args, *f.UserID)
		i++
	}
	if f.Category != nil {
		where = append(where, fmt.Sprintf("category = $%d", i))
		args = append(args, *f.Category)
		i++
	}
	if f.From != nil {
		where = append(where, fmt.Sprintf("spent_at >= $%d", i))
		args = append(args, *f.From)
		i++
	}
	if f.To != nil {
		where = append(where, fmt.Sprintf("spent_at <= $%d", i))
		args = append(args, *f.To)
		i++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("comment ILIKE $%d", i))
		args = append(args, "%"+f.Search+"%")
		i++
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := f.Offset

	query := fmt.Sprintf(`
		SELECT id, user_id, amount, category, spent_at, comment, created_at, updated_at
		FROM expenses WHERE %s
		ORDER BY spent_at DESC, id DESC
		LIMIT $%d OFFSET $%d`,
		strings.Join(where, " AND "), i, i+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("List expenses: %w", err)
	}
	defer rows.Close()

	var result []*models.Expense
	for rows.Next() {
		var e models.Expense
		if err := rows.Scan(&e.ID, &e.UserID, &e.Amount, &e.Category,
			&e.SpentAt, &e.Comment, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, &e)
	}
	return result, rows.Err()
}

// GetLastByUser returns the most recent expense for a user (used by LLM agent).
func (r *ExpenseRepository) GetLastByUser(ctx context.Context, userID int64) (*models.Expense, error) {
	var e models.Expense
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, amount, category, spent_at, comment, created_at, updated_at
		FROM expenses WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 1`, userID,
	).Scan(&e.ID, &e.UserID, &e.Amount, &e.Category, &e.SpentAt, &e.Comment, &e.CreatedAt, &e.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("GetLastByUser: %w", err)
	}
	return &e, nil
}

// ListUsers returns distinct user_ids (for web panel).
func (r *ExpenseRepository) ListUsers(ctx context.Context) ([]int64, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT user_id FROM expenses ORDER BY user_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
