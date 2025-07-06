package main

import (
	"database/sql"
	"os"
	"runtime"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"mindlink.io/mindlink/pkg/apis"
	"mindlink.io/mindlink/pkg/config"
	"mindlink.io/mindlink/pkg/log"
	"mindlink.io/mindlink/pkg/server"
)

var (
	VERSION    string
	COMMIT     string
	BUILD_DATE string
)

var logger = log.Logger

func SayHello() {
	logger.Info("    .-..-. _          .-..-.    _       .-.       ")
	logger.Info("    : `' ::_;         : :: :   :_;      : :.-.    ")
	logger.Info("    : .. :.-.,-.,-. .-' :: :   .-.,-.,-.: `'.'    ")
	logger.Info("    : :; :: :: ,. :' .; :: :__ : :: ,. :: . `.    ")
	logger.Info("    :_;:_;:_;:_;:_;`.__.':___.':_;:_;:_;:_;:_;    ")
	logger.Info("                                                  ")
	logger.Info("                                                  ")
	logger.Info("system", "APP_ENV", os.Getenv("APP_ENV"))
	logger.Info("build info", "GO", runtime.Version(),
		"VERSION", VERSION, "COMMIT", COMMIT, "BUILD DATE", BUILD_DATE,
	)
}

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

	if err := log.SetLogger(cfg.Log); err != nil {
		logger.Error(err, "failed to set logger")
		os.Exit(1)
	}
	SayHello()

	db, err := sql.Open(cfg.DB.Type, cfg.DB.GetConnString())
	if err != nil {
		logger.Error(err, "failed to db")
	}
	defer db.Close()

	mux, err := apis.SetupAPIs(db)
	if err != nil {
		logger.Error(err, "Failed to setup mux")
		os.Exit(1)
	}

	srv := server.New(cfg.Server).WithLogger(logger).WithMultiplexer(mux)
	if err := srv.Run(); err != nil {
		logger.Error(err, "Failed to start server")
		os.Exit(1)
	}
}
