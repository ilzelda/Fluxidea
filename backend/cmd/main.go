package main

import (
	"os"

	"github.com/joho/godotenv"
	"mindlink.io/mindlink/pkg/config"
	"mindlink.io/mindlink/pkg/log"
	"mindlink.io/mindlink/pkg/server"
)

var logger = log.Logger

func init() {
	if err := godotenv.Load("./config/.env"); err != nil {
		logger.Error(err, "not found .env file")
		os.Exit(1)
	}
}

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Error(err, "failed to load configuration")
		os.Exit(1)
	}

	srv := server.New(ServerConfig(cfg)).WithLogger(logger)
	if err := srv.Run(); err != nil {
		logger.Error(err, "Failed to start server")
		os.Exit(1)
	}
}

func ServerConfig(cfg *config.AppConfig) *server.Config {
	return &server.Config{
		Type:     cfg.Type,
		Port:     cfg.Server.Port,
		RootPath: cfg.Server.RootPath,
	}
}
