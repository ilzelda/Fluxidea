package server

import (
	"net/http"

	"github.com/go-logr/logr"
	"mindlink.io/mindlink/pkg/apis"
)

type Config struct {
	Type     string
	Port     string
	RootPath string
}

type Server struct {
	cfg    *Config
	addr   string
	logger logr.Logger
}

func New(cfg *Config) *Server {
	return &Server{cfg: cfg, addr: ":" + cfg.Port}
}

func (s *Server) WithLogger(logger logr.Logger) *Server {
	s.logger = logger.WithName("Server")
	return s
}

// Run starts the server
func (s *Server) Run() error {
	mux := http.NewServeMux()
	mux.Handle("/", &staticHandler{rootPath: s.cfg.RootPath, logger: s.logger})
	apis.PageAPI.RegistRoute(mux)
	apis.UserAPI.RegistRoute(mux)
	apis.AuthAPI.RegistRoute(mux)

	srv := &http.Server{
		Addr:    s.addr,
		Handler: mux,
	}

	s.logger.Info("Starting server", "type", s.cfg.Type, "port", s.cfg.Port, "rootPath", s.cfg.RootPath)
	return srv.ListenAndServe()
}
