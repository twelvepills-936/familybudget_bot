-- +goose Up
CREATE TABLE IF NOT EXISTS expenses (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    amount     NUMERIC(12,2) NOT NULL,
    category   VARCHAR(32)   NOT NULL,
    spent_at   DATE          NOT NULL,
    comment    TEXT          NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id  ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- +goose Down
DROP TABLE IF EXISTS expenses;
