# 💰 Family Budget — ИИ-бот учёта расходов

Сервис учёта семейных расходов с Telegram-ботом на базе ИИ и веб-панелью для главы семьи.

## Архитектура

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────┐
│  Telegram Bot   │──────▶│  Go Backend      │──────▶│  PostgreSQL    │
│  (ИИ-агент)     │        │  REST API :8080  │        │                │
└─────────────────┘        └──────────────────┘        └────────────────┘
                                    ▲
                           ┌────────┴─────────┐
                           │  React Frontend  │
                           │  :3000           │
                           └──────────────────┘
```

## Быстрый старт

### 1. Скопируй конфиг

```bash
cp .env.example .env
```

### 2. Заполни `.env`

| Переменная | Описание |
|-----------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `LLM_API_KEY` | API ключ провайдера LLM |
| `LLM_BASE_URL` | URL API (OpenAI, Groq, Ollama и др.) |
| `LLM_MODEL` | Модель (gpt-4o-mini, llama-3.1-8b и др.) |
| `POSTGRES_PASSWORD` | Пароль БД |

### 3. Запусти

```bash
docker compose up --build
```

- **Веб-панель**: http://localhost:3000
- **API**: http://localhost:8080/api

## Поддерживаемые LLM-провайдеры

```env
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Groq (быстро и бесплатно)
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-8b-instant

# Ollama (локально)
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b
```

## Возможности Telegram-бота

Бот понимает обычный текст, команды не нужны:

| Действие | Примеры |
|----------|---------|
| Добавить | `кофе 350`, `такси 1200 вчера`, `продукты 4500 в пятёрочке` |
| Посмотреть | `сколько потратил на еду?`, `траты за эту неделю`, `покажи всё за январь` |
| Изменить | `последнее было не 350, а 450`, `поменяй категорию последней траты на транспорт` |
| Удалить | `удали такси`, `отмени последнюю трату` |

> Каждый пользователь видит только свои траты.

## Веб-панель

- 📊 Статистика по суммам и категориям
- 🔍 Фильтры по участнику, категории, периоду
- ✏️ Создание, редактирование, удаление трат
- 🌙 Тёмная тема с glassmorphism

## Категории

| Код | Название |
|-----|----------|
| `food` | 🍕 Еда |
| `transport` | 🚌 Транспорт |
| `housing` | 🏠 Жильё |
| `entertainment` | 🎮 Развлечения |
| `health` | 💊 Здоровье |
| `shopping` | 🛍️ Покупки |
| `other` | 📦 Другое |

## REST API

```
GET    /api/expenses?user_id=&category=&from=&to=&limit=&offset=
POST   /api/expenses
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id
GET    /api/users
```

## Разработка (без Docker)

```bash
# PostgreSQL нужен отдельно
# Backend
cd backend
cp ../.env.example .env  # заполни DATABASE_URL
go run ./cmd/server

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000
```
