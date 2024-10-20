package server

import (
	"net/http"

	"mindlink.io/mindlink/pkg/apis"
)

type Server struct {
	cfg  *Config
	addr string
}

func New(cfg *Config) *Server {
	return &Server{cfg: cfg, addr: ":" + cfg.Port}
}

// setupMux sets up the mux with the given options
func setupMux(cfg *Config) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/", &staticHandler{rootPath: cfg.RootPath})
	apis.PageAPI.RegsistRoute(mux)
	return mux
}

// Run starts the server
func (s *Server) Run() error {
	mux := setupMux(s.cfg)

	srv := &http.Server{
		Addr:    s.addr,
		Handler: mux,
	}
	return srv.ListenAndServe()
}
