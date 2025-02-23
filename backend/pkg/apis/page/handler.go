package page

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-logr/logr"
	"github.com/google/uuid"

	"mindlink.io/mindlink/pkg/models"
	"mindlink.io/mindlink/pkg/repository"
)

type handler struct {
	log  logr.Logger
	repo PageRepository
}

func NewHandler(log logr.Logger, repo PageRepository) *handler {
	return &handler{
		log:  log,
		repo: repo,
	}
}

func (ph *handler) RegsistRoute(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/users/{user_id}/pages", ph.createUserPage)
	mux.HandleFunc("GET /api/users/{user_id}/pages", ph.listUserPages)
	mux.HandleFunc("GET /api/users/{user_id}/pages/{page_id}", ph.loadUserPage)
	mux.HandleFunc("PUT /api/users/{user_id}/pages/{page_id}", ph.updateUserPage)
	mux.HandleFunc("DELETE /api/users/{user_id}/pages/{page_id}", ph.deleteUserPage)
}

func (ph *handler) createUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")

	var params models.CreatePageParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	page, err := ph.repo.CreatePage(models.UserID(userID), params)
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
	userID := r.PathValue("user_id")

	pages, err := ph.repo.ListUserPages(models.UserID(userID))
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
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")
	ph.log.Info("Load user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	page, err := ph.repo.GetPage(models.UserID(userID), pid)
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
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")
	ph.log.Info("Update user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	var params models.UpdatePageParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	_, err = ph.repo.UpdatePage(models.UserID(userID), pid, params)
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
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")
	ph.log.Info("Delete user page", "User", userID, "PageID", pageID)

	pid, err := uuid.Parse(pageID)
	if err != nil {
		http.Error(w, "failed to parse page id", http.StatusBadRequest)
	}

	if _, err := ph.repo.DeletePage(models.UserID(userID), pid); err != nil {
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
