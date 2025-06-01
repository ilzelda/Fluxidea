package config

import (
	"encoding/json"
	"fmt"
	"os"

	"mindlink.io/mindlink/pkg/log"
	"mindlink.io/mindlink/pkg/server"
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
	DB     *DBConfig      `json:"db"`
	Log    *log.Config    `json:"log"`
	Server *server.Config `json:"server"`
}

type DBConfig struct {
	Type string `json:"type"`

	Postgresql *PostgresConfig `json:"postgres,omitempty"`
}

func (dbCfg *DBConfig) GetConnString() string {
	switch dbCfg.Type {
	case "postgres":
		return dbCfg.Postgresql.GetConnString()
	}
	return ""
}

// TODO: 로그 설정 확장시 사용할 구성 미리 생성, 나중에 지워질 수 있음
type LogConfig struct{}
