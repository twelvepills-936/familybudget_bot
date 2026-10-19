package service

import (
	"context"

	"expense-tracker/internal/models"
	"expense-tracker/internal/repository"
)

type ExpenseService struct {
	repo *repository.ExpenseRepository
}

func NewExpenseService(repo *repository.ExpenseRepository) *ExpenseService {
	return &ExpenseService{repo: repo}
}

func (s *ExpenseService) Create(ctx context.Context, in models.CreateExpenseInput) (*models.Expense, error) {
	return s.repo.Create(ctx, in)
}

func (s *ExpenseService) GetByID(ctx context.Context, id int64) (*models.Expense, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ExpenseService) Update(ctx context.Context, id int64, in models.UpdateExpenseInput) (*models.Expense, error) {
	return s.repo.Update(ctx, id, in)
}

func (s *ExpenseService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *ExpenseService) List(ctx context.Context, f models.ExpenseFilter) ([]*models.Expense, error) {
	return s.repo.List(ctx, f)
}

func (s *ExpenseService) GetLastByUser(ctx context.Context, userID int64) (*models.Expense, error) {
	return s.repo.GetLastByUser(ctx, userID)
}

func (s *ExpenseService) ListUsers(ctx context.Context) ([]int64, error) {
	return s.repo.ListUsers(ctx)
}
