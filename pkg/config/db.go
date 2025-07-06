package config

import (
	"strconv"
	"strings"
)

type PostgresConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	DBName   string `json:"dbname"`
	User     string `json:"user,omitempty"`
	Password string `json:"password,omitempty"`
	SSLMode  string `json:"sslmode,omitempty"`
}

func (pcfg *PostgresConfig) GetConnString() string {
	var builder strings.Builder
	builder.Grow(128)

	builder.WriteString("host=")
	builder.WriteString(pcfg.Host)
	builder.WriteString(" port=")
	builder.WriteString(strconv.Itoa(pcfg.Port))
	builder.WriteString(" dbname=")
	builder.WriteString(pcfg.DBName)

	if pcfg.User != "" {
		builder.WriteString(" user=")
		builder.WriteString(pcfg.User)
	}

	if pcfg.Password != "" {
		builder.WriteString(" password=")
		builder.WriteString(pcfg.Password)
	}

	if pcfg.SSLMode != "" {
		builder.WriteString(" sslmode=")
		builder.WriteString(pcfg.SSLMode)
	}

	return builder.String()
}
