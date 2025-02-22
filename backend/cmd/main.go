package main

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"mindlink.io/mindlink/pkg/log"
	"mindlink.io/mindlink/pkg/server"
)

var logger = log.Logger

func main() {
	if err := godotenv.Load("./config/.env"); err != nil {
		logger.Error(err, "not found .env file")
		os.Exit(1)
	}

	configFilePath := os.Getenv("CONFIG_FILE_PATH")
	if configFilePath == "" {
		err := fmt.Errorf("CONFIG_FILE_PATH environment variable is not set")
		logger.Error(err, "Failed to load configuration")
		os.Exit(1)
	}

	cfg, err := server.LoadConfigFromFilePath(configFilePath)
	if err != nil {
		logger.Error(err, "Failed to load configuration")
		os.Exit(1)
	}

	srv := server.New(cfg)
	logger.Info("Starting server", "port", cfg.Port, "rootPath", cfg.RootPath)
	if err := srv.Run(); err != nil {
		logger.Error(err, "Failed to start server")
		os.Exit(1)
	}
}
