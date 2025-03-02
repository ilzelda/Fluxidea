package server

import (
	"net/http"

	"github.com/go-logr/logr"
)

type Config struct {
	Port     string `json:"port"`
	RootPath string `json:"root_path"`
}

type Server struct {
	cfg    *Config
	addr   string
	logger logr.Logger
	mux    *http.ServeMux
}

func New(cfg *Config) *Server {
	return &Server{cfg: cfg, addr: ":" + cfg.Port}
}

func (s *Server) WithLogger(logger logr.Logger) *Server {
	s.logger = logger.WithName("Server")
	return s
}

func (s *Server) WithMultiplexer(mux *http.ServeMux) *Server {
	s.mux = mux
	return s
}

// Run starts the server
func (s *Server) Run() (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = r.(error)
		}
	}()

	if s.mux == nil {
		s.mux = http.NewServeMux()
	}
	s.mux.Handle("/", &staticHandler{rootPath: s.cfg.RootPath, logger: s.logger})
	if err != nil {
		return
	}

	srv := &http.Server{
		Addr:    s.addr,
		Handler: s.mux,
	}

	s.logger.Info("Starting server", "port", s.cfg.Port, "rootPath", s.cfg.RootPath)
	return srv.ListenAndServe()
}
