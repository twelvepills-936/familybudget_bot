package bot

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"expense-tracker/internal/llm"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

type Bot struct {
	api   *tgbotapi.BotAPI
	agent *llm.Agent
}

type telegramProxyTransport struct {
	transport *http.Transport
}

func (t *telegramProxyTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Host == "api.telegram.org" {
		clone := req.Clone(req.Context())
		clone.URL.Host = "149.154.167.220"
		clone.Host = "api.telegram.org"
		return t.transport.RoundTrip(clone)
	}
	return t.transport.RoundTrip(req)
}

func New(token string, proxyURL string, agent *llm.Agent) (*Bot, error) {
	var httpClient *http.Client

	if proxyURL != "" {
		parsed, err := url.Parse(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy URL: %w", err)
		}
		baseTransport := &http.Transport{
			Proxy: http.ProxyURL(parsed),
			TLSClientConfig: &tls.Config{
				ServerName: "api.telegram.org",
			},
		}
		httpClient = &http.Client{
			Transport: &telegramProxyTransport{transport: baseTransport},
		}
		log.Printf("[bot] using proxy: %s", proxyURL)
	} else {
		httpClient = &http.Client{}
	}

	api, err := tgbotapi.NewBotAPIWithClient(token, tgbotapi.APIEndpoint, httpClient)
	if err != nil {
		return nil, err
	}
	log.Printf("[bot] Authorized as @%s", api.Self.UserName)
	return &Bot{api: api, agent: agent}, nil
}

func (b *Bot) Run(ctx context.Context) {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60

	updates := b.api.GetUpdatesChan(u)

	for {
		select {
		case <-ctx.Done():
			log.Println("[bot] shutting down")
			return
		case update, ok := <-updates:
			if !ok {
				return
			}
			if update.Message == nil {
				continue
			}
			go b.handleMessage(ctx, update.Message)
		}
	}
}

func (b *Bot) handleMessage(ctx context.Context, msg *tgbotapi.Message) {
	userID := int64(msg.From.ID)
	text := msg.Text
	if text == "" {
		return
	}

	log.Printf("[bot] user=%d text=%q", userID, text)

	reply, err := b.agent.Process(ctx, userID, text)
	if err != nil {
		log.Printf("[bot] agent error: %v", err)
		reply = "Произошла ошибка. Попробуй позже."
	}

	out := tgbotapi.NewMessage(msg.Chat.ID, reply)
	out.ParseMode = tgbotapi.ModeMarkdown
	if _, err := b.api.Send(out); err != nil {
		log.Printf("[bot] send markdown error: %v, retrying plain text", err)
		out.ParseMode = ""
		if _, err := b.api.Send(out); err != nil {
			log.Printf("[bot] send error: %v", err)
		}
	}
}
