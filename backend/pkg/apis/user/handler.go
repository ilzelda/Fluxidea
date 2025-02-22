package user

import (
	"encoding/json"
	"net/http"

	"github.com/go-logr/logr"
)

type handler struct {
	log logr.Logger
}

func NewHandler(log logr.Logger) *handler {
	return &handler{
		log: log,
	}
}

func (uh *handler) RegsistRoute(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/users", uh.createUser)
}

func (uh *handler) createUser(w http.ResponseWriter, r *http.Request) {
	uh.log.Info("create user - not implemented")

	response := struct {
		UserID string `json:"user_id"`
	}{
		UserID: "current-user",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
