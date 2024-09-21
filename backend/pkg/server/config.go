package server

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	Port     string `json:"port"`
	RootPath string `json:"root_path"`
}

func DefaultConfig() *Config {
	return &Config{
		Port:     "8080",
		RootPath: "wwwroot",
	}
}

func LoadConfigFromFilePath(filePath string) (*Config, error) {
	configFile, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file: %w", err)
	}
	defer configFile.Close()

	var cfg Config
	decoder := json.NewDecoder(configFile)
	if err := decoder.Decode(&cfg); err != nil {
		return nil, fmt.Errorf("failed to decode config: %w", err)
	}

	return &cfg, nil
}
