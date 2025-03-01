package page

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"

	"github.com/go-logr/logr"
	"github.com/google/uuid"

	"mindlink.io/mindlink/pkg/apis/internal/api"
	"mindlink.io/mindlink/pkg/apis/internal/auth"
	"mindlink.io/mindlink/pkg/apis/internal/page/model"
	"mindlink.io/mindlink/pkg/apis/internal/page/repository"
)

type handler struct {
	log  logr.Logger
	repo PageRepository
	mids []api.Middleware
}

func NewHandler(log logr.Logger, repo PageRepository, mids ...api.Middleware) *handler {
	return &handler{
		log:  log,
		repo: repo,
		mids: mids,
	}
}

func (ph *handler) RegistRoute(mux *http.ServeMux) {
	ph.registRoute(mux, "POST /api/pages", ph.createUserPage)
	ph.registRoute(mux, "GET /api/pages", ph.listUserPages)
	ph.registRoute(mux, "GET /api/pages/{page_id}", ph.loadUserPage)
	ph.registRoute(mux, "PUT /api/pages/{page_id}", ph.updateUserPage)
	ph.registRoute(mux, "DELETE /api/pages/{page_id}", ph.deleteUserPage)
}

func (ph *handler) registRoute(mux *http.ServeMux, pattern string, fn http.HandlerFunc) {
	mux.HandleFunc(pattern, ph.chain(fn))
}

func (ph *handler) chain(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, mid := range slices.Backward(ph.mids) {
			next = mid(next)
		}
		next(w, r)
	}
}

func (ph *handler) createUserPage(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID

	var params model.CreatePageParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	page, err := ph.repo.CreatePage(userID, params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ph.log.Info("Create user page", "User", userID, "Page", page)

	response := convertPageIntoResp(page)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ph *handler) listUserPages(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID

	pages, err := ph.repo.ListPages(userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ph.log.Info("List user pages", "User", userID)

	var respBody respListUserPages = make([]respUserPage, 0, len(pages))
	for _, page := range pages {
		respBody = append(respBody, convertPageIntoResp(page))
	}

	w.Header().Set("Content-Type", "application/json")
	if len(respBody) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err := json.NewEncoder(w).Encode(&respBody); err != nil {
		http.Error(w, "failed to decode", http.StatusInternalServerError)
		return
	}
}

func (ph *handler) loadUserPage(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID
	pageID := r.PathValue("page_id")
	ph.log.Info("Load user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	page, err := ph.repo.GetPage(userID, pid)
	if err != nil {
		if errors.Is(err, repository.ErrPageNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(page); err != nil {
		http.Error(w, "failed to decode", http.StatusInternalServerError)
		return
	}
}

func (ph *handler) updateUserPage(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID

	pageID := r.PathValue("page_id")
	ph.log.Info("Update user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	var params model.UpdatePageParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	_, err = ph.repo.UpdatePage(userID, pid, params)
	if err != nil {
		if errors.Is(err, repository.ErrFailedToAccessPage) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := respModifyUserPage{
		SuccessOK: true,
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

func (ph *handler) deleteUserPage(w http.ResponseWriter, r *http.Request) {
	claim, ok := r.Context().Value(auth.ClaimsKey{}).(*auth.Claims)
	if !ok {
		http.Error(w, "failed to get claims", http.StatusInternalServerError)
		return
	}

	userID := claim.ID
	pageID := r.PathValue("page_id")
	ph.log.Info("Delete user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	if _, err := ph.repo.DeletePage(userID, pid); err != nil {
		if errors.Is(err, repository.ErrFailedToDecodePage) {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := respModifyUserPage{
		SuccessOK: true,
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}
