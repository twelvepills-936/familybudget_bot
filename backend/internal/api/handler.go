package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"expense-tracker/internal/models"
	"expense-tracker/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Handler struct {
	svc *service.ExpenseService
}

func NewRouter(svc *service.ExpenseService) http.Handler {
	h := &Handler{svc: svc}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/expenses", h.listExpenses)
		r.Post("/expenses", h.createExpense)
		r.Get("/expenses/{id}", h.getExpense)
		r.Put("/expenses/{id}", h.updateExpense)
		r.Delete("/expenses/{id}", h.deleteExpense)
		r.Get("/users", h.listUsers)
	})

	return r
}

// ── helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parseID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	return id, err == nil
}

// ── handlers ─────────────────────────────────────────────────────────────────

func (h *Handler) listExpenses(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := models.ExpenseFilter{}

	if v := q.Get("user_id"); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			f.UserID = &id
		}
	}
	if v := q.Get("category"); v != "" {
		if norm, ok := models.NormalizeCategory(v); ok {
			f.Category = &norm
		} else {
			c := models.Category(v)
			f.Category = &c
		}
	}
	if v := q.Get("search"); v != "" {
		f.Search = v
	}
	if v := q.Get("from"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.From = &t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.To = &t
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.Offset = n
		}
	}

	expenses, err := h.svc.List(r.Context(), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if expenses == nil {
		expenses = []*models.Expense{}
	}
	writeJSON(w, http.StatusOK, expenses)
}

func (h *Handler) createExpense(w http.ResponseWriter, r *http.Request) {
	var in models.CreateExpenseInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if in.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be positive")
		return
	}
	norm, ok := models.NormalizeCategory(string(in.Category))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid category")
		return
	}
	in.Category = norm
	if in.SpentAt == "" {
		in.SpentAt = time.Now().Format("2006-01-02")
	}

	expense, err := h.svc.Create(r.Context(), in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, expense)
}

func (h *Handler) getExpense(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	expense, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if expense == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, expense)
}

func (h *Handler) updateExpense(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var in models.UpdateExpenseInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if in.Category != nil {
		norm, ok := models.NormalizeCategory(string(*in.Category))
		if !ok {
			writeError(w, http.StatusBadRequest, "invalid category")
			return
		}
		in.Category = &norm
	}
	expense, err := h.svc.Update(r.Context(), id, in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if expense == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, expense)
}

func (h *Handler) deleteExpense(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	ids, err := h.svc.ListUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ids == nil {
		ids = []int64{}
	}
	writeJSON(w, http.StatusOK, ids)
}
