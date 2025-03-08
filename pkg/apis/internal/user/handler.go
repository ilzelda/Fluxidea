package user

import (
	"encoding/json"
	"net/http"
	"slices"

	"github.com/go-logr/logr"
	"mindlink.io/mindlink/pkg/apis/internal/api"
	"mindlink.io/mindlink/pkg/apis/internal/auth"
	"mindlink.io/mindlink/pkg/apis/internal/user/model"
)

type UserUsecase interface {
	SearchByID(model.UserID) (*model.User, error)
}

type handler struct {
	log  logr.Logger
	uu   UserUsecase
	mids []api.Middleware
}

func NewHandler(log logr.Logger, uu UserUsecase, mids ...api.Middleware) *handler {
	return &handler{
		log:  log,
		uu:   uu,
		mids: mids,
	}
}

func (uh *handler) RegistRoute(mux *http.ServeMux) {
	uh.registRoute(mux, "GET /api/users", uh.getUser)
}

func (uh *handler) registRoute(mux *http.ServeMux, pattern string, fn http.HandlerFunc) {
	mux.HandleFunc(pattern, uh.chain(fn))
}

func (uh *handler) chain(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, mid := range slices.Backward(uh.mids) {
			next = mid(next)
		}
		next(w, r)
	}
}

func (uh *handler) getUser(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID

	user, err := uh.uu.SearchByID(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	uh.log.Info("get user", "userID", userID)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(&user); err != nil {
		http.Error(w, "failed to decode", http.StatusInternalServerError)
		return
	}
}
