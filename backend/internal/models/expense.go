package models

import "time"

type Category string

const (
	CategoryFood          Category = "food"
	CategoryTransport     Category = "transport"
	CategoryHousing       Category = "housing"
	CategoryEntertainment Category = "entertainment"
	CategoryHealth        Category = "health"
	CategoryShopping      Category = "shopping"
	CategoryOther         Category = "other"
)

var ValidCategories = []Category{
	CategoryFood, CategoryTransport, CategoryHousing,
	CategoryEntertainment, CategoryHealth, CategoryShopping, CategoryOther,
}

// NormalizeCategory maps Russian or English category names to canonical Category.
func NormalizeCategory(c string) (Category, bool) {
	switch c {
	case "food", "еда", "продукты", "cafes", "кафе":
		return CategoryFood, true
	case "transport", "транспорт", "такси":
		return CategoryTransport, true
	case "housing", "жильё", "жилье", "жкх":
		return CategoryHousing, true
	case "entertainment", "развлечения", "развлечение", "отдых":
		return CategoryEntertainment, true
	case "health", "здоровье", "медицина", "аптека":
		return CategoryHealth, true
	case "shopping", "покупки", "шоппинг":
		return CategoryShopping, true
	case "other", "другое", "прочее":
		return CategoryOther, true
	default:
		// Also accept other legacy English codes if any
		for _, v := range ValidCategories {
			if string(v) == c {
				return v, true
			}
		}
		return "", false
	}
}

func IsValidCategory(c string) bool {
	_, ok := NormalizeCategory(c)
	return ok
}

type Expense struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Amount    float64   `json:"amount"`
	Category  Category  `json:"category"`
	SpentAt   time.Time `json:"spent_at"`
	Comment   string    `json:"comment,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ExpenseFilter struct {
	UserID    *int64
	Category  *Category
	From      *time.Time
	To        *time.Time
	Search    string
	Limit     int
	Offset    int
}

type CreateExpenseInput struct {
	UserID   int64    `json:"user_id"`
	Amount   float64  `json:"amount"`
	Category Category `json:"category"`
	SpentAt  string   `json:"spent_at"` // YYYY-MM-DD
	Comment  string   `json:"comment,omitempty"`
}

type UpdateExpenseInput struct {
	Amount   *float64  `json:"amount,omitempty"`
	Category *Category `json:"category,omitempty"`
	SpentAt  *string   `json:"spent_at,omitempty"` // YYYY-MM-DD
	Comment  *string   `json:"comment,omitempty"`
}
