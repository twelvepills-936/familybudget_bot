package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"expense-tracker/internal/api"
	"expense-tracker/internal/bot"
	"expense-tracker/internal/config"
	"expense-tracker/internal/db"
	"expense-tracker/internal/llm"
	"expense-tracker/internal/repository"
	"expense-tracker/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Run DB migrations
	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	// Connect to DB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	cancel()
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	// Wire up dependencies
	repo := repository.NewExpenseRepository(pool)
	svc := service.NewExpenseService(repo)

	// LLM agent
	llmClient := llm.NewClient(cfg.LLMBaseURL, cfg.LLMAPIKey, cfg.LLMModel)
	agent := llm.NewAgent(llmClient, svc)

	// REST API server
	router := api.NewRouter(svc)
	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: router,
	}

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

	// Start HTTP server
	go func() {
		log.Printf("[main] HTTP server listening on :%s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server: %v", err)
		}
	}()

	// Telegram bot
	if cfg.TelegramBotToken != "" {
		go func() {
			tgBot, err := bot.New(cfg.TelegramBotToken, cfg.ProxyURL, agent)
			if err != nil {
				log.Printf("[bot] failed to init telegram bot: %v (web panel is running at :%s)", err, cfg.ServerPort)
				return
			}
			tgBot.Run(appCtx)
		}()
	} else {
		log.Println("[main] TELEGRAM_BOT_TOKEN not set, bot disabled")
	}

	<-sigCh
	log.Println("[main] shutting down...")
	appCancel()

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	_ = srv.Shutdown(shutCtx)

	log.Println("[main] done")
}
