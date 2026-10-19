package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"expense-tracker/internal/models"
	"expense-tracker/internal/service"
)

// Agent is the LLM-powered conversational AI for the Telegram bot.
type Agent struct {
	client  *Client
	svc     *service.ExpenseService
	history map[int64][]Message // per-user conversation history
	mu      sync.Mutex
}

func NewAgent(client *Client, svc *service.ExpenseService) *Agent {
	return &Agent{
		client:  client,
		svc:     svc,
		history: make(map[int64][]Message),
	}
}

// tools exposed to the LLM
var agentTools = []Tool{
	{
		Type: "function",
		Function: ToolFunction{
			Name:        "add_expense",
			Description: "Добавить новую трату пользователя. Вызывать когда пользователь сообщает о новой покупке или расходе.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"amount": map[string]any{
						"type":        "number",
						"description": "Сумма траты в рублях. Обязательное поле.",
					},
					"category": map[string]any{
						"type":        "string",
						"enum":        []string{"food", "transport", "housing", "entertainment", "health", "shopping", "other"},
						"description": "Категория траты: food (еда, продукты, кафе, кофе, рестораны), transport (такси, метро, бензин), housing (жильё, ЖКХ), entertainment (развлечения, кино, отдых), health (здоровье, аптеки), shopping (покупки, одежда, техника), other (другое).",
					},
					"spent_at": map[string]any{
						"type":        "string",
						"description": "Дата траты строго в формате YYYY-MM-DD. Если трата вчера — вычисли дату вчерашнего дня в формате YYYY-MM-DD.",
					},
					"comment": map[string]any{
						"type":        "string",
						"description": "Название или комментарий (кофе, такси, продукты и т.д.)",
					},
				},
				"required": []string{"amount"},
			},
		},
	},
	{
		Type: "function",
		Function: ToolFunction{
			Name:        "list_expenses",
			Description: "Показать список трат пользователя или узнать сколько потрачено за период/по категории.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"category": map[string]any{
						"type":        "string",
						"enum":        []string{"food", "transport", "housing", "entertainment", "health", "shopping", "other"},
						"description": "Фильтр по категории. Например, 'food' если спрашивают про еду.",
					},
					"search": map[string]any{
						"type":        "string",
						"description": "Поиск по названию или комментарию (например, 'такси', 'кофе').",
					},
					"from": map[string]any{
						"type":        "string",
						"description": "Начальная дата фильтра YYYY-MM-DD.",
					},
					"to": map[string]any{
						"type":        "string",
						"description": "Конечная дата фильтра YYYY-MM-DD.",
					},
				},
				"required": []string{},
			},
		},
	},
	{
		Type: "function",
		Function: ToolFunction{
			Name:        "update_expense",
			Description: "Изменить существующую или последнюю трату. Вызывать когда пользователь просит изменить или исправить трату.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"search": map[string]any{
						"type":        "string",
						"description": "'последнее' для изменения последней траты, либо название траты (например, 'такси', 'кофе').",
					},
					"id": map[string]any{
						"type":        "integer",
						"description": "ID траты для изменения (если известен).",
					},
					"amount": map[string]any{
						"type":        "number",
						"description": "Новая сумма в рублях.",
					},
					"category": map[string]any{
						"type":        "string",
						"enum":        []string{"food", "transport", "housing", "entertainment", "health", "shopping", "other"},
						"description": "Новая категория.",
					},
					"spent_at": map[string]any{
						"type":        "string",
						"description": "Новая дата YYYY-MM-DD.",
					},
					"comment": map[string]any{
						"type":        "string",
						"description": "Новый комментарий.",
					},
				},
				"required": []string{},
			},
		},
	},
	{
		Type: "function",
		Function: ToolFunction{
			Name:        "delete_expense",
			Description: "Удалить трату пользователя. Вызывать когда пользователь просит удалить или отменить трату.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"search": map[string]any{
						"type":        "string",
						"description": "'последнее' для отмены последней траты, либо название траты (например, 'проезд на автобусе', 'такси').",
					},
					"id": map[string]any{
						"type":        "integer",
						"description": "ID траты для удаления (если известен).",
					},
				},
				"required": []string{},
			},
		},
	},
}

func parseDateString(s string, now time.Time) string {
	s = strings.TrimSpace(strings.ToLower(s))
	if s == "" || s == "today" || s == "сегодня" {
		return now.Format("2006-01-02")
	}
	if s == "yesterday" || s == "вчера" {
		return now.AddDate(0, 0, -1).Format("2006-01-02")
	}
	if s == "day before yesterday" || s == "позавчера" {
		return now.AddDate(0, 0, -2).Format("2006-01-02")
	}
	// Try standard ISO
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.Format("2006-01-02")
	}
	// Try Russian formats 02.01.2006
	if t, err := time.Parse("02.01.2006", s); err == nil {
		return t.Format("2006-01-02")
	}
	// Try 02.01 (assumes current year)
	if t, err := time.Parse("02.01", s); err == nil {
		t = time.Date(now.Year(), t.Month(), t.Day(), 0, 0, 0, 0, now.Location())
		return t.Format("2006-01-02")
	}
	return now.Format("2006-01-02")
}

func categoryLabel(c models.Category) string {
	switch c {
	case models.CategoryFood:
		return "Еда"
	case models.CategoryTransport:
		return "Транспорт"
	case models.CategoryHousing:
		return "Жильё"
	case models.CategoryEntertainment:
		return "Развлечения"
	case models.CategoryHealth:
		return "Здоровье"
	case models.CategoryShopping:
		return "Покупки"
	default:
		return "Другое"
	}
}

func systemPrompt(userID int64, now time.Time) string {
	todayStr := now.Format("2006-01-02")
	yesterdayStr := now.AddDate(0, 0, -1).Format("2006-01-02")
	weekAgoStr := now.AddDate(0, 0, -7).Format("2006-01-02")
	monthStartStr := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	return fmt.Sprintf(`Ты — умный семейный помощник по учёту личных расходов в Telegram.
Твой Telegram ID пользователя: %d.
Календарь:
- Сегодня: %s
- Вчера: %s
- 7 дней назад (неделя): %s
- Начало месяца: %s

Твои задачи:
- Реализовать CRUD над тратами пользователя на обычном русском языке без кнопок и команд.
- Пользователю доступны ТОЛЬКО его собственные траты. Чужие траты недоступны.
- Всегда использовать инструменты (tools) для чтения и изменения данных — никогда не выдумывай данные.
- Отвечать дружелюбно, информативно и по делу.

Категории (ровно 7 категорий):
1. food (еда) — продукты, супермаркеты, кафе, рестораны, фастфуд, кофе, выпечка, бары, доставка еды. Важно: кофе, бизнес-ланчи, перекусы — это ВСЕГДА food!
2. transport (транспорт) — такси, каршеринг, метро, автобус, бензин, заправка, парковка, проездной.
3. housing (жильё) — аренда, ипотека, ЖКХ, коммуналка, ремонт, услуги для дома.
4. entertainment (развлечения) — кино, концерты, театр, игры, книги, хобби, подписки, отдых.
5. health (здоровье) — аптека, лекарства, врачи, анализы, стоматология, оптика.
6. shopping (покупки) — одежда, обувь, маркетплейсы (Ozon, WB), техника, электроника, подарки.
7. other (другое) — любые другие расходы.

Сценарии работы:
1. ДОБАВИТЬ («кофе 350», «кофе 350 вчера», «такси 1200»):
   - Вызови add_expense.
   - Если указано "вчера", spent_at СТРОГО "%s". Если дата не указана, spent_at="%s".
   - В ответе подтверди добавление. Если трата была записана на вчера или конкретную дату, ОБЯЗАТЕЛЬНО явно укажи это в ответе (например: "Записал кофе на 350 ₽ на вчера (18 октября)").
2. ПОКАЗАТЬ / СКОЛЬКО ПОТРАТИЛ («сколько потратил на еду в этом месяце», «покажи траты за неделю»):
   - Вызови list_expenses с нужными фильтрами:
     * "за неделю": from="%s"
     * "в этом месяце": from="%s"
     * "на еду": category="food"
   - В ответе дай подробный итог: общую сумму, количество трат и перечисли траты списком (дата, название/комментарий, сумма).
3. ИЗМЕНИТЬ («последнее было не 100, а 150», «исправь такси на 500»):
   - Для "последнее было ..." СРАЗУ вызывай update_expense(search="последнее", amount=...).
   - Для конкретного названия СРАЗУ вызывай update_expense(search="<название>", amount=...).
   - В ответе сообщи старую и новую сумму.
4. УДАЛИТЬ («удали проезд на автобусе», «отмени последнюю трату»):
   - Для "удали <название>" СРАЗУ вызывай delete_expense(search="<название>"). НЕ вызывай list_expenses!
   - Для "отмени последнюю" СРАЗУ вызывай delete_expense(search="последнее").
   - В ответе подтверди удаление траты с её названием и суммой.`,
		userID,
		todayStr,
		yesterdayStr,
		weekAgoStr,
		monthStartStr,
		yesterdayStr,
		todayStr,
		weekAgoStr,
		monthStartStr,
	)
}

// Process handles a user message and returns the bot response.
func (a *Agent) Process(ctx context.Context, userID int64, userText string) (string, error) {
	a.mu.Lock()
	history := a.history[userID]
	if len(history) > 20 {
		history = history[len(history)-20:]
	}
	a.mu.Unlock()

	now := time.Now()

	messages := []Message{
		{Role: "system", Content: systemPrompt(userID, now)},
	}
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: userText})

	var lastToolName string
	var lastToolResult string

	// Turn 0: Call LLM with agentTools to choose action
	reply, err := a.client.Chat(ctx, messages, agentTools)
	if err != nil {
		return "", fmt.Errorf("LLM chat: %w", err)
	}

	if reply.Content == nil {
		reply.Content = ""
	}
	messages = append(messages, *reply)

	if len(reply.ToolCalls) == 0 {
		// Final text response
		text := ""
		if s, ok := reply.Content.(string); ok {
			text = s
		}
		a.mu.Lock()
		a.history[userID] = append(history,
			Message{Role: "user", Content: userText},
			Message{Role: "assistant", Content: text},
		)
		a.mu.Unlock()
		return text, nil
	}

	// Execute each tool call
	for _, tc := range reply.ToolCalls {
		result, err := a.executeTool(ctx, userID, tc.Function.Name, tc.Function.Arguments)
		if err != nil {
			result = fmt.Sprintf(`{"error": "%v"}`, err)
		} else {
			lastToolName = tc.Function.Name
			lastToolResult = result
		}
		messages = append(messages, Message{
			Role:       "tool",
			Content:    result,
			ToolCallID: tc.ID,
			Name:       tc.Function.Name,
		})
	}

	// Turn 1: Ask LLM for natural language response with tools=nil
	finalResponse := ""
	finalReply, err := a.client.Chat(ctx, messages, nil)
	if err == nil && finalReply != nil {
		if s, ok := finalReply.Content.(string); ok && strings.TrimSpace(s) != "" {
			finalResponse = strings.TrimSpace(s)
		}
	}

	// Fallback if LLM failed on Turn 1 or returned empty
	if finalResponse == "" && lastToolName != "" {
		finalResponse = fallbackToolMessage(lastToolName, lastToolResult)
	}

	if finalResponse == "" {
		finalResponse = "✓ Готово!"
	}

	// Save to conversation history
	a.mu.Lock()
	a.history[userID] = append(history,
		Message{Role: "user", Content: userText},
		Message{Role: "assistant", Content: finalResponse},
	)
	a.mu.Unlock()

	return finalResponse, nil
}

func fallbackToolMessage(toolName, resultJSON string) string {
	switch toolName {
	case "add_expense":
		var m struct {
			Amount   float64 `json:"amount"`
			Category string  `json:"category"`
			SpentAt  string  `json:"spent_at"`
			Comment  string  `json:"comment"`
		}
		_ = json.Unmarshal([]byte(resultJSON), &m)
		title := m.Comment
		if title == "" {
			title = categoryLabel(models.Category(m.Category))
		}

		today := time.Now().Format("2006-01-02")
		yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

		dateNote := ""
		if m.SpentAt == yesterday {
			dateNote = " (вчера)"
		} else if m.SpentAt != "" && m.SpentAt != today {
			if t, err := time.Parse("2006-01-02", m.SpentAt); err == nil {
				dateNote = fmt.Sprintf(" (%s)", t.Format("02.01.2006"))
			} else {
				dateNote = fmt.Sprintf(" (%s)", m.SpentAt)
			}
		}

		return fmt.Sprintf("✅ Записал: %s на %.2f ₽%s", title, m.Amount, dateNote)

	case "delete_expense":
		var m struct {
			Deleted bool    `json:"deleted"`
			Comment string  `json:"comment"`
			Amount  float64 `json:"amount"`
			Error   string  `json:"error"`
		}
		_ = json.Unmarshal([]byte(resultJSON), &m)
		if m.Error != "" {
			return fmt.Sprintf("❌ Не удалось удалить: %s", m.Error)
		}
		if m.Amount > 0 {
			name := m.Comment
			if name == "" {
				name = "трату"
			}
			return fmt.Sprintf("🗑 Удалил: %s на %.2f ₽", name, m.Amount)
		}
		return "🗑 Трата успешно удалена."

	case "update_expense":
		var m struct {
			Amount    float64 `json:"amount"`
			OldAmount float64 `json:"old_amount"`
			Comment   string  `json:"comment"`
			Category  string  `json:"category"`
			SpentAt   string  `json:"spent_at"`
			Error     string  `json:"error"`
		}
		_ = json.Unmarshal([]byte(resultJSON), &m)
		if m.Error != "" {
			return fmt.Sprintf("❌ Не удалось изменить: %s", m.Error)
		}
		name := m.Comment
		if name == "" {
			name = categoryLabel(models.Category(m.Category))
		}
		if m.OldAmount > 0 && m.OldAmount != m.Amount {
			return fmt.Sprintf("✏️ Обновил: %s теперь %.2f ₽ (было %.2f ₽)", name, m.Amount, m.OldAmount)
		}
		return fmt.Sprintf("✏️ Обновил: %s на сумму %.2f ₽", name, m.Amount)

	case "list_expenses":
		var m struct {
			Expenses []struct {
				ID       int64   `json:"id"`
				Amount   float64 `json:"amount"`
				Category string  `json:"category"`
				Date     string  `json:"date"`
				Comment  string  `json:"comment"`
			} `json:"expenses"`
			Total float64 `json:"total"`
			Count int     `json:"count"`
		}
		if err := json.Unmarshal([]byte(resultJSON), &m); err == nil && m.Count > 0 {
			var sb strings.Builder
			sb.WriteString(fmt.Sprintf("📊 Найдено трат: %d на сумму %.2f ₽:\n", m.Count, m.Total))
			maxItems := 10
			if len(m.Expenses) < maxItems {
				maxItems = len(m.Expenses)
			}
			for i := 0; i < maxItems; i++ {
				e := m.Expenses[i]
				name := e.Comment
				if name == "" {
					name = categoryLabel(models.Category(e.Category))
				}
				dateStr := e.Date
				if t, err := time.Parse("2006-01-02", e.Date); err == nil {
					dateStr = t.Format("02.01")
				}
				sb.WriteString(fmt.Sprintf("• %s — %s: %.2f ₽\n", dateStr, name, e.Amount))
			}
			if len(m.Expenses) > maxItems {
				sb.WriteString(fmt.Sprintf("... и ещё %d трат", len(m.Expenses)-maxItems))
			}
			return strings.TrimSpace(sb.String())
		}
		return "📊 Трат за указанный период не найдено."

	default:
		return "✓ Готово!"
	}
}

func (a *Agent) executeTool(ctx context.Context, userID int64, name, argsJSON string) (string, error) {
	var args map[string]any
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("parse tool args: %w", err)
	}

	switch name {
	case "add_expense":
		in := models.CreateExpenseInput{UserID: userID}
		if v, ok := args["amount"].(float64); ok {
			in.Amount = v
		}
		if v, ok := args["category"].(string); ok {
			if norm, ok := models.NormalizeCategory(v); ok {
				in.Category = norm
			} else {
				in.Category = models.CategoryOther
			}
		} else {
			in.Category = models.CategoryOther
		}
		spentAtRaw, _ := args["spent_at"].(string)
		in.SpentAt = parseDateString(spentAtRaw, time.Now())
		if v, ok := args["comment"].(string); ok {
			in.Comment = strings.TrimSpace(v)
		}
		e, err := a.svc.Create(ctx, in)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf(`{"id":%d,"amount":%.2f,"category":"%s","spent_at":"%s","comment":"%s"}`,
			e.ID, e.Amount, e.Category, e.SpentAt.Format("2006-01-02"), e.Comment), nil

	case "list_expenses":
		f := models.ExpenseFilter{UserID: &userID}
		if v, ok := args["category"].(string); ok && v != "" {
			if norm, ok := models.NormalizeCategory(v); ok {
				f.Category = &norm
			} else {
				c := models.Category(v)
				f.Category = &c
			}
		}
		if v, ok := args["search"].(string); ok && v != "" {
			f.Search = v
		}
		if v, ok := args["from"].(string); ok && v != "" {
			parsed := parseDateString(v, time.Now())
			t, _ := time.Parse("2006-01-02", parsed)
			f.From = &t
		}
		if v, ok := args["to"].(string); ok && v != "" {
			parsed := parseDateString(v, time.Now())
			t, _ := time.Parse("2006-01-02", parsed)
			f.To = &t
		}
		f.Limit = 50
		expenses, err := a.svc.List(ctx, f)
		if err != nil {
			return "", err
		}
		return formatExpenseList(expenses), nil

	case "update_expense":
		id := int64(getFloat(args, "id"))
		search, _ := args["search"].(string)
		search = strings.TrimSpace(strings.ToLower(search))

		var existing *models.Expense
		var err error

		if id > 0 {
			existing, err = a.svc.GetByID(ctx, id)
			if err != nil {
				return "", err
			}
		} else if search == "" || search == "последнее" || strings.Contains(search, "последн") {
			existing, err = a.svc.GetLastByUser(ctx, userID)
			if err != nil {
				return "", err
			}
		} else {
			list, err := a.svc.List(ctx, models.ExpenseFilter{
				UserID: &userID,
				Search: search,
				Limit:  1,
			})
			if err != nil {
				return "", err
			}
			if len(list) > 0 {
				existing = list[0]
			} else {
				recent, _ := a.svc.List(ctx, models.ExpenseFilter{UserID: &userID, Limit: 20})
				for _, r := range recent {
					if strings.Contains(strings.ToLower(r.Comment), search) ||
						strings.Contains(strings.ToLower(string(r.Category)), search) {
						existing = r
						break
					}
				}
			}
		}

		if existing == nil || existing.UserID != userID {
			return `{"error":"трата не найдена"}`, nil
		}

		oldAmount := existing.Amount
		in := models.UpdateExpenseInput{}
		if v, ok := args["amount"].(float64); ok && v > 0 {
			in.Amount = &v
		}
		if v, ok := args["category"].(string); ok && v != "" {
			if norm, ok := models.NormalizeCategory(v); ok {
				in.Category = &norm
			}
		}
		if v, ok := args["spent_at"].(string); ok && v != "" {
			parsed := parseDateString(v, time.Now())
			in.SpentAt = &parsed
		}
		if v, ok := args["comment"].(string); ok && v != "" {
			trimmed := strings.TrimSpace(v)
			in.Comment = &trimmed
		}
		e, err := a.svc.Update(ctx, existing.ID, in)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf(`{"id":%d,"old_amount":%.2f,"amount":%.2f,"category":"%s","spent_at":"%s","comment":"%s"}`,
			e.ID, oldAmount, e.Amount, e.Category, e.SpentAt.Format("2006-01-02"), e.Comment), nil

	case "delete_expense":
		id := int64(getFloat(args, "id"))
		search, _ := args["search"].(string)
		search = strings.TrimSpace(strings.ToLower(search))

		var existing *models.Expense
		var err error

		if id > 0 {
			existing, err = a.svc.GetByID(ctx, id)
			if err != nil {
				return "", err
			}
		} else if search == "" || search == "последнее" || strings.Contains(search, "последн") {
			existing, err = a.svc.GetLastByUser(ctx, userID)
			if err != nil {
				return "", err
			}
		} else {
			list, err := a.svc.List(ctx, models.ExpenseFilter{
				UserID: &userID,
				Search: search,
				Limit:  1,
			})
			if err != nil {
				return "", err
			}
			if len(list) > 0 {
				existing = list[0]
			} else {
				recent, _ := a.svc.List(ctx, models.ExpenseFilter{UserID: &userID, Limit: 20})
				for _, r := range recent {
					words := strings.Fields(search)
					match := true
					for _, w := range words {
						if !strings.Contains(strings.ToLower(r.Comment), w) &&
							!strings.Contains(strings.ToLower(string(r.Category)), w) {
							match = false
							break
						}
					}
					if match {
						existing = r
						break
					}
				}
			}
		}

		if existing == nil || existing.UserID != userID {
			return `{"error":"трата не найдена"}`, nil
		}

		if err := a.svc.Delete(ctx, existing.ID); err != nil {
			return "", err
		}
		return fmt.Sprintf(`{"deleted":true,"id":%d,"amount":%.2f,"comment":"%s"}`,
			existing.ID, existing.Amount, existing.Comment), nil

	default:
		return "", fmt.Errorf("unknown tool: %s", name)
	}
}

func formatExpenseList(expenses []*models.Expense) string {
	if len(expenses) == 0 {
		return `{"expenses":[],"total":0,"count":0}`
	}
	var total float64
	var items []string
	for _, e := range expenses {
		total += e.Amount
		comment := ""
		if e.Comment != "" {
			comment = e.Comment
		}
		items = append(items, fmt.Sprintf(`{"id":%d,"amount":%.2f,"category":"%s","date":"%s","comment":"%s"}`,
			e.ID, e.Amount, e.Category, e.SpentAt.Format("2006-01-02"), comment))
	}
	return fmt.Sprintf(`{"expenses":[%s],"total":%.2f,"count":%d}`,
		strings.Join(items, ","), total, len(expenses))
}

func getFloat(m map[string]any, key string) float64 {
	if v, ok := m[key].(float64); ok {
		return v
	}
	return 0
}
