package server

import (
	"demo/pkg/apis"
	"net/http"
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
	mux.HandleFunc("GET /api/users/{user_id}/pages/{page_id}", apis.LoadUserPage)
	mux.HandleFunc("POST /api/users/{user_id}/pages/{page_id}", apis.SaveUserPage)
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
