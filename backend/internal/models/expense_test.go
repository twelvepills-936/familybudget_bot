package models_test

import (
	"testing"

	"expense-tracker/internal/models"
)

func TestNormalizeCategory(t *testing.T) {
	tests := []struct {
		input    string
		expected models.Category
		valid    bool
	}{
		{"food", models.CategoryFood, true},
		{"еда", models.CategoryFood, true},
		{"продукты", models.CategoryFood, true},
		{"cafes", models.CategoryFood, true},
		{"кафе", models.CategoryFood, true},
		{"transport", models.CategoryTransport, true},
		{"транспорт", models.CategoryTransport, true},
		{"такси", models.CategoryTransport, true},
		{"housing", models.CategoryHousing, true},
		{"жильё", models.CategoryHousing, true},
		{"жилье", models.CategoryHousing, true},
		{"entertainment", models.CategoryEntertainment, true},
		{"развлечения", models.CategoryEntertainment, true},
		{"health", models.CategoryHealth, true},
		{"здоровье", models.CategoryHealth, true},
		{"shopping", models.CategoryShopping, true},
		{"покупки", models.CategoryShopping, true},
		{"other", models.CategoryOther, true},
		{"другое", models.CategoryOther, true},
		{"unknown_xyz", "", false},
	}

	for _, tc := range tests {
		cat, ok := models.NormalizeCategory(tc.input)
		if ok != tc.valid {
			t.Errorf("NormalizeCategory(%q) ok = %v; want %v", tc.input, ok, tc.valid)
		}
		if ok && cat != tc.expected {
			t.Errorf("NormalizeCategory(%q) = %q; want %q", tc.input, cat, tc.expected)
		}
	}
}
