package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Message is a single chat message.
type Message struct {
	Role       string     `json:"role"`
	Content    any        `json:"content"` // string or nil
	ToolCallID string     `json:"tool_call_id,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	Name       string     `json:"name,omitempty"`
}

type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function FunctionCall `json:"function"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type Tool struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

type ToolFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Tools    []Tool    `json:"tools,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message      Message `json:"message"`
		FinishReason string  `json:"finish_reason"`
	} `json:"choices"`
}

// Client is a thin OpenAI-compatible HTTP client.
type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

func NewClient(baseURL, apiKey, model string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) Chat(ctx context.Context, messages []Message, tools []Tool) (*Message, error) {
	cleaned := make([]Message, len(messages))
	for i, m := range messages {
		msg := m
		if msg.Content == nil {
			msg.Content = ""
		}
		cleaned[i] = msg
	}

	req := chatRequest{
		Model:    c.model,
		Messages: cleaned,
		Tools:    tools,
	}
	body, _ := json.Marshal(req)

	var resp *http.Response
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(500 * time.Millisecond):
			}
		}

		httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
			c.baseURL+"/chat/completions", bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("Content-Type", "application/json")
		if c.apiKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
		}

		resp, err = c.http.Do(httpReq)
		if err == nil && resp.StatusCode == http.StatusOK {
			lastErr = nil
			break
		}
		if err != nil {
			lastErr = err
		} else {
			respBody, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("LLM error %d: %s", resp.StatusCode, string(respBody))
			if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized {
				return nil, lastErr
			}
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("LLM request: %w", lastErr)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var cr chatResponse
	if err := json.Unmarshal(respBody, &cr); err != nil {
		return nil, fmt.Errorf("decode LLM response: %w", err)
	}
	if len(cr.Choices) == 0 {
		return nil, fmt.Errorf("empty choices from LLM")
	}
	msg := cr.Choices[0].Message
	return &msg, nil
}
