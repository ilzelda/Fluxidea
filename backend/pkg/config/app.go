package config

import (
	"encoding/json"
	"fmt"
	"os"
)

func LoadConfig() (*AppConfig, error) {
	path := os.Getenv("CONFIG_FILE_PATH")
	if path == "" {
		return nil, fmt.Errorf("CONFIG_FILE_PATH environment variable is not set")
	}

	configFile, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file: %w", err)
	}
	defer configFile.Close()

	var cfg AppConfig
	if err := json.NewDecoder(configFile).Decode(&cfg); err != nil {
		return nil, fmt.Errorf("failed to decode config: %w", err)
	}

	return &cfg, nil
}

type AppConfig struct {
	Type   string        `json:"type"`
	DB     *DBConfig     `json:"db"`
	Log    *LogConfig    `json:"log"`
	Server *ServerConfig `json:"server"`
}

// TODO: DB 확장시 사용할 구성 미리 생성, 나중에 지워질 수 있음
type DBConfig struct{}

// TODO: 로그 설정 확장시 사용할 구성 미리 생성, 나중에 지워질 수 있음
type LogConfig struct{}

type ServerConfig struct {
	Port     string `json:"port"`
	RootPath string `json:"root_path"`
}
