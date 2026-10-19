package config

import (
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	ServerPort string `mapstructure:"SERVER_PORT"`

	DatabaseURL string `mapstructure:"DATABASE_URL"`

	TelegramBotToken string `mapstructure:"TELEGRAM_BOT_TOKEN"`
	ProxyURL         string `mapstructure:"PROXY_URL"`

	LLMBaseURL string `mapstructure:"LLM_BASE_URL"`
	LLMAPIKey  string `mapstructure:"LLM_API_KEY"`
	LLMModel   string `mapstructure:"LLM_MODEL"`
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	_ = viper.ReadInConfig()

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	viper.SetDefault("SERVER_PORT", "8080")
	viper.SetDefault("LLM_BASE_URL", "https://api.openai.com/v1")
	viper.SetDefault("LLM_MODEL", "gpt-4o-mini")

	_ = viper.BindEnv("SERVER_PORT")
	_ = viper.BindEnv("DATABASE_URL")
	_ = viper.BindEnv("TELEGRAM_BOT_TOKEN")
	_ = viper.BindEnv("PROXY_URL")
	_ = viper.BindEnv("LLM_BASE_URL")
	_ = viper.BindEnv("LLM_API_KEY")
	_ = viper.BindEnv("LLM_MODEL")

	cfg := &Config{}
	if err := viper.Unmarshal(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
